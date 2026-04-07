export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { getInsights, aggregateInsights } from '@/services/meta/insights'
import { prisma } from '@/services/db/client'
import PptxGenJS from 'pptxgenjs'

// ── Helpers shared with JSON route ─────────────────────────────────────────────
function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
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

function emptyRow() {
  return {
    spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0,
    frequency: 0, purchases: 0, leads: 0, initiateCheckout: 0,
    revenue: 0, roas: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0,
    landingPageViews: 0, connectRate: 0, purchaseRate: 0, leadRate: 0,
    costPerInitiateCheckout: 0,
  }
}

// ── Formatters ─────────────────────────────────────────────────────────────────
type Row = ReturnType<typeof emptyRow> & { month: string; ym: string; error?: boolean }

const R$ = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const N  = (v: number) => v.toLocaleString('pt-BR')
const P  = (v: number) => `${v.toFixed(2)}%`
const D  = (v: number) => v.toFixed(2)

type MetricDef = { key: keyof Row; label: string; fmt: (v: number) => string }

const HERO_METRICS: MetricDef[] = [
  { key: 'spend',    label: 'Valor Investido', fmt: R$ },
  { key: 'revenue',  label: 'Receita',         fmt: R$ },
  { key: 'roas',     label: 'ROAS',            fmt: D  },
  { key: 'purchases',label: 'Compras',         fmt: N  },
  { key: 'leads',    label: 'Leads',           fmt: N  },
]

const REST_METRICS: MetricDef[] = [
  { key: 'costPerPurchase',         label: 'Custo / Compra',   fmt: R$ },
  { key: 'purchaseRate',            label: 'Conv. Compras',    fmt: P  },
  { key: 'costPerLead',             label: 'Custo / Lead',     fmt: R$ },
  { key: 'leadRate',                label: 'Conv. Leads',      fmt: P  },
  { key: 'initiateCheckout',        label: 'Init. Checkout',   fmt: N  },
  { key: 'costPerInitiateCheckout', label: 'Custo / Checkout', fmt: R$ },
  { key: 'impressions',             label: 'Impressões',       fmt: N  },
  { key: 'reach',                   label: 'Alcance',          fmt: N  },
  { key: 'frequency',               label: 'Frequência',       fmt: D  },
  { key: 'clicks',                  label: 'Cliques',          fmt: N  },
  { key: 'ctr',                     label: 'CTR',              fmt: P  },
  { key: 'cpm',                     label: 'CPM',              fmt: R$ },
  { key: 'cpc',                     label: 'CPC',              fmt: R$ },
  { key: 'landingPageViews',        label: 'LP Views',         fmt: N  },
  { key: 'connectRate',             label: 'Taxa Conexão',     fmt: P  },
]

function val(row: Row, m: MetricDef) {
  const v = row[m.key] as number
  return v === 0 ? '—' : m.fmt(v)
}

function sumRows(data: Row[]): Row {
  const s: Row = { month: 'TOTAL', ym: '', ...emptyRow() }
  for (const r of data) {
    s.spend += r.spend; s.impressions += r.impressions; s.reach += r.reach
    s.clicks += r.clicks; s.purchases += r.purchases; s.leads += r.leads
    s.initiateCheckout += r.initiateCheckout; s.revenue += r.revenue
    s.landingPageViews += r.landingPageViews
  }
  const n = data.length || 1
  s.ctr      = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0
  s.cpm      = s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0
  s.cpc      = s.clicks > 0      ? s.spend / s.clicks : 0
  s.frequency = data.reduce((a, r) => a + r.frequency, 0) / n
  s.roas      = s.spend > 0      ? s.revenue / s.spend : 0
  s.costPerPurchase         = s.purchases > 0       ? s.spend / s.purchases : 0
  s.costPerLead             = s.leads > 0           ? s.spend / s.leads : 0
  s.costPerInitiateCheckout = s.initiateCheckout > 0 ? s.spend / s.initiateCheckout : 0
  s.purchaseRate = s.landingPageViews > 0 ? (s.purchases / s.landingPageViews) * 100 : 0
  s.leadRate     = s.landingPageViews > 0 ? (s.leads     / s.landingPageViews) * 100 : 0
  s.connectRate  = s.clicks > 0           ? (s.landingPageViews / s.clicks) * 100 : 0
  return s
}

