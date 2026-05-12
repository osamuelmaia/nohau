export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

// DELETE — remove a linked Meta account
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; accountId: string } },
) {
  const account = await prisma.workspaceMetaAccount.findFirst({
    where: { id: params.accountId, workspaceId: params.id },
  })
  if (!account) return NextResponse.json({ success: false, error: 'Conta não encontrada' }, { status: 404 })

  await prisma.workspaceMetaAccount.delete({ where: { id: params.accountId } })
  return NextResponse.json({ success: true })
}
