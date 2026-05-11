export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/services/db/client'
import { MetaApiClient }             from '@/services/meta/client'
import { listAdAccounts, getAdAccount } from '@/services/meta/accounts'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const token = p.get('token') ?? ''
  const adAccountId = p.get('adAccountId') ?? ''

  const ws = await prisma.workspace.findUnique({ where: { id: 'default' }, select: { metaToken: true } })
  const accessToken = token || ws?.metaToken || ''
  if (!accessToken) return NextResponse.json({ success: false, error: 'No token' }, { status: 400 })

  const client = new MetaApiClient(accessToken)
  try {
    if (adAccountId) {
      const account = await getAdAccount(client, adAccountId)
      return NextResponse.json({ success: true, data: [account] })
    }
    const accounts = await listAdAccounts(client)
    return NextResponse.json({ success: true, data: accounts })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
