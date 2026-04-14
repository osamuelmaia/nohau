// ── Meta Insights Service ─────────────────────────────────────────────────────
// Fetches campaign-level performance data from the Meta Marketing API.
// Used by the Dashboard and Daily Performance pages.

import { MetaApiClient } from './client'
import { prisma } from '@/services/db/client'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface InsightsParams {
  startDate:    string       // YYYY-MM-DD
  endDate:      string       // YYYY-MM-DD
  campaignIds?: string[]     // filter by campaign — empty = all
  daily?:       boolean      // true = time_increment=1 (day-by-day rows)
  workspaceId?: string       // which workspace to use (defaults to 'default')
}

export interface CampaignInsight {
  campaignId:   string
  campaignName: string
  date?:        string   // present only when daily=true
  spend:        number
  impressions:  number
  reach:        number
  clicks:       number
  linkClicks:   number   // inline_link_clicks (cliques no link)
  ctr:          number   // as percentage (e.g. 2.5 = 2.5%)
  cpm:          number   // in account currency
  frequency:    number
  purchases:        number
  leads:            number
  initiateCheckout: number
  revenue:          number
  roas:             number
  landingPageViews: number
  connectRate:      number
  purchaseRate:     number   // purchases / clicks * 100
  leadRate:         number   // leads / clicks * 100
  cpc:                     number   // spend / clicks
  costPerLead:             number   // spend / leads
  costPerPurchase:         number   // spend / purchases
  costPerInitiateCheckout: number   // spend / initiateCheckout
}

export interface MetaCampaign {
  id:               string
  name:             string
  status:           string
  effective_status?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
type MetaAction = { action_type: string; value: string }

// sumActions was tripling counts: purchase + offsite_conversion.fb_pixel_purchase + omni_purchase
// are the SAME event reported under different keys. Use first non-zero match instead.
function pickAction(actions: MetaAction[], types: string[]): number {
  for (const t of types) {
    const found = actions.find(a => a.action_type === t)
    if (found) {
      const v = parseFloat(found.value)
      if (v > 0) return v
    }
  }
  return 0
}

async function getClientAndAccount(workspaceId = 'default') {
  const settings = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { metaToken: true, adAccountId: true },
  })
  if (!settings?.metaToken)   throw new Error('Token Meta não configurado')
  if (!settings?.adAccountId) throw new Error('Conta de anúncios não selecionada')

  const client    = new MetaApiClient(settings.metaToken)
  const accountId = settings.adAccountId.startsWith('act_')
    ? settings.adAccountId
    : `act_${settings.adAccountId}`

  return { client, accountId }
}

