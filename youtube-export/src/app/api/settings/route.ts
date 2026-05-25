export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

export async function GET() {
  const s = await prisma.settings.findUnique({
    where:  { id: 'default' },
    select: { openaiKey: true, youtubePrompt: true },
  })
  return NextResponse.json({
    success: true,
    data: {
      hasOpenaiKey:  !!s?.openaiKey,
      youtubePrompt: s?.youtubePrompt ?? '',
    },
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { openaiKey, youtubePrompt } = body as Record<string, string>
  await prisma.settings.upsert({
    where:  { id: 'default' },
    create: {
      id: 'default',
      ...(openaiKey     && { openaiKey }),
      ...(youtubePrompt !== undefined && { youtubePrompt }),
    },
    update: {
      ...(openaiKey     && { openaiKey }),
      ...(youtubePrompt !== undefined && { youtubePrompt }),
    },
  })
  return NextResponse.json({ success: true })
}
