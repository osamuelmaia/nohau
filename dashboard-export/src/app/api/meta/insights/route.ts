export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMetaClientFromSettings } from '@/services/meta/client'
import { getInsights, aggregateByDate } from '@/services/meta/insights'

export async function GET(req: NextRequest) {
  const p  = req.nextUrl.searchParams
  const ws = p.get('workspace') ?? 'default'
  try {
    const client = await getMetaClientFromSettings(ws)
    const data = await getInsights(client, {
      since: p.get('since') ?? '',
      until: p.get('until') ?? '',
      campaignIds: p.get('campaigns') ? p.get('campaigns')!.split(',') : undefined,
    })
    if (p.get('daily') === 'true') {
      return NextResponse.json({ success: true, data: aggregateByDate(data) })
    }
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
