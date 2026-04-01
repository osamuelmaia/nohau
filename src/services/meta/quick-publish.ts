// ── Quick Publish ────────────────────────────────────────────────────────────
// Simplified one-shot Meta API publisher.
// Given a form payload + uploaded files, creates:
//   Campaign → Ad Set → Upload media → Creatives → Ads
// Everything created as PAUSED (draft for review inside Meta Ads Manager).

import { MetaApiClient, MetaError } from './client'
import { prisma } from '@/services/db/client'
import fs from 'fs'
import path from 'path'

export type CampaignType = 'CBO' | 'ABO'

export interface UploadedFile {
  storedName: string   // filename in public/uploads/ (local) or blob pathname (Vercel)
  url?: string         // Vercel Blob public URL — used for fetching file on server
  originalName: string
  mimeType: string
  type: 'IMAGE' | 'VIDEO'
  group: string        // parsed group name, e.g. "ad01"
  placement: string    // e.g. "feed", "stories"
}

export interface PublishPayload {
  campaignName: string
  adSetName: string
  campaignType: CampaignType
  objective: string       // e.g. OUTCOME_TRAFFIC
  budget: number          // in BRL (e.g. 10.00) — stored as cents in Meta
  pageId: string
  pixelId?: string        // Facebook Pixel ID — required for OFFSITE_CONVERSIONS
  bodyTexts: string[]     // one or more, applied round-robin to ads
  titles: string[]
  descriptions: string[]
  destinationUrl: string
  callToAction: string
  geoLocations: string[]  // e.g. ["BR"]
  files: UploadedFile[]
}

export interface PublishResult {
  success: boolean
  metaCampaignId?: string
  metaAdSetId?: string
  adsCreated: number
  errors: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 30 * 1024 * 1024   // 30 MB — Meta hard limit
const MAX_VIDEO_BYTES = 500 * 1024 * 1024  // 500 MB — practical limit to avoid timeouts

// ── Retry wrapper (handles Meta rate limits: codes 17, 32, 613, 80004) ────────
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 1500): Promise<T> {
  let last: Error = new Error('Unknown error')
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e))
      const code = e instanceof MetaError ? (e.code ?? 0) : 0
      const isRateLimit = [17, 32, 613, 80004].includes(code) ||
        last.message.toLowerCase().includes('rate limit') ||
        last.message.toLowerCase().includes('throttl')
      if (!isRateLimit || i === attempts) throw last
      // Exponential back-off: 1.5s, 3s, 6s …
      await new Promise(r => setTimeout(r, baseDelayMs * i))
    }
  }
  throw last
}

// ── Logger ────────────────────────────────────────────────────────────────────
async function log(
  op: string, method: string, endpoint: string,
  req: unknown, res: unknown, ok: boolean, err = '', ms?: number,
) {
  await prisma.apiLog.create({
    data: {
      operation: op, method, endpoint,
      requestBody: JSON.stringify(req ?? {}),
      responseBody: JSON.stringify(res ?? {}),
      statusCode: ok ? 200 : 400,
      success: ok, errorMessage: err, durationMs: ms,
    },
  }).catch(() => { /* non-critical */ })
}

