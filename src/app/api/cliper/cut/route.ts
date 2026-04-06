export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'
import { tmpdir } from 'os'
import { join } from 'path'
import { rm, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import archiver from 'archiver'
import { PassThrough } from 'stream'

export const maxDuration = 300

interface CutClip {
  id:        string
  startTime: number
  endTime:   number
  title:     string
}

// ── Sanitiza título para nome de arquivo ──────────────────────────────────────
function safeFilename(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
  return `${String(index + 1).padStart(2, '0')}-${slug}.mp4`
}

// ── Corta um clip com FFmpeg ──────────────────────────────────────────────────
async function cutClip(input: string, output: string, start: number, end: number) {
  const ffmpegMod  = await import('fluent-ffmpeg')
  const ffmpeg     = (ffmpegMod.default ?? ffmpegMod) as typeof import('fluent-ffmpeg')
  const ffmpegPath = (await import('ffmpeg-static')).default as string
  ffmpeg.setFfmpegPath(ffmpegPath)

  return new Promise<void>((resolve, reject) =>
    ffmpeg(input)
      .inputOptions([`-ss ${start}`])
      .outputOptions([
        `-to ${end - start}`,
        '-c:v libx264',
        '-crf 23',
        '-preset veryfast',
        '-vf scale=-2:min(ih\\,1080)',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ])
      .output(output)
      .on('end',   () => resolve())
      .on('error', (e: Error) => reject(new Error(`FFmpeg: ${e.message}`)))
      .run()
  )
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { jobId: string; clips: CutClip[] }
  try { body = await req.json() }
  catch { return NextResponse.json({ success: false, error: 'Body inválido.' }, { status: 400 }) }

  const { jobId, clips } = body
  if (!jobId || !clips?.length)
    return NextResponse.json({ success: false, error: 'jobId e clips são obrigatórios.' }, { status: 400 })

  // Valida que o job existe no banco
  const job = await prisma.cliperJob.findUnique({ where: { id: jobId } })
  if (!job)
    return NextResponse.json({ success: false, error: 'Job não encontrado.' }, { status: 404 })

  const jobDir    = join(tmpdir(), 'cliper-jobs', jobId)
  const videoPath = join(jobDir, 'original.mp4')

  if (!existsSync(videoPath))
    return NextResponse.json({ success: false, error: 'Arquivo de vídeo não encontrado. Faça o upload novamente.' }, { status: 404 })

  const clipPaths: { path: string; name: string }[] = []

  try {
    // ── Corta cada clip sequencialmente ─────────────────────────────────────
    for (let i = 0; i < clips.length; i++) {
      const clip     = clips[i]
      const filename = safeFilename(clip.title, i)
      const clipPath = join(jobDir, filename)

      await cutClip(videoPath, clipPath, clip.startTime, clip.endTime)
      clipPaths.push({ path: clipPath, name: filename })
    }

    // ── Monta ZIP em memória ─────────────────────────────────────────────────
    const archive = archiver('zip', { zlib: { level: 0 } }) // MP4 já é comprimido
    const pass    = new PassThrough()
    const chunks: Buffer[] = []

    pass.on('data', (chunk: Buffer) => chunks.push(chunk))

    archive.pipe(pass)
    for (const { path, name } of clipPaths) archive.file(path, { name })

    await new Promise<void>((resolve, reject) => {
      pass.on('end', resolve)
      pass.on('error', reject)
      archive.on('error', reject)
      archive.finalize()
    })

    const zipBuffer = Buffer.concat(chunks)

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type':        'application/zip',
        'Content-Disposition': `attachment; filename="cliper-${jobId.slice(0, 8)}.zip"`,
        'Content-Length':      String(zipBuffer.length),
      },
    })

  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro ao cortar vídeo' },
      { status: 500 },
    )
  } finally {
    // ── Limpa tudo após download ─────────────────────────────────────────────
    await rm(jobDir, { recursive: true, force: true }).catch(() => {})
  }
}
