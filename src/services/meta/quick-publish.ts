// ── Quick Publish ────────────────────────────────────────────────────────────
// Simplified one-shot Meta API publisher.
//
// Structure produced:
//   Campaign
//   └── Ad Set  (1 shared set, PAUSED)
//       ├── Ad "v1-feed - Texto 1"  → creative (v1-feed + text1 + title1 + desc1)
//       ├── Ad "v1-feed - Texto 2"  → creative (v1-feed + text2 + title2 + desc2)
//       │   …
//       ├── Ad "v2-feed - Texto 1"  → creative (v2-feed + text1 + title1 + desc1)
//       └── …
//
// Media is uploaded once per file.
// Each text variation becomes a separate ad (standard link_data / video_data).
// NO asset_feed_spec / NO is_dynamic_creative — avoids Meta's 1-ad-per-adset limit.
// Everything PAUSED — ready to review and activate in Meta Ads Manager.

import { MetaApiClient, MetaError } from './client'
import { prisma } from '@/services/db/client'
import fs from 'fs'
import path from 'path'

export type CampaignType = 'CBO' | 'ABO'

export interface UploadedFile {
  storedName: string
  url?: string
  originalName: string
  mimeType: string
  type: 'IMAGE' | 'VIDEO'
  group: string
  placement: string
}

export interface PublishPayload {
  campaignName: string
  adSetName: string
  campaignType: CampaignType
  objective: string
  budget: number          // BRL — converted to cents for Meta
  pageId: string
  pixelId?: string
  bodyTexts: string[]     // up to 5 — each becomes a separate ad per creative
  titles: string[]        // up to 5 — matched by index to bodyTexts
  descriptions: string[]  // up to 5 — matched by index to bodyTexts
  destinationUrl: string
  callToAction: string
  geoLocations: string[]
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
const MAX_IMAGE_BYTES = 30 * 1024 * 1024
const MAX_VIDEO_BYTES = 500 * 1024 * 1024

// ── Retry wrapper ─────────────────────────────────────────────────────────────
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
      requestBody:  JSON.stringify(req ?? {}),
      responseBody: JSON.stringify(res ?? {}),
      statusCode: ok ? 200 : 400,
      success: ok, errorMessage: err, durationMs: ms,
    },
  }).catch(() => {})
}

