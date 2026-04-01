import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { prisma } from '@/services/db/client'
import { analyzeClips } from '@/services/openai/cliper'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, unlink, rm, readdir, stat } from 'fs/promises'
import { createWriteStream, createReadStream } from 'fs'
import { Readable } from 'stream'
import { v4 as uuid } from 'uuid'
import busboy from 'busboy'

export const maxDuration = 300

// ── Stream multipart diretamente para disco (sem limite de tamanho) ────────────
function streamToDisk(req: NextRequest, destPath: string): Promise<{ filename: string; mimetype: string }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return reject(new Error('Requisição não é multipart/form-data.'))
    }

    const bb = busboy({ headers: { 'content-type': contentType } })
    let filename  = 'upload.mp4'
    let mimetype  = 'video/mp4'
    let received  = false

    bb.on('file', (_field, fileStream, info) => {
      received = true
      filename = info.filename
      mimetype = info.mimeType

      const ws = createWriteStream(destPath)
      ws.on('finish', () => resolve({ filename, mimetype }))
      ws.on('error', reject)
      fileStream.on('error', reject)
      fileStream.pipe(ws)
    })

    bb.on('finish', () => {
      if (!received) reject(new Error('Nenhum arquivo enviado.'))
    })

    bb.on('error', reject)

    if (!req.body) return reject(new Error('Nenhum arquivo enviado.'))
    const readable = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0])
    readable.on('error', reject)
    readable.pipe(bb)
  })
}

// ── FFmpeg helpers ─────────────────────────────────────────────────────────────
async function getFfmpeg() {
  const ffmpegMod  = await import('fluent-ffmpeg')
  const ffmpeg     = (ffmpegMod.default ?? ffmpegMod) as typeof import('fluent-ffmpeg')
  const ffmpegPath = (await import('ffmpeg-static')).default as string
  ffmpeg.setFfmpegPath(ffmpegPath)
  return ffmpeg
}

type FfmpegType = Awaited<ReturnType<typeof getFfmpeg>>

function extractAudio(ffmpeg: FfmpegType, input: string, output: string) {
  return new Promise<void>((resolve, reject) =>
    ffmpeg(input)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('32k')
      .audioChannels(1)
      .audioFrequency(16000)
      .format('mp3')
      .output(output)
      .on('end',   () => resolve())
      .on('error', (e: Error) => reject(new Error(`FFmpeg: ${e.message}`)))
      .run()
  )
}

function getVideoDuration(ffmpeg: FfmpegType, input: string) {
  return new Promise<number>((resolve, reject) =>
    ffmpeg.ffprobe(input, (err: Error | null, meta: import('fluent-ffmpeg').FfprobeData) => {
      if (err) reject(err)
      else resolve(meta.format.duration ?? 0)
    })
  )
}

// ── Cleanup orphaned jobs older than 2 hours ──────────────────────────────────
async function cleanupOldJobs() {
  const jobsDir = join(tmpdir(), 'cliper-jobs')
  try {
    const entries = await readdir(jobsDir)
    const cutoff  = Date.now() - 2 * 60 * 60 * 1000
    await Promise.all(entries.map(async dir => {
      try {
        const s = await stat(join(jobsDir, dir))
        if (s.mtimeMs < cutoff) await rm(join(jobsDir, dir), { recursive: true, force: true })
      } catch {}
    }))
  } catch {}
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings?.openaiKey)
    return NextResponse.json({ success: false, error: 'OpenAI API Key não configurada.' }, { status: 400 })

  // ── 1. Preparar diretório do job ─────────────────────────────────────────────
  await cleanupOldJobs()
  const jobId  = uuid()
  const jobDir = join(tmpdir(), 'cliper-jobs', jobId)
  await mkdir(jobDir, { recursive: true })

  const videoPath = join(jobDir, 'original.mp4')
  const audioPath = join(jobDir, 'audio.mp3')

  try {
    // ── 2. Recebe arquivo via streaming (sem limite de tamanho) ────────────────
    const { filename, mimetype } = await streamToDisk(req, videoPath)

    const isVideo = mimetype.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(filename)
    if (!isVideo) {
      await rm(jobDir, { recursive: true, force: true }).catch(() => {})
      return NextResponse.json({ success: false, error: 'Envie um arquivo de vídeo (MP4, MOV, MKV).' }, { status: 400 })
    }

    // ── 3. Duração + extração de áudio ─────────────────────────────────────────
    const ffmpeg   = await getFfmpeg()
    const duration = await getVideoDuration(ffmpeg, videoPath)
    await extractAudio(ffmpeg, videoPath, audioPath)

    // ── 4. Verifica tamanho para Whisper (max 25 MB) ───────────────────────────
    const { size } = await stat(audioPath)
    if (size > 24.5 * 1024 * 1024) {
      const mins = Math.round(duration / 60)
      await rm(jobDir, { recursive: true, force: true }).catch(() => {})
      return NextResponse.json({
        success: false,
        error:   `Vídeo muito longo (~${mins} min). O Whisper suporta até ~90 min por vez.`,
      }, { status: 400 })
    }

    // ── 5. Transcrição com timestamps ─────────────────────────────────────────
    const openai    = new OpenAI({ apiKey: settings.openaiKey })
    const audioFile = await toFile(createReadStream(audioPath), 'audio.mp3', { type: 'audio/mpeg' })

    const transcription = await openai.audio.transcriptions.create({
      file:                     audioFile,
      model:                    'whisper-1',
      language:                 'pt',
      response_format:          'verbose_json',
      timestamp_granularities:  ['segment'],
    }) as OpenAI.Audio.TranscriptionVerbose

    await unlink(audioPath).catch(() => {})

    // ── 6. Formata transcript com timestamps para o GPT ───────────────────────
    const segments  = transcription.segments ?? []
    const timedText = segments
      .map(s => `[${s.start.toFixed(1)}s–${s.end.toFixed(1)}s] ${s.text.trim()}`)
      .join('\n')

    // ── 7. GPT-4o analisa e sugere clips ──────────────────────────────────────
    const clips = await analyzeClips(settings.openaiKey, timedText, duration)

    // ── 8. Persiste job no banco ───────────────────────────────────────────────
    await prisma.cliperJob.create({
      data: {
        id:         jobId,
        fileName:   filename,
        duration,
        transcript: transcription.text,
        clips:      JSON.stringify(clips),
      },
    })

    return NextResponse.json({
      success:    true,
      jobId,
      clips,
      duration,
      transcript: transcription.text,
    })

  } catch (e) {
    await rm(jobDir, { recursive: true, force: true }).catch(() => {})
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro no processamento' },
      { status: 500 },
    )
  }
}
