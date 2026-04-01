import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json() as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname) => ({
        allowedContentTypes: [
          // Imagens
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          // Vídeos
          'video/mp4', 'video/quicktime', 'video/avi', 'video/webm',
          'video/x-msvideo', 'video/x-matroska', 'video/mkv', 'video/mov',
          // Áudios
          'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
          'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/aac',
          'audio/ogg', 'audio/flac', 'audio/x-flac',
          // Fallback genérico
          'application/octet-stream',
        ],
        maximumSizeInBytes: 2 * 1024 * 1024 * 1024, // 2 GB
      }),
      onUploadCompleted: async () => {
        // Upload completed — no extra processing needed
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}
