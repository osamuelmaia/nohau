import { NextRequest, NextResponse } from 'next/server'
import { getMetaClientFromSettings } from '@/services/meta/client'
import { listAdAccounts } from '@/services/meta/accounts'
import { prisma } from '@/services/db/client'

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'default'
  const start = Date.now()
  try {
    const client = await getMetaClientFromSettings(workspaceId)
    const accounts = await listAdAccounts(client)
    await prisma.apiLog.create({
      data: { operation: 'LIST_AD_ACCOUNTS', method: 'GET', endpoint: '/me/adaccounts', responseBody: JSON.stringify({ count: accounts.length }), statusCode: 200, success: true, durationMs: Date.now() - start },
    }).catch(() => {})
    return NextResponse.json({ success: true, data: accounts })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao listar contas'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
