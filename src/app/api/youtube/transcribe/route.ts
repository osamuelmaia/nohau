import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { prisma } from '@/services/db/client'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlink, stat } from 'fs/promises'
import { createWriteStream, createReadStream } from 'fs'
import { Readable } from 'stream'
import busboy from 'busboy'

export const maxDuration = 300

const VIDEO_EXTS = /\.(mp4|mov|avi|mkv|webm|m4v)$/i
const AUDIO_EXTS = /\.(mp3|m4a|wav|aac|ogg|flac)$/i

// ── Stream multipart diretamente para disco (sem limite de tamanho) ────────────
function streamToDisk(req: NextRequest, destPath: string): Promise<{ filename: string; mimetype: string }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return reject(new Error('Requisição não é multipart/form-data.'))
    }

    const bb = busboy({ headers: { 'content-type': contentType } })
    let filename  = 'upload'
    let mimetype  = 'application/octet-stream'
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

// ── FFmpeg: re-encoda para MP3 32kbps mono 16kHz ──────────────────────────────
async function reencodeAudio(inputPath: string, outputPath: string): Promise<void> {
  const ffmpeg     = (await import('fluent-ffmpeg')).default
  const ffmpegPath = (await import('ffmpeg-static')).default as string
  ffmpeg.setFfmpegPath(ffmpegPath)

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('32k')
      .audioChannels(1)
      .audioFrequency(16000)
      .format('mp3')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(new Error(`FFmpeg: ${err.message}`)))
      .run()
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings?.openaiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API Key não configurada. Vá em Configurações → YouTube Ops.' },
      { status: 400 },
    )
  }

  let tempInput: string | null  = null
  let tempOutput: string | null = null

  try {
    // ── 1. Detecta extensão pelo Content-Type header antes do upload ──────────
    const contentType = req.headers.get('content-type') ?? ''
    const ext = contentType.includes('video') ? 'mp4' : 'bin'
    tempInput = join(tmpdir(), `zima-in-${Date.now()}.${ext}`)

    // ── 2. Recebe arquivo via streaming (sem limite de tamanho) ───────────────
    const { filename, mimetype } = await streamToDisk(req, tempInput)

    // Corrige extensão baseada no nome real do arquivo
    const realExt = filename.includes('.') ? filename.split('.').pop()! : ext
    const newInput = join(tmpdir(), `zima-in-${Date.now()}.${realExt}`)
    const { rename } = await import('fs/promises')
    await rename(tempInput, newInput)
    tempInput = newInput

    const isVideo = mimetype.startsWith('video/') || VIDEO_EXTS.test(filename)
    const isAudio = mimetype.startsWith('audio/') || AUDIO_EXTS.test(filename)

    if (!isVideo && !isAudio) {
      return NextResponse.json(
        { success: false, error: 'Formato não suportado. Use MP4, MOV, MKV, MP3, M4A ou WAV.' },
        { status: 400 },
      )
    }

    // ── 3. Re-encoda se for vídeo OU se o áudio for > 24.5 MB ────────────────
    const { size: inputSize } = await stat(tempInput)
    const needsReencode = isVideo || inputSize > 24.5 * 1024 * 1024

    let mp3Path = tempInput
    if (needsReencode) {
      tempOutput = join(tmpdir(), `zima-out-${Date.now()}.mp3`)
      await reencodeAudio(tempInput, tempOutput)
      mp3Path = tempOutput
    }

    // ── 4. Verifica tamanho final ─────────────────────────────────────────────
    const { size: finalSize } = await stat(mp3Path)
    if (finalSize > 24.5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `Áudio muito longo. O Whisper suporta até ~90 min. Divida em partes menores.` },
        { status: 400 },
      )
    }

    // ── 5. Transcreve com Whisper ─────────────────────────────────────────────
    const openai    = new OpenAI({ apiKey: settings.openaiKey })
    const audioFile = await toFile(createReadStream(mp3Path), 'audio.mp3', { type: 'audio/mpeg' })

    const transcript = await openai.audio.transcriptions.create({
      file:            audioFile,
      model:           'whisper-1',
      language:        'pt',
      response_format: 'text',
    })

    return NextResponse.json({ success: true, transcript })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro no processamento'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })

  } finally {
    if (tempInput)  await unlink(tempInput).catch(() => {})
    if (tempOutput) await unlink(tempOutput).catch(() => {})
  }
}
