export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { MetaApiClient } from '@/services/meta/client'
import { getWorkspaceMetaAccounts } from '@/services/meta/multi-accounts'

export interface BreakdownRow {
  key:   string
  label: string
  spend:            number
  impressions:      number
  reach:            number
  clicks:           number
  purchases:        number
  leads:            number
  initiateCheckout: number
  revenue:          number
  roas:             number
  ctr:              number
  cpm:              number
  cpc:              number
  costPerLead:      number
  costPerPurchase:  number
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

function emptyRow(key: string, label: string): BreakdownRow {
  return { key, label, spend: 0, impressions: 0, reach: 0, clicks: 0, purchases: 0, leads: 0, initiateCheckout: 0, revenue: 0, roas: 0, ctr: 0, cpm: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0, landingPageViews: 0 }
}

function deriveMetrics(r: BreakdownRow): BreakdownRow {
  return {
    ...r,
    roas:            r.spend > 0        ? r.revenue / r.spend              : 0,
    ctr:             r.impressions > 0  ? (r.clicks / r.impressions) * 100 : 0,
    cpm:             r.impressions > 0  ? (r.spend / r.impressions) * 1000 : 0,
    cpc:             r.clicks > 0       ? r.spend / r.clicks               : 0,
    costPerLead:     r.leads > 0        ? r.spend / r.leads                : 0,
    costPerPurchase: r.purchases > 0    ? r.spend / r.purchases            : 0,
  }
}

function accumulate(map: Map<string, BreakdownRow>, key: string, label: string, data: Partial<BreakdownRow>) {
  const existing = map.get(key) ?? emptyRow(key, label)
  map.set(key, {
    ...existing,
    spend:            existing.spend            + (data.spend            ?? 0),
    impressions:      existing.impressions      + (data.impressions      ?? 0),
    reach:            existing.reach            + (data.reach            ?? 0),
    clicks:           existing.clicks           + (data.clicks           ?? 0),
    purchases:        existing.purchases        + (data.purchases        ?? 0),
    leads:            existing.leads            + (data.leads            ?? 0),
    initiateCheckout: existing.initiateCheckout + (data.initiateCheckout ?? 0),
    revenue:          existing.revenue          + (data.revenue          ?? 0),
    landingPageViews: existing.landingPageViews + (data.landingPageViews ?? 0),
  })
}

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
    const accounts = await getWorkspaceMetaAccounts(workspaceId)
    if (accounts.length === 0) throw new Error('Nenhuma conta de anúncios configurada')

    const map = new Map<string, BreakdownRow>()

    if (type === 'hours') {
      // ── Hourly breakdown — fetch each account in parallel ──────────────────
      const queryParams: Record<string, string> = {
        fields:     'spend,impressions,reach,clicks,actions,action_values',
        level:      'account',
        time_range: JSON.stringify({ since: startDate, until: endDate }),
        breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
        limit:      '500',
      }
      if (campaignIds) {
        queryParams.filtering = JSON.stringify([
          { field: 'campaign.id', operator: 'IN', value: campaignIds.split(',').filter(Boolean) },
        ])
      }

      type HourRow = {
        spend: string; impressions: string; reach: string; clicks: string
        hourly_stats_aggregated_by_advertiser_time_zone?: string
        actions?: MetaAction[]; action_values?: MetaAction[]
      }

      await Promise.all(accounts.map(async acc => {
        const client = new MetaApiClient(acc.metaToken)
        const resp = await client.get<{ data: HourRow[] }>(`${acc.adAccountId}/insights`, queryParams)
        for (const row of resp.data ?? []) {
          const rawKey = row.hourly_stats_aggregated_by_advertiser_time_zone ?? '0:00:00-1:00:00'
          const key    = String(parseInt(rawKey.split(':')[0], 10))
          const label  = HOUR_LABELS[parseInt(key, 10)] ?? key

          const actions      = row.actions      ?? []
          const actionValues = row.action_values ?? []
          accumulate(map, key, label, {
            spend:            parseFloat(row.spend       || '0'),
            impressions:      parseInt  (row.impressions || '0'),
            reach:            parseInt  (row.reach       || '0'),
            clicks:           parseFloat(row.clicks      || '0'),
            purchases:        sumActions(actions,      ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']),
            leads:            sumActions(actions,      ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped']),
            initiateCheckout: sumActions(actions,      ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']),
            revenue:          sumActions(actionValues, ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']),
            landingPageViews: sumActions(actions,      ['landing_page_view']),
          })
        }
      }))

      const result = Array.from({ length: 24 }, (_, i) => {
        const key = String(i)
        return deriveMetrics(map.get(key) ?? emptyRow(key, HOUR_LABELS[i]))
      })
      return NextResponse.json({ success: true, data: result })

    } else {
      // ── Days of week: fetch daily data and group by JS getDay() ────────────
      const queryParams: Record<string, string> = {
        fields:         'spend,impressions,reach,clicks,actions,action_values',
        level:          'account',
        time_range:     JSON.stringify({ since: startDate, until: endDate }),
        time_increment: '1',
        limit:          '500',
      }
      if (campaignIds) {
        queryParams.filtering = JSON.stringify([
          { field: 'campaign.id', operator: 'IN', value: campaignIds.split(',').filter(Boolean) },
        ])
      }

      type DayRow = {
        spend: string; impressions: string; reach: string; clicks: string
        date_start?: string
        actions?: MetaAction[]; action_values?: MetaAction[]
      }

      await Promise.all(accounts.map(async acc => {
        const client = new MetaApiClient(acc.metaToken)
        const resp = await client.get<{ data: DayRow[] }>(`${acc.adAccountId}/insights`, queryParams)
        for (const row of resp.data ?? []) {
          const dateStr = row.date_start ?? startDate
          const dow     = new Date(`${dateStr}T12:00:00`).getDay()
          const key     = String(dow)
          const label   = DAY_LABELS[dow]

          const actions      = row.actions      ?? []
          const actionValues = row.action_values ?? []
          accumulate(map, key, label, {
            spend:            parseFloat(row.spend       || '0'),
            impressions:      parseInt  (row.impressions || '0'),
            reach:            parseInt  (row.reach       || '0'),
            clicks:           parseFloat(row.clicks      || '0'),
            purchases:        sumActions(actions,      ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']),
            leads:            sumActions(actions,      ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped']),
            initiateCheckout: sumActions(actions,      ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']),
            revenue:          sumActions(actionValues, ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']),
            landingPageViews: sumActions(actions,      ['landing_page_view']),
          })
        }
      }))

      const result = Array.from({ length: 7 }, (_, i) => {
        const key = String(i)
        return deriveMetrics(map.get(key) ?? emptyRow(key, DAY_LABELS[i]))
      })
      return NextResponse.json({ success: true, data: result })
    }

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar breakdown'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
