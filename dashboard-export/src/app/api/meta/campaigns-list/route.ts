export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMetaClientFromSettings } from '@/services/meta/client'
import { getCampaignsList }          from '@/services/meta/insights'

export async function GET(req: NextRequest) {
  const ws = req.nextUrl.searchParams.get('workspace') ?? 'default'
  try {
    const client = await getMetaClientFromSettings(ws)
    const data   = await getCampaignsList(client)
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
