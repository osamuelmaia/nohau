export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMetaClientFromSettings } from '@/services/meta/client'
import { getAdInsights }             from '@/services/meta/creatives'

export async function GET(req: NextRequest) {
  const p  = req.nextUrl.searchParams
  const ws = p.get('workspace') ?? 'default'
  try {
    const client = await getMetaClientFromSettings(ws)
    const data   = await getAdInsights(client, {
      since: p.get('since') ?? '',
      until: p.get('until') ?? '',
      campaignIds: p.get('campaigns') ? p.get('campaigns')!.split(',') : undefined,
    })
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