// ── PPT builder ────────────────────────────────────────────────────────────────
function buildPPT(wsName: string, data: Row[], total: Row, startMonth: string, endMonth: string): PptxGenJS {
  const pres = new PptxGenJS()
  pres.layout  = 'LAYOUT_WIDE'
  pres.title   = `Relatório Meta Ads · ${wsName}`
  pres.subject = `${startMonth} → ${endMonth}`

  const BG      = '0f172a'
  const CARD    = '1e293b'
  const BORDER  = '334155'
  const ACC_BG  = '312e81'
  const ACC_BD  = '4338ca'
  const WHITE   = 'f1f5f9'
  const GRAY    = '64748b'
  const LAVENDER = 'a5b4fc'

  const W = 13.33, PAD = 0.4
  const USABLE = W - PAD * 2
  const COLS = 5
  const CARD_W = (USABLE - (COLS - 1) * 0.14) / COLS
  const CARD_GAP = 0.14

  function addCard(
    slide: ReturnType<typeof pres.addSlide>,
    x: number, y: number, w: number, h: number,
    label: string, value: string, accent: boolean,
    valSize: number,
  ) {
    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w, h,
      fill: { color: accent ? ACC_BG : CARD },
      line: { color: accent ? ACC_BD : BORDER, width: 0.75 },
      rectRadius: 0.08,
    })
    slide.addText(label.toUpperCase(), {
      x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.22,
      fontSize: 6.5, color: accent ? LAVENDER : GRAY, fontFace: 'Arial',
    })
    slide.addText(value, {
      x: x + 0.12, y: y + 0.32, w: w - 0.24, h: h - 0.42,
      fontSize: valSize, color: WHITE, fontFace: 'Arial', bold: true, shrinkText: true,
    })
  }

  function buildSlide(title: string, subtitle: string, row: Row) {
    const slide = pres.addSlide()
    slide.background = { color: BG }

    slide.addText(title, { x: PAD, y: 0.18, w: 9.5, h: 0.5, fontSize: 26, bold: true, color: WHITE, fontFace: 'Arial' })
    slide.addText(subtitle, { x: PAD, y: 0.66, w: 9.5, h: 0.24, fontSize: 9, color: GRAY, fontFace: 'Arial' })
    slide.addShape(pres.ShapeType.rect, { x: PAD, y: 1.0, w: USABLE, h: 0.018, fill: { color: ACC_BD }, line: { color: ACC_BD, width: 0 } })

    const heroH = 1.2
    HERO_METRICS.forEach((m, i) => {
      const x = PAD + i * (CARD_W + CARD_GAP)
      addCard(slide, x, 1.1, CARD_W, heroH, m.label, val(row, m), true, 18)
    })

    const restStartY = 1.1 + heroH + 0.16
    const restH = 0.82
    REST_METRICS.forEach((m, i) => {
      const col = i % 5
      const rw  = Math.floor(i / 5)
      addCard(slide, PAD + col * (CARD_W + CARD_GAP), restStartY + rw * (restH + 0.1), CARD_W, restH, m.label, val(row, m), false, 13)
    })
  }

  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  buildSlide(wsName, `Resumo do Período · ${startMonth} → ${endMonth} · ${data.length} meses · Gerado em ${now}`, total)
  for (const row of data) buildSlide(row.month, `${wsName} · Meta Ads`, row)

  return pres
}

// ── GET handler ────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const startMonth  = searchParams.get('startMonth')  ?? '2025-11'
  const endMonth    = searchParams.get('endMonth')    ?? new Date().toISOString().slice(0, 7)
  const workspaceId = searchParams.get('workspaceId') ?? 'default'
  const campaignIds = searchParams.get('campaignIds')

  // Get workspace name
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } })
  const wsName = ws?.name ?? 'Workspace'

  // Fetch data month by month
  const months = monthsBetween(startMonth, endMonth)
  const results: Row[] = []

  for (const ym of months) {
    const { start, end } = monthRange(ym)
    const [y, m] = ym.split('-')
    const label = `${MONTH_LABELS[m] ?? m}/${y}`
    let attempt = 0, success = false
    while (attempt < 3 && !success) {
      try {
        if (attempt > 0) await sleep(attempt * 1500)
        const rows = await getInsights({
          startDate: start, endDate: end, workspaceId,
          ...(campaignIds ? { campaignIds: campaignIds.split(',').filter(Boolean) } : {}),
        })
        const agg = aggregateInsights(rows)
        results.push({ month: label, ym, error: false, ...(agg ?? emptyRow()) })
        success = true
      } catch (e) {
        attempt++
        if (attempt >= 3) results.push({ month: label, ym, error: true, ...emptyRow() })
      }
    }
  }

  const total = sumRows(results)
  const pres  = buildPPT(wsName, results, total, startMonth, endMonth)

  const buf = await pres.write({ outputType: 'nodebuffer' }) as unknown as ArrayBuffer
  const filename = `relatorio-${wsName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pptx`

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
