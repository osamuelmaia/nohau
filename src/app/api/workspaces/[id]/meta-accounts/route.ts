export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

// GET — list all linked Meta accounts for a workspace (tokens masked)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const accounts = await prisma.workspaceMetaAccount.findMany({
    where:   { workspaceId: params.id },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, adAccountId: true, adAccountName: true, pageId: true, label: true, createdAt: true },
  })
  return NextResponse.json({ success: true, data: accounts })
}

// POST — add a new linked Meta account
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { adAccountId, adAccountName, metaToken, pageId, label } = body

  if (!adAccountId?.trim()) return NextResponse.json({ success: false, error: 'adAccountId obrigatório' }, { status: 400 })
  if (!metaToken?.trim())   return NextResponse.json({ success: false, error: 'metaToken obrigatório' },   { status: 400 })

  const normalizedId = adAccountId.trim().startsWith('act_')
    ? adAccountId.trim()
    : `act_${adAccountId.trim()}`

  // Check workspace exists
  const ws = await prisma.workspace.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!ws) return NextResponse.json({ success: false, error: 'Workspace não encontrado' }, { status: 404 })

  try {
    const account = await prisma.workspaceMetaAccount.upsert({
      where: { workspaceId_adAccountId: { workspaceId: params.id, adAccountId: normalizedId } },
      create: {
        workspaceId:   params.id,
        adAccountId:   normalizedId,
        adAccountName: adAccountName?.trim() || null,
        metaToken:     metaToken.trim(),
        pageId:        pageId?.trim()  || null,
        label:         label?.trim()   || null,
      },
      update: {
        adAccountName: adAccountName?.trim() || null,
        metaToken:     metaToken.trim(),
        pageId:        pageId?.trim()  || null,
        label:         label?.trim()   || null,
      },
      select: { id: true, adAccountId: true, adAccountName: true, label: true },
    })
    return NextResponse.json({ success: true, data: account })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao salvar conta' }, { status: 500 })
  }
}