// ── Fetch insights ─────────────────────────────────────────────────────────────
export async function getInsights(params: InsightsParams): Promise<CampaignInsight[]> {
  const { client, accountId } = await getClientAndAccount(params.workspaceId)

  const fields = [
    'campaign_id', 'campaign_name',
    'spend', 'impressions', 'reach', 'clicks', 'inline_link_clicks',
    'ctr', 'cpm', 'frequency',
    'actions', 'action_values',
  ].join(',')

  const queryParams: Record<string, string> = {
    fields,
    level:      'campaign',
    time_range: JSON.stringify({ since: params.startDate, until: params.endDate }),
    limit:      '500',
  }

  if (params.daily) {
    queryParams.time_increment = '1'
  }

  if (params.campaignIds?.length) {
    queryParams.filtering = JSON.stringify([
      { field: 'campaign.id', operator: 'IN', value: params.campaignIds },
    ])
  }

  type MetaRow = {
    campaign_id:         string
    campaign_name:       string
    spend:               string
    impressions:         string
    reach:               string
    clicks:              string
    inline_link_clicks?: string
    ctr:                 string
    cpm:           string
    frequency:     string
    date_start?:          string
    actions?:      MetaAction[]
    action_values?: MetaAction[]
  }

  type InsightsResp = { data: MetaRow[] }

  const resp = await client.get<InsightsResp>(`${accountId}/insights`, queryParams)

  return (resp.data ?? []).map(row => {
    const actions      = row.actions ?? []
    const actionValues = row.action_values ?? []

    // Priority order: most specific pixel event first, then omni, then generic.
    // Never add them together — they report the same conversions under different keys.
    const purchases = pickAction(actions, [
      'offsite_conversion.fb_pixel_purchase',
      'omni_purchase',
      'purchase',
    ])
    const leads = pickAction(actions, [
      'offsite_conversion.fb_pixel_lead',
      'onsite_conversion.lead_grouped',
      'lead',
    ])
    const initiateCheckout = pickAction(actions, [
      'offsite_conversion.fb_pixel_initiate_checkout',
      'initiate_checkout',
    ])

    const revenue          = pickAction(actionValues, ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase'])
    const landingPageViews = pickAction(actions, ['landing_page_view'])

    const spend      = parseFloat(row.spend              || '0')
    const impressions = parseInt(row.impressions          || '0')
    const reach       = parseInt(row.reach                || '0')
    const clicks      = parseFloat(row.clicks             || '0')
    const linkClicks  = parseInt(row.inline_link_clicks   || '0')
    const ctr         = parseFloat(row.ctr                || '0')
    const cpm         = parseFloat(row.cpm         || '0')
    const frequency   = parseFloat(row.frequency   || '0')

    return {
      campaignId:      row.campaign_id,
      campaignName:    row.campaign_name,
      date:            row.date_start,
      spend,
      impressions,
      reach,
      clicks,
      linkClicks,
      ctr,
      cpm,
      frequency,
      purchases,
      leads,
      initiateCheckout,
      revenue,
      roas:            spend > 0 ? revenue / spend : 0,
      landingPageViews,
      connectRate:     clicks > 0 ? (landingPageViews / clicks) * 100 : 0,
      purchaseRate:            landingPageViews > 0 ? (purchases / landingPageViews) * 100 : 0,
      leadRate:                landingPageViews > 0 ? (leads     / landingPageViews) * 100 : 0,
      cpc:                     clicks > 0          ? spend / clicks             : 0,
      costPerLead:             leads > 0           ? spend / leads              : 0,
      costPerPurchase:         purchases > 0       ? spend / purchases          : 0,
      costPerInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout  : 0,
    }
  })
}

// ── Fetch campaigns list (for filter dropdown) ─────────────────────────────────
export async function getCampaignsList({ workspaceId }: { workspaceId?: string } = {}): Promise<MetaCampaign[]> {
  const { client, accountId } = await getClientAndAccount(workspaceId)

  type CampaignsResp = { data: MetaCampaign[] }
  const resp = await client.get<CampaignsResp>(`${accountId}/campaigns`, {
    fields:           'id,name,status,effective_status',
    limit:            '500',
    effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES']),
  })

  return (resp.data ?? []).sort((a, b) => a.name.localeCompare(b.name))
}

// ── Aggregate helper (for overview tab totals) ─────────────────────────────────
export function aggregateInsights(rows: CampaignInsight[]) {
  if (!rows.length) return null

  const spend            = rows.reduce((s, r) => s + r.spend,            0)
  const impressions      = rows.reduce((s, r) => s + r.impressions,      0)
  const reach            = rows.reduce((s, r) => s + r.reach,            0)
  const clicks           = rows.reduce((s, r) => s + r.clicks,           0)
  const linkClicks       = rows.reduce((s, r) => s + r.linkClicks,       0)
  const purchases        = rows.reduce((s, r) => s + r.purchases,        0)
  const leads            = rows.reduce((s, r) => s + r.leads,            0)
  const initiateCheckout = rows.reduce((s, r) => s + r.initiateCheckout, 0)
  const revenue          = rows.reduce((s, r) => s + r.revenue,          0)
  const landingPageViews = rows.reduce((s, r) => s + r.landingPageViews, 0)

  // Weighted average for frequency (by impressions)
  const frequency = impressions > 0
    ? rows.reduce((s, r) => s + r.frequency * r.impressions, 0) / impressions
    : 0

  return {
    spend,
    impressions,
    reach,
    clicks,
    linkClicks,
    purchases,
    leads,
    initiateCheckout,
    revenue,
    roas:                    spend > 0            ? revenue / spend               : 0,
    landingPageViews,
    connectRate:             clicks > 0           ? (landingPageViews / clicks) * 100 : 0,
    cpm:                     impressions > 0      ? (spend / impressions) * 1000  : 0,
    ctr:                     impressions > 0      ? (clicks / impressions) * 100  : 0,
    frequency,
    purchaseRate:            landingPageViews > 0  ? (purchases / landingPageViews) * 100 : 0,
    leadRate:                landingPageViews > 0  ? (leads     / landingPageViews) * 100 : 0,
    cpc:                     clicks > 0           ? spend / clicks                : 0,
    costPerLead:             leads > 0            ? spend / leads                 : 0,
    costPerPurchase:         purchases > 0        ? spend / purchases             : 0,
    costPerInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout      : 0,
  }
}