// ── Objective helpers ─────────────────────────────────────────────────────────
function getOptimization(objective: string) {
  const map: Record<string, { optimization_goal: string; billing_event: string }> = {
    OUTCOME_TRAFFIC:       { optimization_goal: 'LINK_CLICKS',         billing_event: 'IMPRESSIONS' },
    OUTCOME_SALES:         { optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS' },
    OUTCOME_LEADS:         { optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS' },
    OUTCOME_ENGAGEMENT:    { optimization_goal: 'POST_ENGAGEMENT',     billing_event: 'IMPRESSIONS' },
    OUTCOME_AWARENESS:     { optimization_goal: 'REACH',               billing_event: 'IMPRESSIONS' },
    OUTCOME_APP_PROMOTION: { optimization_goal: 'APP_INSTALLS',        billing_event: 'IMPRESSIONS' },
  }
  return map[objective] ?? { optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS' }
}

function getDestinationType(objective: string): string | undefined {
  return ['OUTCOME_TRAFFIC', 'OUTCOME_SALES', 'OUTCOME_LEADS'].includes(objective)
    ? 'WEBSITE'
    : undefined
}

function getPromotedObject(objective: string, pixelId?: string) {
  if (objective === 'OUTCOME_SALES' && pixelId) return { pixel_id: pixelId, custom_event_type: 'PURCHASE' }
  if (objective === 'OUTCOME_LEADS'  && pixelId) return { pixel_id: pixelId, custom_event_type: 'LEAD' }
  return undefined
}

// ── File helpers ──────────────────────────────────────────────────────────────
function localFilePath(storedName: string) {
  return path.join(process.cwd(), 'public', 'uploads', storedName)
}

async function readFileBytes(file: UploadedFile): Promise<Buffer> {
  if (file.url?.startsWith('http')) {
    const res = await fetch(file.url)
    if (!res.ok) throw new Error(`Falha ao baixar arquivo: ${res.status} ${res.statusText}`)
    return Buffer.from(await res.arrayBuffer())
  }
  return fs.readFileSync(localFilePath(file.storedName))
}

function validateFileSize(file: UploadedFile): void {
  if (file.url?.startsWith('http')) return
  const stats = fs.statSync(localFilePath(file.storedName))
  const limit = file.type === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  if (stats.size > limit) {
    throw new Error(
      `"${file.originalName}" excede ${(limit / 1024 / 1024).toFixed(0)} MB ` +
      `(${(stats.size / 1024 / 1024).toFixed(1)} MB).`,
    )
  }
}

// ── Upload helpers ─────────────────────────────────────────────────────────────
async function uploadImage(client: MetaApiClient, accountId: string, file: UploadedFile): Promise<string> {
  const buf = await readFileBytes(file)
  const fd  = new FormData()
  fd.append(file.storedName, new Blob([new Uint8Array(buf)]), file.storedName)
  type ImgResp = { images: Record<string, { hash: string }> }
  const res = await withRetry(() => client.postFormData<ImgResp>(`${accountId}/adimages`, fd))
  const entries = Object.values(res.images)
  if (!entries.length || !entries[0].hash) throw new Error('Upload de imagem não retornou hash')
  return entries[0].hash
}

async function uploadVideo(client: MetaApiClient, accountId: string, file: UploadedFile, title: string): Promise<string> {
  const buf = await readFileBytes(file)
  const fd  = new FormData()
  fd.append('source', new Blob([new Uint8Array(buf)]), file.storedName)
  fd.append('title', title)
  type VidResp = { video_id: string }
  const res = await withRetry(() => client.postFormData<VidResp>(`${accountId}/advideos`, fd))
  return res.video_id
}

// ── Main publish function ─────────────────────────────────────────────────────
export async function quickPublish(payload: PublishPayload): Promise<PublishResult> {
  const errors: string[] = []
  let adsCreated = 0

  // ── Load credentials ───────────────────────────────────────────────────────
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings?.metaToken)   throw new Error('Token Meta não configurado')
  if (!settings?.adAccountId) throw new Error('Conta de anúncios não selecionada')

  const client    = new MetaApiClient(settings.metaToken)
  const accountId = settings.adAccountId.startsWith('act_')
    ? settings.adAccountId
    : `act_${settings.adAccountId}`

  const budgetCents = Math.max(Math.round(payload.budget * 100), 100)

  if (
    (payload.objective === 'OUTCOME_SALES' || payload.objective === 'OUTCOME_LEADS') &&
    !payload.pixelId?.trim()
  ) {
    throw new Error(
      `O objetivo "${payload.objective === 'OUTCOME_SALES' ? 'Vendas' : 'Leads'}" exige um Pixel ID.`,
    )
  }

  const { optimization_goal, billing_event } = getOptimization(payload.objective)
  const destinationType = getDestinationType(payload.objective)
  const promotedObject  = getPromotedObject(payload.objective, payload.pixelId)

  // ── Normalise text arrays (filter empty, cap at 5) ─────────────────────────
  const bodyTexts    = payload.bodyTexts.filter(Boolean).slice(0, 5)
  const titles       = payload.titles.filter(Boolean).slice(0, 5)
  const descriptions = payload.descriptions.filter(Boolean).slice(0, 5)

  // At least 1 text required
  if (!bodyTexts.length) bodyTexts.push(payload.campaignName)

  // ── 1. Create Campaign ─────────────────────────────────────────────────────
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

  let metaCampaignId: string
  try {
    const t0  = Date.now()
    const res = await withRetry(() => client.post<{ id: string }>(`${accountId}/campaigns`, campaignPayload))
    metaCampaignId = res.id
    await log('CREATE_CAMPAIGN', 'POST', `${accountId}/campaigns`, campaignPayload, res, true, '', Date.now() - t0)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar campanha'
    await log('CREATE_CAMPAIGN', 'POST', `${accountId}/campaigns`, campaignPayload, {}, false, msg)
    throw new Error(`Erro na campanha: ${msg}`)
  }

  // ── 2. Create single Ad Set ────────────────────────────────────────────────
  //
  // Standard ad set — NO is_dynamic_creative.
  // is_dynamic_creative limits the set to exactly 1 ad, which prevents
  // multiple creatives from sharing the same set. Standard sets have no such limit.
  const adSetPayload: Record<string, unknown> = {
    name: payload.adSetName,
    campaign_id: metaCampaignId,
    status: 'PAUSED',
    optimization_goal,
    billing_event,
    targeting: {
      geo_locations: { countries: payload.geoLocations.length ? payload.geoLocations : ['BR'] },
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

  let metaAdSetId: string
  try {
    const res = await withRetry(() => client.post<{ id: string }>(`${accountId}/adsets`, adSetPayload))
    metaAdSetId = res.id
    await log('CREATE_ADSET', 'POST', `${accountId}/adsets`, adSetPayload, res, true)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar conjunto'
    await log('CREATE_ADSET', 'POST', `${accountId}/adsets`, adSetPayload, {}, false, msg)
    throw new Error(`Erro no conjunto: ${msg}`)
  }

  // ── 3. For each creative × each text → 1 ad ───────────────────────────────
  //
  // Media is uploaded ONCE per file (expensive operation).
  // Then we create one creative + one ad per text variation.
  // Names follow the pattern: "v1-feed - Texto 1", "v1-feed - Texto 2", …
  //
  // Example with 3 files and 5 texts → 15 ads in 1 ad set:
  //   v1-feed - Texto 1 … v1-feed - Texto 5
  //   v2-feed - Texto 1 … v2-feed - Texto 5
  //   v3-feed - Texto 1 … v3-feed - Texto 5
  for (const file of payload.files) {
    const baseName = file.originalName.replace(/\.[^/.]+$/, '')

    try {
      validateFileSize(file)

      // Upload media once per file
      let imageHash: string | undefined
      let videoId:   string | undefined

      if (file.type === 'IMAGE') {
        imageHash = await uploadImage(client, accountId, file)
        await log('UPLOAD_IMAGE', 'POST', `${accountId}/adimages`, { file: file.originalName }, { hash: imageHash }, true)
      } else {
        videoId = await uploadVideo(client, accountId, file, baseName)
        await log('UPLOAD_VIDEO', 'POST', `${accountId}/advideos`, { file: file.originalName }, { video_id: videoId }, true)
      }

      // Create one creative + one ad for each text variation
      for (let i = 0; i < bodyTexts.length; i++) {
        const adLabel     = `${baseName} - Texto ${i + 1}`
        const bodyText    = bodyTexts[i]
        const title       = titles[i]       ?? titles[0]       ?? payload.campaignName
        const description = descriptions[i] ?? descriptions[0] ?? ''

        try {
          // Build standard object_story_spec (no asset_feed_spec → no dynamic creative)
          let storySpec: Record<string, unknown>

          if (imageHash) {
            storySpec = {
              page_id: payload.pageId,
              link_data: {
                image_hash: imageHash,
                link:        payload.destinationUrl,
                message:     bodyText,
                name:        title,
                description: description || undefined,
                call_to_action: {
                  type:  payload.callToAction,
                  value: { link: payload.destinationUrl },
                },
              },
            }
          } else {
            storySpec = {
              page_id: payload.pageId,
              video_data: {
                video_id:    videoId,
                title,
                message:     bodyText,
                description: description || undefined,
                call_to_action: {
                  type:  payload.callToAction,
                  value: { link: payload.destinationUrl },
                },
              },
            }
          }

          const creativePayload = {
            name: `Creative - ${adLabel}`,
            object_story_spec: storySpec,
          }
          const creative = await withRetry(() =>
            client.post<{ id: string }>(`${accountId}/adcreatives`, creativePayload),
          )
          await log('CREATE_CREATIVE', 'POST', `${accountId}/adcreatives`, creativePayload, creative, true)

          const adPayload = {
            name:     adLabel,
            adset_id: metaAdSetId,
            creative: { creative_id: creative.id },
            status:   'PAUSED',
          }
          const ad = await withRetry(() =>
            client.post<{ id: string }>(`${accountId}/ads`, adPayload),
          )
          await log('CREATE_AD', 'POST', `${accountId}/ads`, adPayload, ad, true)

          adsCreated++
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Erro desconhecido'
          errors.push(`${adLabel}: ${msg}`)
          await log('CREATE_AD_ERROR', 'POST', `${accountId}/ads`, { label: adLabel }, {}, false, msg)
        }
      }
    } catch (e) {
      // Media upload failed — skip all text variations for this file
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      errors.push(`${baseName}: ${msg}`)
      await log('UPLOAD_ERROR', 'POST', `${accountId}/adimages`, { file: file.originalName }, {}, false, msg)
    }
  }

  return {
    success: errors.length === 0,
    metaCampaignId,
    metaAdSetId,
    adsCreated,
    errors,
  }
}
