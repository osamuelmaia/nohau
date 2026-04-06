export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getCampaignsList } from '@/services/meta/insights'

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'default'
  try {
    const data = await getCampaignsList({ workspaceId })
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar campanhas'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
