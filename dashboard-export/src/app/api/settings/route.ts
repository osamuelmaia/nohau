export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

export async function GET() {
  const s = await prisma.workspace.findUnique({
    where: { id: 'default' },
    select: { metaToken: true, adAccountId: true, adAccountName: true, pageId: true },
  })
  return NextResponse.json({
    success: true,
    data: s ? {
      hasToken:      !!s.metaToken,
      adAccountId:   s.adAccountId,
      adAccountName: s.adAccountName,
      pageId:        s.pageId,
    } : null,
  })
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
