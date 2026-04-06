export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'
import { generateYoutubeContent } from '@/services/openai/youtube-ops'
import { z } from 'zod'

const schema = z.object({
  transcript:    z.string().min(10, 'Transcrição muito curta'),
  profile:       z.string().default('youtube-seo'),
  youtuberName:  z.string().optional(),
  instagram:     z.string().optional(),
  notes:         z.string().optional(),
})

export async function POST(req: NextRequest) {
  const settings = await prisma.workspace.findUnique({ where: { id: 'default' } })
  if (!settings?.openaiKey) {
    return NextResponse.json({ success: false, error: 'OpenAI API Key não configurada. Vá em Configurações → YouTube Ops.' }, { status: 400 })
  }

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const result = await generateYoutubeContent(settings.openaiKey, {
      ...parsed.data,
      customPrompt: settings.youtubePrompt ?? undefined,
    })

    await prisma.youtubeJob.create({
      data: {
        transcript: parsed.data.transcript.slice(0, 10000),
        profile:    parsed.data.profile,
        result:     JSON.stringify(result),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro na geração'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
