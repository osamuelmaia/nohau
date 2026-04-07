export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'
import { z } from 'zod'

const schema = z.object({
  metaToken: z.string().min(10),
  adAccountId: z.string().optional(),
  adAccountName: z.string().optional(),
  pageId: z.string().optional(),
  openaiKey: z.string().optional(),
})

export async function GET() {
  const s = await prisma.workspace.findUnique({
    where: { id: 'default' },
    select: { metaToken: true, adAccountId: true, adAccountName: true, pageId: true, openaiKey: true, youtubePrompt: true },
  })
  return NextResponse.json({
    success: true,
    data: s ? {
      hasToken:      !!s.metaToken,
      adAccountId:   s.adAccountId,
      adAccountName: s.adAccountName,
      pageId:        s.pageId,
      hasOpenaiKey:  !!s.openaiKey,
      youtubePrompt: s.youtubePrompt ?? '',
    } : null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })

  const { metaToken, adAccountId, adAccountName, pageId, openaiKey } = parsed.data
  await prisma.workspace.upsert({
    where: { id: 'default' },
    create: { id: 'default', metaToken, adAccountId, adAccountName, pageId, openaiKey },
    update: { metaToken, adAccountId, adAccountName, pageId, openaiKey },
    select: { id: true },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  await prisma.workspace.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...body },
    update: body,
    select: { id: true },
  })
  return NextResponse.json({ success: true })
}
