import { BetaAnalyticsDataClient } from '@google-analytics/data'

export interface GA4Params {
  propertyId:     string
  serviceAccount: string   // raw JSON string
  startDate:      string   // YYYY-MM-DD
  endDate:        string
}

export interface GA4Overview {
  sessions:              number
  engagedSessions:       number
  engagementRate:        number   // 0-100
  conversions:           number
  revenue:               number
  avgSessionDuration:    number   // seconds
  sessionConversionRate: number   // 0-100
}

export interface GA4DailyRow {
  date:        string   // YYYY-MM-DD
  sessions:    number
  conversions: number
  revenue:     number
}

export interface GA4ChannelRow {
  channel:         string
  sessions:        number
  engagedSessions: number
  conversions:     number
  revenue:         number
}

export interface GA4LandingPageRow {
  page:            string
  sessions:        number
  engagedSessions: number
  conversions:     number
}

export interface GA4Result {
  overview:     GA4Overview
  daily:        GA4DailyRow[]
  channels:     GA4ChannelRow[]
  landingPages: GA4LandingPageRow[]
}

function makeClient(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson)
  return new BetaAnalyticsDataClient({ credentials })
}

function safeNum(v: string | null | undefined) {
  const n = parseFloat(v ?? '0')
  return isNaN(n) ? 0 : n
}

export async function getGA4Insights(params: GA4Params): Promise<GA4Result> {
  const client    = makeClient(params.serviceAccount)
  const property  = `properties/${params.propertyId.replace('properties/', '')}`
  const dateRange = [{ startDate: params.startDate, endDate: params.endDate }]

  const [overviewResp, dailyResp, channelResp, landingResp] = await Promise.all([
    // ── Overview ─────────────────────────────────────────────────────────────
    client.runReport({
      property,
      dateRanges: dateRange,
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'conversions' },
        { name: 'purchaseRevenue' },
        { name: 'averageSessionDuration' },
        { name: 'sessionConversionRate' },
      ],
    }),

    // ── Daily trend ───────────────────────────────────────────────────────────
    client.runReport({
      property,
      dateRanges: dateRange,
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'conversions' },
        { name: 'purchaseRevenue' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),

    // ── Channels ──────────────────────────────────────────────────────────────
    client.runReport({
      property,
      dateRanges: dateRange,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'conversions' },
        { name: 'purchaseRevenue' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),

    // ── Top landing pages ─────────────────────────────────────────────────────
    client.runReport({
      property,
      dateRanges: dateRange,
      dimensions: [{ name: 'landingPage' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'conversions' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
  ])

  const ov = overviewResp[0].rows?.[0]?.metricValues ?? []
  const overview: GA4Overview = {
    sessions:              safeNum(ov[0]?.value),
    engagedSessions:       safeNum(ov[1]?.value),
    engagementRate:        safeNum(ov[2]?.value) * 100,
    conversions:           safeNum(ov[3]?.value),
    revenue:               safeNum(ov[4]?.value),
    avgSessionDuration:    safeNum(ov[5]?.value),
    sessionConversionRate: safeNum(ov[6]?.value) * 100,
  }

  const daily: GA4DailyRow[] = (dailyResp[0].rows ?? []).map(row => {
    const raw = row.dimensionValues?.[0]?.value ?? ''
    const mv  = row.metricValues ?? []
    const date = raw.length === 8
      ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
      : raw
    return {
      date,
      sessions:    safeNum(mv[0]?.value),
      conversions: safeNum(mv[1]?.value),
      revenue:     safeNum(mv[2]?.value),
    }
  })

  const channels: GA4ChannelRow[] = (channelResp[0].rows ?? []).map(row => {
    const mv = row.metricValues ?? []
    return {
      channel:         row.dimensionValues?.[0]?.value ?? '(other)',
      sessions:        safeNum(mv[0]?.value),
      engagedSessions: safeNum(mv[1]?.value),
      conversions:     safeNum(mv[2]?.value),
      revenue:         safeNum(mv[3]?.value),
    }
  })

  const landingPages: GA4LandingPageRow[] = (landingResp[0].rows ?? []).map(row => {
    const mv = row.metricValues ?? []
    return {
      page:            row.dimensionValues?.[0]?.value ?? '/',
      sessions:        safeNum(mv[0]?.value),
      engagedSessions: safeNum(mv[1]?.value),
      conversions:     safeNum(mv[2]?.value),
    }
  })

  return { overview, daily, channels, landingPages }
}
