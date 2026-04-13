export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getInsights, CampaignInsight } from '@/services/meta/insights'

// When daily=true, merge per-campaign rows into one row per date
function aggregateByDate(rows: CampaignInsight[]): CampaignInsight[] {
  if (!rows.length) return rows
  const map = new Map<string, CampaignInsight[]>()
  for (const row of rows) {
    const d = row.date ?? ''
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(row)
  }
  const result: CampaignInsight[] = []
  map.forEach((dateRows, date) => {
    const spend       = dateRows.reduce((s, r) => s + r.spend,            0)
    const impressions = dateRows.reduce((s, r) => s + r.impressions,      0)
    const reach       = dateRows.reduce((s, r) => s + r.reach,            0)
    const clicks      = dateRows.reduce((s, r) => s + r.clicks,           0)
    const purchases   = dateRows.reduce((s, r) => s + r.purchases,        0)
    const leads       = dateRows.reduce((s, r) => s + r.leads,            0)
    const initiateCheckout = dateRows.reduce((s, r) => s + r.initiateCheckout, 0)
    const revenue     = dateRows.reduce((s, r) => s + r.revenue,          0)
    const landingPageViews = dateRows.reduce((s, r) => s + r.landingPageViews, 0)
    const frequency   = impressions > 0
      ? dateRows.reduce((s, r) => s + r.frequency * r.impressions, 0) / impressions
      : 0
    result.push({
      campaignId:   '',
      campaignName: '',
      date,
      spend,
      impressions,
      reach,
      clicks,
      ctr:          impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpm:          impressions > 0 ? (spend / impressions) * 1000 : 0,
      frequency,
      purchases,
      leads,
      initiateCheckout,
      revenue,
      roas:         spend > 0 ? revenue / spend : 0,
      landingPageViews,
      connectRate:  clicks > 0 ? (landingPageViews / clicks) * 100 : 0,
      purchaseRate: landingPageViews > 0 ? (purchases / landingPageViews) * 100 : 0,
      leadRate:     landingPageViews > 0 ? (leads / landingPageViews) * 100 : 0,
      cpc:          clicks > 0 ? spend / clicks : 0,
      costPerLead:  leads > 0 ? spend / leads : 0,
      costPerPurchase: purchases > 0 ? spend / purchases : 0,
      costPerInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout : 0,
    })
  })
  return result.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
}

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
    return NextResponse.json({ success: true, data: daily ? aggregateByDate(data) : data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar insights'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

