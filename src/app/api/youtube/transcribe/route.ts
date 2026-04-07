export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { prisma } from '@/services/db/client'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlink, stat, writeFile } from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

export const maxDuration = 300

const VIDEO_EXTS = /\.(mp4|mov|avi|mkv|webm|m4v)$/i
const AUDIO_EXTS = /\.(mp3|m4a|wav|aac|ogg|flac)$/i

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
  const settings = await prisma.workspace.findUnique({ where: { id: 'default' }, select: { openaiKey: true } })
  if (!settings?.openaiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API Key não configurada. Vá em Configurações → YouTube Ops.' },
      { status: 400 },
    )
  }

  let tempInput: string | null  = null
  let tempOutput: string | null = null

  try {
    const body = await req.json()
    const { blobUrl, filename, mimetype } = body as { blobUrl: string; filename: string; mimetype: string }

    if (!blobUrl) {
      return NextResponse.json({ success: false, error: 'URL do arquivo não fornecida.' }, { status: 400 })
    }

    // ── 1. Determina extensão e baixa arquivo para /tmp ───────────────────────
    const realExt  = filename?.includes('.') ? filename.split('.').pop()! : 'bin'
    tempInput = join(tmpdir(), `zima-in-${Date.now()}.${realExt}`)
    await downloadToFile(blobUrl, tempInput)

    const isVideo = mimetype?.startsWith('video/') || VIDEO_EXTS.test(filename ?? '')
    const isAudio = mimetype?.startsWith('audio/') || AUDIO_EXTS.test(filename ?? '')

    if (!isVideo && !isAudio) {
      return NextResponse.json(
        { success: false, error: 'Formato não suportado. Use MP4, MOV, MKV, MP3, M4A ou WAV.' },
        { status: 400 },
      )
    }

    // ── 2. Re-encoda se for vídeo OU se o áudio for > 24.5 MB ────────────────
    const { size: inputSize } = await stat(tempInput)
    const needsReencode = isVideo || inputSize > 24.5 * 1024 * 1024

    let mp3Path = tempInput
    if (needsReencode) {
      tempOutput = join(tmpdir(), `zima-out-${Date.now()}.mp3`)
      await reencodeAudio(tempInput, tempOutput)
      mp3Path = tempOutput
    }

    // ── 3. Verifica tamanho final ─────────────────────────────────────────────
    const { size: finalSize } = await stat(mp3Path)
    if (finalSize > 24.5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Áudio muito longo. O Whisper suporta até ~90 min. Divida em partes menores.' },
        { status: 400 },
      )
    }

    // ── 4. Transcreve com Whisper ─────────────────────────────────────────────
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
