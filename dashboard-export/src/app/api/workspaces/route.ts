export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

export async function GET() {
  const workspaces = await prisma.workspace.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ success: true, data: workspaces })
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const workspace = await prisma.workspace.create({
    data: { name: name.trim() },
  })
  return NextResponse.json({ success: true, data: workspace })
}
