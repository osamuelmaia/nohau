export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { MetaApiClient } from '@/services/meta/client'
import { prisma } from '@/services/db/client'

export interface BreakdownRow {
  key:   string   // "0", "1", ... (hour or day index)
  label: string   // "00h" or "Seg"
  spend:           number
  impressions:     number
  reach:           number
  clicks:          number
  purchases:       number
  leads:           number
  initiateCheckout: number
  revenue:         number
  roas:            number
  ctr:             number
  cpm:             number
  cpc:             number
  costPerLead:     number
  costPerPurchase: number
  landingPageViews: number
}

type MetaAction = { action_type: string; value: string }
function sumActions(actions: MetaAction[], types: string[]): number {
  return types.reduce((s, t) => {
    const f = actions.find(a => a.action_type === t)
    return s + (f ? parseFloat(f.value) : 0)
  }, 0)
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`)
const DAY_LABELS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type        = searchParams.get('type') ?? 'hours'   // 'hours' | 'days'
  const startDate   = searchParams.get('startDate')
  const endDate     = searchParams.get('endDate')
  const campaignIds = searchParams.get('campaignIds')
  const workspaceId = searchParams.get('workspaceId') ?? 'default'

  if (!startDate || !endDate)
    return NextResponse.json({ success: false, error: 'startDate e endDate são obrigatórios' }, { status: 400 })

  try {
    const settings = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!settings?.metaToken)   throw new Error('Token Meta não configurado')
    if (!settings?.adAccountId) throw new Error('Conta de anúncios não selecionada')

    const client    = new MetaApiClient(settings.metaToken)
    const accountId = settings.adAccountId.startsWith('act_')
      ? settings.adAccountId
      : `act_${settings.adAccountId}`

    const breakdown = type === 'hours'
      ? 'hourly_stats_aggregated_by_advertiser_time_zone'
      : 'days_of_week'

    const fields = [
      'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'frequency',
      'actions', 'action_values',
    ].join(',')

    const queryParams: Record<string, string> = {
      fields,
      level:      'account',
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      breakdowns: breakdown,
      limit:      '200',
    }

    if (campaignIds) {
      queryParams.filtering = JSON.stringify([
        { field: 'campaign.id', operator: 'IN', value: campaignIds.split(',').filter(Boolean) },
      ])
    }

    type MetaRow = {
      spend: string; impressions: string; reach: string; clicks: string
      ctr: string; cpm: string; frequency: string
      hourly_stats_aggregated_by_advertiser_time_zone?: string
      days_of_week?: string
      actions?: MetaAction[]; action_values?: MetaAction[]
    }

    const resp = await client.get<{ data: MetaRow[] }>(`${accountId}/insights`, queryParams)
    const rows = resp.data ?? []

    // Build a map key → aggregated values (API may return multiple rows per slot)
    const map = new Map<string, BreakdownRow>()

    for (const row of rows) {
      const rawKey = type === 'hours'
        ? (row.hourly_stats_aggregated_by_advertiser_time_zone ?? '0:00:00-1:00:00')
        : (row.days_of_week ?? '0')

      // For hours, key is like "0:00:00-1:00:00" → extract the starting hour
      const key = type === 'hours'
        ? String(parseInt(rawKey.split(':')[0], 10))
        : rawKey

      const actions      = row.actions      ?? []
      const actionValues = row.action_values ?? []

      const purchases        = sumActions(actions,      ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'])
      const leads            = sumActions(actions,      ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped'])
      const initiateCheckout = sumActions(actions,      ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'])
      const revenue          = sumActions(actionValues, ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'])
      const landingPageViews = sumActions(actions,      ['landing_page_view'])

      const spend       = parseFloat(row.spend       || '0')
      const impressions = parseInt  (row.impressions || '0')
      const reach       = parseInt  (row.reach       || '0')
      const clicks      = parseFloat(row.clicks      || '0')

      const existing = map.get(key)
      if (existing) {
        existing.spend           += spend
        existing.impressions     += impressions
        existing.reach           += reach
        existing.clicks          += clicks
        existing.purchases       += purchases
        existing.leads           += leads
        existing.initiateCheckout += initiateCheckout
        existing.revenue         += revenue
        existing.landingPageViews += landingPageViews
      } else {
        const label = type === 'hours'
          ? HOUR_LABELS[parseInt(key, 10)] ?? key
          : DAY_LABELS[parseInt(key,  10)] ?? key

        map.set(key, {
          key, label, spend, impressions, reach, clicks,
          purchases, leads, initiateCheckout, revenue, landingPageViews,
          roas: 0, ctr: 0, cpm: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0,
        })
      }
    }

    // Compute derived metrics and fill missing slots with zeros
    const size   = type === 'hours' ? 24 : 7
    const labels = type === 'hours' ? HOUR_LABELS : DAY_LABELS
    const result: BreakdownRow[] = Array.from({ length: size }, (_, i) => {
      const key = String(i)
      const r   = map.get(key)
      if (!r) return {
        key, label: labels[i], spend: 0, impressions: 0, reach: 0, clicks: 0,
        purchases: 0, leads: 0, initiateCheckout: 0, revenue: 0, landingPageViews: 0,
        roas: 0, ctr: 0, cpm: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0,
      }
      r.roas            = r.spend > 0         ? r.revenue / r.spend              : 0
      r.ctr             = r.impressions > 0   ? (r.clicks / r.impressions) * 100 : 0
      r.cpm             = r.impressions > 0   ? (r.spend / r.impressions) * 1000 : 0
      r.cpc             = r.clicks > 0        ? r.spend / r.clicks               : 0
      r.costPerLead     = r.leads > 0         ? r.spend / r.leads                : 0
      r.costPerPurchase = r.purchases > 0     ? r.spend / r.purchases            : 0
      return r
    })

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar breakdown'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
