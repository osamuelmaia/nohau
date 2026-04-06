export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { prisma } from '@/services/db/client'
import { analyzeClips } from '@/services/openai/cliper'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdir, unlink, rm, readdir, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { v4 as uuid } from 'uuid'

export const maxDuration = 300

// ── Download blob URL diretamente para disco (streaming, sem carregar em memória) ─
async function downloadToFile(blobUrl: string, destPath: string): Promise<void> {
  const res = await fetch(blobUrl)
  if (!res.ok) throw new Error(`Falha ao baixar arquivo da nuvem: ${res.status} ${res.statusText}`)
  if (!res.body) throw new Error('Resposta sem corpo.')
  await pipeline(
    Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
    (await import('fs')).createWriteStream(destPath),
  )
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
  const settings = await prisma.workspace.findUnique({ where: { id: 'default' } })
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
    const body = await req.json()
    const { blobUrl, filename, mimetype } = body as { blobUrl: string; filename: string; mimetype: string }

    if (!blobUrl) {
      return NextResponse.json({ success: false, error: 'URL do arquivo não fornecida.' }, { status: 400 })
    }

    // ── 2. Baixa vídeo do Vercel Blob para /tmp (streaming) ───────────────────
    await downloadToFile(blobUrl, videoPath)

    const isVideo = mimetype?.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(filename ?? '')
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
        fileName:   filename ?? 'video.mp4',
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
