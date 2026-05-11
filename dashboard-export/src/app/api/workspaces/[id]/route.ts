export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const ws = await prisma.workspace.update({
    where: { id: params.id },
    data:  body,
    select: { id: true, name: true },
  })
  return NextResponse.json({ success: true, data: ws })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (params.id === 'default') {
    return NextResponse.json({ error: 'Não é possível excluir o workspace padrão' }, { status: 400 })
  }
  await prisma.workspace.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
