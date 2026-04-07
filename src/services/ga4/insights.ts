import { BetaAnalyticsDataClient } from '@google-analytics/data'

export interface GA4Params {
  propertyId:     string
  serviceAccount: string   // raw JSON string
  startDate:      string   // YYYY-MM-DD
  endDate:        string
}

export interface GA4Overview {
  sessions:               number
  users:                  number
  newUsers:               number
  pageViews:              number
  conversions:            number
  revenue:                number
  bounceRate:             number
  avgSessionDuration:     number   // seconds
  sessionConversionRate:  number   // %
}

export interface GA4DailyRow {
  date:                  string   // YYYY-MM-DD
  sessions:              number
  users:                 number
  conversions:           number
  revenue:               number
}

export interface GA4ChannelRow {
  channel:     string
  sessions:    number
  users:       number
  conversions: number
  revenue:     number
}

export interface GA4Result {
  overview: GA4Overview
  daily:    GA4DailyRow[]
  channels: GA4ChannelRow[]
}

function makeClient(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson)
  return new BetaAnalyticsDataClient({ credentials })
}

function safeNum(v: string | undefined) {
  const n = parseFloat(v ?? '0')
  return isNaN(n) ? 0 : n
}

export async function getGA4Insights(params: GA4Params): Promise<GA4Result> {
  const client     = makeClient(params.serviceAccount)
  const property   = `properties/${params.propertyId.replace('properties/', '')}`
  const dateRange  = [{ startDate: params.startDate, endDate: params.endDate }]

  // ── Overview ──────────────────────────────────────────────────────────────
  const [overviewResp] = await client.runReport({
    property,
    dateRanges: dateRange,
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'conversions' },
      { name: 'purchaseRevenue' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'sessionConversionRate' },
    ],
  })

  const ov = overviewResp.rows?.[0]?.metricValues ?? []
  const overview: GA4Overview = {
    sessions:              safeNum(ov[0]?.value),
    users:                 safeNum(ov[1]?.value),
    newUsers:              safeNum(ov[2]?.value),
    pageViews:             safeNum(ov[3]?.value),
    conversions:           safeNum(ov[4]?.value),
    revenue:               safeNum(ov[5]?.value),
    bounceRate:            safeNum(ov[6]?.value) * 100,
    avgSessionDuration:    safeNum(ov[7]?.value),
    sessionConversionRate: safeNum(ov[8]?.value) * 100,
  }

  // ── Daily ────────────────────────────────────────────────────────────────
  const [dailyResp] = await client.runReport({
    property,
    dateRanges: dateRange,
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'conversions' },
      { name: 'purchaseRevenue' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  })

  const daily: GA4DailyRow[] = (dailyResp.rows ?? []).map(row => {
    const rawDate = row.dimensionValues?.[0]?.value ?? ''
    const mv      = row.metricValues ?? []
    // GA4 date format: YYYYMMDD → YYYY-MM-DD
    const date = rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : rawDate
    return {
      date,
      sessions:    safeNum(mv[0]?.value),
      users:       safeNum(mv[1]?.value),
      conversions: safeNum(mv[2]?.value),
      revenue:     safeNum(mv[3]?.value),
    }
  })

  // ── Channels ────────────────────────────────────────────────────────────
  const [channelResp] = await client.runReport({
    property,
    dateRanges: dateRange,
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'conversions' },
      { name: 'purchaseRevenue' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  })

  const channels: GA4ChannelRow[] = (channelResp.rows ?? []).map(row => {
    const mv = row.metricValues ?? []
    return {
      channel:     row.dimensionValues?.[0]?.value ?? '(other)',
      sessions:    safeNum(mv[0]?.value),
      users:       safeNum(mv[1]?.value),
      conversions: safeNum(mv[2]?.value),
      revenue:     safeNum(mv[3]?.value),
    }
  })

  return { overview, daily, channels }
}
