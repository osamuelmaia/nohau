import { NextResponse } from 'next/server'
import { getCampaignsList } from '@/services/meta/insights'

export async function GET() {
  try {
    const data = await getCampaignsList()
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar campanhas'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
