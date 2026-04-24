export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { prisma } from '@/services/db/client'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlink, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

export const maxDuration = 300

const VIDEO_EXTS = /\.(mp4|mov|avi|mkv|webm|m4v)$/i
const AUDIO_EXTS = /\.(mp3|m4a|wav|aac|ogg|flac)$/i

// Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm (max 25 MB)
const WHISPER_AUDIO_MIME: Record<string, string> = {
  mp3:  'audio/mpeg',
  m4a:  'audio/mp4',
  wav:  'audio/wav',
  ogg:  'audio/ogg',
  flac: 'audio/flac',
  aac:  'audio/aac',
  webm: 'audio/webm',
}

async function downloadToFile(blobUrl: string, destPath: string): Promise<void> {
  const res = await fetch(blobUrl)
  if (!res.ok) throw new Error(`Falha ao baixar arquivo da nuvem: ${res.status} ${res.statusText}`)
  if (!res.body) throw new Error('Resposta sem corpo.')
  await pipeline(
    Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
    (await import('fs')).createWriteStream(destPath),
  )
}

export async function POST(req: NextRequest) {
  const settings = await prisma.workspace.findUnique({ where: { id: 'default' }, select: { openaiKey: true } })
  if (!settings?.openaiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API Key não configurada. Vá em Configurações → YouTube Ops.' },
      { status: 400 },
    )
  }

  let tempInput: string | null = null

  try {
    const body = await req.json()
    const { blobUrl, filename, mimetype } = body as { blobUrl: string; filename: string; mimetype: string }

    if (!blobUrl) {
      return NextResponse.json({ success: false, error: 'URL do arquivo não fornecida.' }, { status: 400 })
    }

    const isVideo = mimetype?.startsWith('video/') || VIDEO_EXTS.test(filename ?? '')
    const isAudio = mimetype?.startsWith('audio/') || AUDIO_EXTS.test(filename ?? '')

    // Vídeos precisam de conversão — não suportado no ambiente serverless (sem FFmpeg)
    if (isVideo) {
      return NextResponse.json({
        success: false,
        error:   'Upload de vídeo não suportado no ambiente hospedado. Exporte o áudio do vídeo como MP3 e envie diretamente.',
      }, { status: 400 })
    }

    if (!isAudio) {
      return NextResponse.json(
        { success: false, error: 'Formato não suportado. Use MP3, M4A, WAV ou OGG.' },
        { status: 400 },
      )
    }

    // Baixa o arquivo para /tmp
    const ext = filename?.includes('.') ? filename.split('.').pop()!.toLowerCase() : 'mp3'
    tempInput = join(tmpdir(), `nohau-audio-${Date.now()}.${ext}`)
    await downloadToFile(blobUrl, tempInput)

    // Verifica tamanho (Whisper suporta até 25 MB)
    const { size } = await stat(tempInput)
    if (size > 25 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error:   `Arquivo muito grande (${(size / 1024 / 1024).toFixed(1)} MB). O Whisper suporta até 25 MB — ~90 min de MP3 64kbps. Divida em partes menores.`,
      }, { status: 400 })
    }

    // Envia diretamente para o Whisper — suporta MP3, M4A, WAV, OGG nativamente
    const audioMime = WHISPER_AUDIO_MIME[ext] ?? 'audio/mpeg'
    const openai    = new OpenAI({ apiKey: settings.openaiKey })
    const audioFile = await toFile(createReadStream(tempInput), `audio.${ext}`, { type: audioMime })

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
    if (tempInput) await unlink(tempInput).catch(() => {})
  }
}
