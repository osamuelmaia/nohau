export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { getInsights, aggregateInsights } from '@/services/meta/insights'

function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end   = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function monthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  let y = fy, m = fm
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const startMonth  = searchParams.get('startMonth')  ?? '2025-11'
  const endMonth    = searchParams.get('endMonth')    ?? new Date().toISOString().slice(0, 7)
  const workspaceId = searchParams.get('workspaceId') ?? 'default'
  const campaignIds = searchParams.get('campaignIds')

  try {
    const months = monthsBetween(startMonth, endMonth)

    // Sequential fetching to avoid Meta API rate limits
    const results = []
    for (const ym of months) {
      const { start, end } = monthRange(ym)
      const [y, m] = ym.split('-')
      const label = `${MONTH_LABELS[m] ?? m}/${y}`

      let attempt = 0
      let success = false
      while (attempt < 3 && !success) {
        try {
          if (attempt > 0) await sleep(attempt * 1500)
          const rows = await getInsights({
            startDate: start,
            endDate:   end,
            workspaceId,
            ...(campaignIds ? { campaignIds: campaignIds.split(',').filter(Boolean) } : {}),
          })
          const agg = aggregateInsights(rows)
          results.push({ month: label, ym, error: false, ...( agg ?? emptyRow()) })
          success = true
        } catch (e) {
          attempt++
          if (attempt >= 3) {
            const msg = e instanceof Error ? e.message : 'Erro desconhecido'
            results.push({ month: label, ym, error: true, errorMsg: msg, ...emptyRow() })
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: results })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao gerar relatório'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

function emptyRow() {
  return {
    spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0,
    frequency: 0, purchases: 0, leads: 0, initiateCheckout: 0,
    revenue: 0, roas: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0,
    landingPageViews: 0, connectRate: 0, purchaseRate: 0, leadRate: 0,
    costPerInitiateCheckout: 0,
  }
}
