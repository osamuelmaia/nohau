import { NextRequest, NextResponse } from 'next/server'
import { getInsights } from '@/services/meta/insights'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const startDate   = searchParams.get('startDate')
  const endDate     = searchParams.get('endDate')
  const campaignIds = searchParams.get('campaignIds')
  const daily       = searchParams.get('daily') === 'true'
  const workspaceId = searchParams.get('workspaceId') ?? 'default'

  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: 'startDate e endDate são obrigatórios' }, { status: 400 })
  }

  try {
    const data = await getInsights({
      startDate,
      endDate,
      campaignIds: campaignIds ? campaignIds.split(',').filter(Boolean) : undefined,
      daily,
      workspaceId,
    })
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar insights'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