// ── Objective → optimization_goal mapping (Meta API v21) ─────────────────────
//
// Confirmed via real API testing on 2025-03-24:
//
//  OUTCOME_TRAFFIC     → LINK_CLICKS          (no pixel, no promoted_object)
//  OUTCOME_SALES       → OFFSITE_CONVERSIONS  (pixel REQUIRED, promoted_object mandatory)
//  OUTCOME_LEADS       → OFFSITE_CONVERSIONS  (pixel REQUIRED, promoted_object mandatory)
//  OUTCOME_ENGAGEMENT  → POST_ENGAGEMENT      (no destination_type, no promoted_object)
//  OUTCOME_AWARENESS   → REACH                (no destination_type, no promoted_object)
//
// LANDING_PAGE_VIEWS does NOT work for OUTCOME_SALES/LEADS in this account.
// OFFSITE_CONVERSIONS requires pixel_id in promoted_object — no pixel = error.
function getOptimization(objective: string): { optimization_goal: string; billing_event: string } {
  const map: Record<string, { optimization_goal: string; billing_event: string }> = {
    OUTCOME_TRAFFIC:       { optimization_goal: 'LINK_CLICKS',        billing_event: 'IMPRESSIONS' },
    OUTCOME_SALES:         { optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS' },
    OUTCOME_LEADS:         { optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS' },
    OUTCOME_ENGAGEMENT:    { optimization_goal: 'POST_ENGAGEMENT',     billing_event: 'IMPRESSIONS' },
    OUTCOME_AWARENESS:     { optimization_goal: 'REACH',               billing_event: 'IMPRESSIONS' },
    OUTCOME_APP_PROMOTION: { optimization_goal: 'APP_INSTALLS',        billing_event: 'IMPRESSIONS' },
  }
  return map[objective] ?? { optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS' }
}

// Only website-oriented objectives accept destination_type: 'WEBSITE'
function getDestinationType(objective: string): string | undefined {
  return ['OUTCOME_TRAFFIC', 'OUTCOME_SALES', 'OUTCOME_LEADS'].includes(objective)
    ? 'WEBSITE'
    : undefined
}

// Build promoted_object for ad set.
// Confirmed required for OUTCOME_SALES and OUTCOME_LEADS (pixel mandatory).
// OUTCOME_TRAFFIC and others: no promoted_object needed.
function getPromotedObject(
  objective: string,
  pixelId?: string,
): Record<string, string> | undefined {
  if (objective === 'OUTCOME_SALES' && pixelId) {
    return { pixel_id: pixelId, custom_event_type: 'PURCHASE' }
  }
  if (objective === 'OUTCOME_LEADS' && pixelId) {
    return { pixel_id: pixelId, custom_event_type: 'LEAD' }
  }
  return undefined
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function localFilePath(storedName: string) {
  return path.join(process.cwd(), 'public', 'uploads', storedName)
}

// Read file bytes — from Vercel Blob URL (production) or local disk (dev)
async function readFileBytes(file: UploadedFile): Promise<Buffer> {
  if (file.url?.startsWith('http')) {
    const res = await fetch(file.url)
    if (!res.ok) throw new Error(`Falha ao baixar arquivo da nuvem: ${res.status} ${res.statusText}`)
    return Buffer.from(await res.arrayBuffer())
  }
  // Local development fallback — read from public/uploads/
  return fs.readFileSync(localFilePath(file.storedName))
}

// ── Validate file size before upload ─────────────────────────────────────────
function validateFileSize(file: UploadedFile): void {
  // When using Vercel Blob, the size limit is enforced at upload time (500 MB cap)
  if (file.url?.startsWith('http')) return

  const stats = fs.statSync(localFilePath(file.storedName))
  const limit = file.type === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  const limitMB = limit / 1024 / 1024
  if (stats.size > limit) {
    throw new Error(
      `Arquivo "${file.originalName}" excede o limite de ${limitMB} MB ` +
      `(${(stats.size / 1024 / 1024).toFixed(1)} MB). Reduza o tamanho antes de enviar.`,
    )
  }
}

// ── Upload image to Meta ───────────────────────────────────────────────────────
// IMPORTANT: Meta's /adimages endpoint uses the FIELD NAME as the image identifier.
// The response key will be the field name, not "bytes".
// e.g.: fd.append('myfile.jpg', blob) → response: { images: { 'myfile.jpg': { hash } } }
async function uploadImage(
  client: MetaApiClient, accountId: string, file: UploadedFile,
): Promise<string> {
  const buf = await readFileBytes(file)
  const fd = new FormData()
  // Use storedName as the field name — Meta returns the hash keyed by this name
  fd.append(file.storedName, new Blob([new Uint8Array(buf)]), file.storedName)

  type ImgResp = { images: Record<string, { hash: string }> }
  const res = await withRetry(() =>
    client.postFormData<ImgResp>(`${accountId}/adimages`, fd),
  )
  const entries = Object.values(res.images)
  if (!entries.length || !entries[0].hash) {
    throw new Error('Upload de imagem não retornou hash válido')
  }
  return entries[0].hash
}

// ── Upload video to Meta ───────────────────────────────────────────────────────
async function uploadVideo(
  client: MetaApiClient, accountId: string, file: UploadedFile, title: string,
): Promise<string> {
  const buf = await readFileBytes(file)
  const fd = new FormData()
  fd.append('source', new Blob([new Uint8Array(buf)]), file.storedName)
  fd.append('title', title)

  type VidResp = { video_id: string }
  const res = await withRetry(() =>
    client.postFormData<VidResp>(`${accountId}/advideos`, fd),
  )
  return res.video_id
}

// ── Main publish function ─────────────────────────────────────────────────────
export async function quickPublish(payload: PublishPayload): Promise<PublishResult> {
  const errors: string[] = []
  let adsCreated = 0

  // Load Meta credentials
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings?.metaToken) throw new Error('Token Meta não configurado')
  if (!settings?.adAccountId) throw new Error('Conta de anúncios não selecionada')

  const client = new MetaApiClient(settings.metaToken)
  const accountId = settings.adAccountId.startsWith('act_')
    ? settings.adAccountId
    : `act_${settings.adAccountId}`

  // Meta API requires budget in cents (1 BRL = 100 cents)
  // Minimum enforced: R$ 1,00 = 100 cents
  const budgetCents = Math.max(Math.round(payload.budget * 100), 100)

  // Validate pixel requirement for SALES/LEADS
  if ((payload.objective === 'OUTCOME_SALES' || payload.objective === 'OUTCOME_LEADS') && !payload.pixelId?.trim()) {
    throw new Error(
      `O objetivo "${payload.objective === 'OUTCOME_SALES' ? 'Vendas' : 'Leads'}" exige um Pixel ID. ` +
      'Preencha o campo Pixel ID no formulário.',
    )
  }

  const { optimization_goal, billing_event } = getOptimization(payload.objective)
  const destinationType = getDestinationType(payload.objective)
  const promotedObject = getPromotedObject(payload.objective, payload.pixelId)

  // ── 1. Create Campaign ────────────────────────────────────────────────────
  // bid_strategy lives at CAMPAIGN level for CBO, at ADSET level for ABO.
  // Placing bid_strategy on the adset when campaign is CBO causes "Invalid parameter".
  const campaignPayload: Record<string, unknown> = {
    name: payload.campaignName,
    objective: payload.objective,
    status: 'PAUSED',
    special_ad_categories: [],
  }
  if (payload.campaignType === 'CBO') {
    campaignPayload.daily_budget = budgetCents
    campaignPayload.bid_strategy = 'LOWEST_COST_WITHOUT_CAP'
  }

  const t0 = Date.now()
  let metaCampaignId: string
  try {
    const res = await withRetry(() =>
      client.post<{ id: string }>(`${accountId}/campaigns`, campaignPayload),
    )
    metaCampaignId = res.id
    await log('CREATE_CAMPAIGN', 'POST', `${accountId}/campaigns`, campaignPayload, res, true, '', Date.now() - t0)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar campanha'
    await log('CREATE_CAMPAIGN', 'POST', `${accountId}/campaigns`, campaignPayload, {}, false, msg)
    throw new Error(`Erro na campanha: ${msg}`)
  }

  // ── Prepare text variations (shared across all creatives) ────────────────
  // asset_feed_spec requires objects with { text } — not raw strings.
  // Only include what the user actually filled in (filter empty), max 5 each.
  const bodies       = payload.bodyTexts.filter(Boolean).slice(0, 5).map(t => ({ text: t }))
  const titles       = payload.titles.filter(Boolean).slice(0, 5).map(t => ({ text: t }))
  const descriptions = payload.descriptions.filter(Boolean).slice(0, 5).map(t => ({ text: t }))

  // Fallback: Meta requires at least 1 body and 1 title
  if (!bodies.length)  bodies.push({ text: payload.campaignName })
  if (!titles.length)  titles.push({ text: payload.campaignName })

  // ── 2 + 3. One adset per creative file ───────────────────────────────────
  //
  // Meta rule: is_dynamic_creative=true limits an adset to exactly 1 active ad.
  // Solution: 1 adset per file, each with is_dynamic_creative=true and 1 ad.
  // Every ad receives ALL body texts + titles + descriptions via asset_feed_spec.
  // Meta automatically tests every combination and surfaces the best performers.
  //
  // Result:
  //   Campaign
  //     ├── Conjunto: ad01_feed    → ad01_feed  [texto1…5, título1…5, desc1…5]
  //     ├── Conjunto: ad01_stories → ad01_stories [texto1…5, título1…5, desc1…5]
  //     └── Conjunto: ad02_feed    → ad02_feed  [texto1…5, título1…5, desc1…5]
  //
  // CBO: adsets inherit budget from campaign (no daily_budget here)
  // ABO: each adset gets its own daily_budget

  let firstAdSetId: string | undefined

  for (const file of payload.files) {
    const adName = file.originalName.replace(/\.[^/.]+$/, '') // strip extension

    try {
      // ── Size guard ─────────────────────────────────────────────────────────
      validateFileSize(file)

      // ── Create adset for this creative ─────────────────────────────────────
      const adSetName = payload.files.length === 1
        ? payload.adSetName
        : `${payload.adSetName} - ${adName}`

      const adSetPayload: Record<string, unknown> = {
        name: adSetName,
        campaign_id: metaCampaignId,
        status: 'PAUSED',
        optimization_goal,
        billing_event,
        is_dynamic_creative: true,
        targeting: {
          geo_locations: {
            countries: payload.geoLocations.length ? payload.geoLocations : ['BR'],
          },
          age_min: 18,
          age_max: 65,
          publisher_platforms: ['facebook', 'instagram'],
          facebook_positions: ['feed'],
          instagram_positions: ['stream', 'story'],
        },
      }
      if (destinationType) adSetPayload.destination_type = destinationType
      if (promotedObject)  adSetPayload.promoted_object  = promotedObject
      if (payload.campaignType === 'ABO') {
        adSetPayload.daily_budget = budgetCents
        adSetPayload.bid_strategy = 'LOWEST_COST_WITHOUT_CAP'
      }

      let adSetId: string
      try {
        const res = await withRetry(() =>
          client.post<{ id: string }>(`${accountId}/adsets`, adSetPayload),
        )
        adSetId = res.id
        if (!firstAdSetId) firstAdSetId = adSetId
        await log('CREATE_ADSET', 'POST', `${accountId}/adsets`, adSetPayload, res, true)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao criar conjunto'
        await log('CREATE_ADSET', 'POST', `${accountId}/adsets`, adSetPayload, {}, false, msg)
        throw new Error(`Conjunto "${adSetName}": ${msg}`)
      }

      // ── Upload media ────────────────────────────────────────────────────────
      let imageHash: string | undefined
      let videoId: string | undefined

      if (file.type === 'IMAGE') {
        imageHash = await uploadImage(client, accountId, file)
        await log('UPLOAD_IMAGE', 'POST', `${accountId}/adimages`, { file: file.originalName }, { hash: imageHash }, true)
      } else {
        videoId = await uploadVideo(client, accountId, file, adName)
        await log('UPLOAD_VIDEO', 'POST', `${accountId}/advideos`, { file: file.originalName }, { video_id: videoId }, true)
      }

      // ── Build asset_feed_spec with ALL text variations ──────────────────────
      // Each body text × title × description is a combination Meta will test.
      const assetFeedSpec: Record<string, unknown> = {
        bodies,
        titles,
        link_urls: [{ website_url: payload.destinationUrl, display_url: payload.destinationUrl }],
        call_to_action_types: [payload.callToAction],
      }
      if (descriptions.length > 0) assetFeedSpec.descriptions = descriptions

      if (imageHash) {
        assetFeedSpec.images     = [{ hash: imageHash }]
        assetFeedSpec.ad_formats = ['SINGLE_IMAGE']
      } else {
        assetFeedSpec.videos     = [{ video_id: videoId }]
        assetFeedSpec.ad_formats = ['SINGLE_VIDEO']
      }

      // ── Create creative ─────────────────────────────────────────────────────
      const creativePayload = {
        name: `Creative - ${adName}`,
        object_story_spec: { page_id: payload.pageId },
        asset_feed_spec: assetFeedSpec,
      }
      const creative = await withRetry(() =>
        client.post<{ id: string }>(`${accountId}/adcreatives`, creativePayload),
      )
      await log('CREATE_CREATIVE', 'POST', `${accountId}/adcreatives`, creativePayload, creative, true)

      // ── Create ad (1 per adset — Dynamic Creative rule) ─────────────────────
      const adPayload = {
        name: adName,
        adset_id: adSetId,
        creative: { creative_id: creative.id },
        status: 'PAUSED',
      }
      const ad = await withRetry(() =>
        client.post<{ id: string }>(`${accountId}/ads`, adPayload),
      )
      await log('CREATE_AD', 'POST', `${accountId}/ads`, adPayload, ad, true)

      adsCreated++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      errors.push(`${adName}: ${msg}`)
      await log('CREATE_AD_ERROR', 'POST', `${accountId}/ads`, { file: file.originalName }, {}, false, msg)
    }
  }

  return {
    success: errors.length === 0,
    metaCampaignId,
    metaAdSetId: firstAdSetId,
    adsCreated,
    errors,
  }
}
