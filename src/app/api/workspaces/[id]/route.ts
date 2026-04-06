export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, metaToken, adAccountId, adAccountName, pageId } = body
  const workspace = await prisma.workspace.update({
    where: { id: params.id },
    data: {
      ...(name        !== undefined && { name }),
      ...(metaToken   !== undefined && { metaToken }),
      ...(adAccountId !== undefined && { adAccountId }),
      ...(adAccountName !== undefined && { adAccountName }),
      ...(pageId      !== undefined && { pageId }),
    },
  })
  return NextResponse.json({ success: true, data: workspace })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (params.id === 'default') {
    return NextResponse.json({ success: false, error: 'Não é possível remover o workspace padrão' }, { status: 400 })
  }
  await prisma.workspace.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
