// ── Meta Creatives / Ad-level Insights ────────────────────────────────────────
// Fetches performance data at the ad level and joins creative thumbnails.

import { MetaApiClient } from './client'
import { prisma } from '@/services/db/client'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AdInsight {
  adId:         string
  adName:       string
  campaignId:   string
  campaignName: string
  thumbnailUrl?: string
  spend:        number
  impressions:  number
  reach:        number
  clicks:       number
  ctr:          number
  cpm:          number
  frequency:    number
  purchases:    number
  leads:        number
  initiateCheckout: number
  revenue:      number
  roas:         number
  landingPageViews: number
  connectRate:  number
  purchaseRate: number
  leadRate:     number
  cpc:          number
  costPerLead:  number
  costPerPurchase: number
  costPerInitiateCheckout: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
type MetaAction = { action_type: string; value: string }

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
    where:  { id: workspaceId },
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

// ── Main function ─────────────────────────────────────────────────────────────
export async function getAdInsights(params: {
  startDate:    string
  endDate:      string
  campaignIds?: string[]
  workspaceId?: string
}): Promise<AdInsight[]> {
  const { client, accountId } = await getClientAndAccount(params.workspaceId)

  // ── 1. Fetch ad-level insights ─────────────────────────────────────────────
  const fields = [
    'ad_id', 'ad_name', 'campaign_id', 'campaign_name',
    'spend', 'impressions', 'reach', 'clicks',
    'ctr', 'cpm', 'frequency',
    'actions', 'action_values',
  ].join(',')

  const queryParams: Record<string, string> = {
    fields,
    level:      'ad',
    time_range: JSON.stringify({ since: params.startDate, until: params.endDate }),
    limit:      '500',
  }

  if (params.campaignIds?.length) {
    queryParams.filtering = JSON.stringify([
      { field: 'campaign.id', operator: 'IN', value: params.campaignIds },
    ])
  }

  type MetaAdRow = {
    ad_id:         string
    ad_name:       string
    campaign_id:   string
    campaign_name: string
    spend:         string
    impressions:   string
    reach:         string
    clicks:        string
    ctr:           string
    cpm:           string
    frequency:     string
    actions?:      MetaAction[]
    action_values?: MetaAction[]
  }

  const resp = await client.get<{ data: MetaAdRow[] }>(`${accountId}/insights`, queryParams)
  const rows = resp.data ?? []

  // ── 2. Batch-fetch creative thumbnails (50 IDs per request) ───────────────
  const adIds = [...new Set(rows.map(r => r.ad_id))]
  const thumbnailMap = new Map<string, string>()

  if (adIds.length > 0) {
    const BATCH = 50
    for (let i = 0; i < adIds.length; i += BATCH) {
      const batch = adIds.slice(i, i + BATCH)
      try {
        type BatchResp = Record<string, {
          id: string
          creative?: { thumbnail_url?: string; image_url?: string }
        }>
        const batchResp = await client.get<BatchResp>('', {
          ids:    batch.join(','),
          fields: 'id,creative{thumbnail_url,image_url}',
        })
        Object.values(batchResp).forEach(ad => {
          const url = ad.creative?.thumbnail_url ?? ad.creative?.image_url
          if (url) thumbnailMap.set(ad.id, url)
        })
      } catch {
        // Thumbnail failure is non-fatal — ads still show without preview
      }
    }
  }

  // ── 3. Map rows → AdInsight ────────────────────────────────────────────────
  return rows.map(row => {
    const actions      = row.actions      ?? []
    const actionValues = row.action_values ?? []

    const purchases = pickAction(actions, [
      'offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase',
    ])
    const leads = pickAction(actions, [
      'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'lead',
    ])
    const initiateCheckout = pickAction(actions, [
      'offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout',
    ])
    const revenue          = pickAction(actionValues, ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase'])
    const landingPageViews = pickAction(actions, ['landing_page_view'])

    const spend       = parseFloat(row.spend       || '0')
    const impressions = parseInt(row.impressions   || '0')
    const reach       = parseInt(row.reach         || '0')
    const clicks      = parseFloat(row.clicks      || '0')
    const ctr         = parseFloat(row.ctr         || '0')
    const cpm         = parseFloat(row.cpm         || '0')
    const frequency   = parseFloat(row.frequency   || '0')

    return {
      adId:         row.ad_id,
      adName:       row.ad_name,
      campaignId:   row.campaign_id,
      campaignName: row.campaign_name,
      thumbnailUrl: thumbnailMap.get(row.ad_id),
      spend,
      impressions,
      reach,
      clicks,
      ctr,
      cpm,
      frequency,
      purchases,
      leads,
      initiateCheckout,
      revenue,
      roas:                    spend > 0            ? revenue / spend               : 0,
      landingPageViews,
      connectRate:             clicks > 0           ? (landingPageViews / clicks) * 100 : 0,
      purchaseRate:            landingPageViews > 0 ? (purchases / landingPageViews) * 100 : 0,
      leadRate:                landingPageViews > 0 ? (leads     / landingPageViews) * 100 : 0,
      cpc:                     clicks > 0           ? spend / clicks                : 0,
      costPerLead:             leads > 0            ? spend / leads                 : 0,
      costPerPurchase:         purchases > 0        ? spend / purchases             : 0,
      costPerInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout      : 0,
    }
  })
}
