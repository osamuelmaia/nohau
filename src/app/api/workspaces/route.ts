export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

export async function GET() {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true, adAccountName: true, metaToken: true, adAccountId: true, pageId: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }],
  })
  const data = workspaces.map(w => ({
    id: w.id,
    name: w.name,
    adAccountName: w.adAccountName,
    adAccountId: w.adAccountId,
    hasToken: !!w.metaToken,
    pageId: w.pageId,
    createdAt: w.createdAt,
  }))
  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ success: false, error: 'Nome obrigatório' }, { status: 400 })
  const workspace = await prisma.workspace.create({
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true },
  })
  return NextResponse.json({ success: true, data: workspace })
}
