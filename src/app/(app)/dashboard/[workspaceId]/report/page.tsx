'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw, Presentation } from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
interface MonthRow {
  month: string; ym: string
  error?: boolean; errorMsg?: string
  spend: number; impressions: number; reach: number; clicks: number
  ctr: number; cpm: number; frequency: number; purchases: number
  leads: number; initiateCheckout: number; revenue: number; roas: number
  cpc: number; costPerLead: number; costPerPurchase: number
  landingPageViews: number; purchaseRate: number; leadRate: number
  costPerInitiateCheckout: number; connectRate: number
}

// ── Formatters ────────────────────────────────────────────────────────────────
const R$ = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const N  = (v: number) => v.toLocaleString('pt-BR')
const P  = (v: number) => `${v.toFixed(2)}%`
const D  = (v: number) => v.toFixed(2)

// ── Metrics ───────────────────────────────────────────────────────────────────
type MetricDef = { key: keyof MonthRow; label: string; fmt: (v: number) => string }

const HERO_METRICS: MetricDef[] = [
  { key: 'spend',    label: 'Valor Investido', fmt: R$ },
  { key: 'revenue',  label: 'Receita',         fmt: R$ },
  { key: 'roas',     label: 'ROAS',            fmt: D  },
  { key: 'purchases',label: 'Compras',         fmt: N  },
  { key: 'leads',    label: 'Leads',           fmt: N  },
]

const ALL_METRICS: MetricDef[] = [
  ...HERO_METRICS,
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

const REST_METRICS = ALL_METRICS.filter(m => !HERO_METRICS.find(h => h.key === m.key))

// ── Sum helper ────────────────────────────────────────────────────────────────
function sumRows(data: MonthRow[]): MonthRow {
  const s: MonthRow = {
    month: 'TOTAL', ym: '', spend: 0, impressions: 0, reach: 0, clicks: 0,
    ctr: 0, cpm: 0, frequency: 0, purchases: 0, leads: 0, initiateCheckout: 0,
    revenue: 0, roas: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0,
    landingPageViews: 0, purchaseRate: 0, leadRate: 0, costPerInitiateCheckout: 0, connectRate: 0,
  }
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
  s.leadRate     = s.landingPageViews > 0 ? (s.leads / s.landingPageViews) * 100 : 0
  s.connectRate  = s.clicks > 0           ? (s.landingPageViews / s.clicks) * 100 : 0
  return s
}

function val(row: MonthRow, m: MetricDef) {
  const v = row[m.key] as number
  return v === 0 ? '—' : m.fmt(v)
}

// ── Screen metric card ────────────────────────────────────────────────────────
function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border flex flex-col gap-1 min-w-0 overflow-hidden
      ${accent ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-surface-700 border-surface-600'}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none truncate">{label}</p>
      <p className={`font-bold tabular-nums leading-none truncate text-sm
        ${accent ? 'text-indigo-200' : 'text-gray-100'}`}>{value}</p>
    </div>
  )
}

// ── Bar row ───────────────────────────────────────────────────────────────────
function BarRow({ label, value, max, fmt }: { label: string; value: number; max: number; fmt: (v: number) => string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs text-gray-400 w-14 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-surface-700 rounded-full h-2.5 overflow-hidden min-w-0">
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300 tabular-nums w-24 text-right shrink-0 truncate">{value > 0 ? fmt(value) : '—'}</span>
    </div>
  )
}

// ── PPT Generator ─────────────────────────────────────────────────────────────
async function generatePPT(wsName: string, data: MonthRow[], total: MonthRow, start: string, end: string) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pres = new PptxGenJS()

  pres.layout  = 'LAYOUT_WIDE' // 13.33" × 7.5"
  pres.title   = `Relatório Meta Ads · ${wsName}`
  pres.subject = `${start} → ${end}`

  // Palette
  const BG     = '0f172a'
  const CARD   = '1e293b'
  const BORDER = '334155'
  const ACC_BG = '312e81'
  const ACC_BD = '4338ca'
  const WHITE  = 'f1f5f9'
  const GRAY   = '64748b'
  const LAVENDER = 'a5b4fc'
  const INDIGO   = '6366f1'

  const W = 13.33, PAD = 0.4
  const USABLE = W - PAD * 2          // 12.53"
  const COLS = 5
  const CARD_W = (USABLE - (COLS - 1) * 0.14) / COLS  // ~2.37"
  const CARD_GAP = 0.14

  function addMetricCard(
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
      fontSize: 6.5, color: accent ? LAVENDER : GRAY,
      fontFace: 'Arial', bold: false,
    })
    slide.addText(value === '—' ? '—' : value, {
      x: x + 0.12, y: y + 0.32, w: w - 0.24, h: h - 0.42,
      fontSize: valSize, color: WHITE,
      fontFace: 'Arial', bold: true,
      shrinkText: true,
    })
  }

  function buildSlide(title: string, subtitle: string, row: MonthRow) {
    const slide = pres.addSlide()
    slide.background = { color: BG }

    // Header
    slide.addText(title, {
      x: PAD, y: 0.18, w: 9.5, h: 0.5,
      fontSize: 26, bold: true, color: WHITE, fontFace: 'Arial',
    })
    slide.addText(subtitle, {
      x: PAD, y: 0.66, w: 9.5, h: 0.24,
      fontSize: 9, color: GRAY, fontFace: 'Arial',
    })
    // Divider
    slide.addShape(pres.ShapeType.rect, {
      x: PAD, y: 1.0, w: USABLE, h: 0.018,
      fill: { color: ACC_BD }, line: { color: ACC_BD, width: 0 },
    })

    // Hero row (5 taller cards)
    const heroH = 1.2
    HERO_METRICS.forEach((m, i) => {
      const x = PAD + i * (CARD_W + CARD_GAP)
      addMetricCard(slide, x, 1.1, CARD_W, heroH, m.label, val(row, m), true, 18)
    })

    // Rest metrics (5 × 3 grid)
    const restStartY = 1.1 + heroH + 0.16
    const restH = 0.82
    REST_METRICS.forEach((m, i) => {
      const col = i % 5
      const rw  = Math.floor(i / 5)
      const x   = PAD + col * (CARD_W + CARD_GAP)
      const y   = restStartY + rw * (restH + 0.1)
      addMetricCard(slide, x, y, CARD_W, restH, m.label, val(row, m), false, 13)
    })

    return slide
  }

  // ── Slide 1: summary ──
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  buildSlide(
    wsName,
    `Resumo do Período · ${start} → ${end} · ${data.length} meses · Gerado em ${now}`,
    total,
  )

  // ── Slides 2+: one per month ──
  for (const row of data) {
    buildSlide(row.month, `${wsName} · Meta Ads`, row)
  }

  await pres.writeFile({ fileName: `relatorio-${wsName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pptx` })
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const currentYM = new Date().toISOString().slice(0, 7)
  const [startMonth,   setStartMonth]   = useState('2025-11')
  const [endMonth,     setEndMonth]     = useState(currentYM)
  const [data,         setData]         = useState<MonthRow[]>([])
  const [loading,      setLoading]      = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [wsName,       setWsName]       = useState('Workspace')
  const [activeMonth,  setActiveMonth]  = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workspaces').then(r => r.json()).then(j => {
      if (j.success) {
        const ws = j.data.find((w: { id: string; name: string }) => w.id === workspaceId)
        if (ws) setWsName(ws.name)
      }
    }).catch(() => {})
  }, [workspaceId])

  const fetchReport = useCallback(async () => {
    setLoading(true); setError(null); setActiveMonth(null)
    try {
      const res  = await fetch(`/api/meta/report?startMonth=${startMonth}&endMonth=${endMonth}&workspaceId=${workspaceId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [startMonth, endMonth, workspaceId])

  useEffect(() => { fetchReport() }, [fetchReport])

  const total    = data.length > 0 ? sumRows(data) : null
  const maxSpend = Math.max(...data.map(r => r.spend), 1)

  const activeRow  = activeMonth ? data.find(r => r.ym === activeMonth) : null
  const displayRow = activeRow ?? total

  async function handleExport() {
    if (!total || data.length === 0) return
    setExporting(true)
    try {
      await generatePPT(wsName, data, total, startMonth, endMonth)
    } catch (e) {
      console.error('PPT error', e)
      setError('Erro ao gerar PPT: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-gray-100 flex h-screen overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-surface-800 border-r border-surface-700 flex flex-col overflow-hidden">

        {/* Controls */}
        <div className="p-3 border-b border-surface-700 space-y-2.5 shrink-0">
          <Link href={`/dashboard/${workspaceId}`}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate font-medium">{wsName}</span>
          </Link>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 w-7 shrink-0">De</label>
              <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)}
                className="flex-1 min-w-0 bg-surface-700 border border-surface-600 text-gray-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 w-7 shrink-0">Até</label>
              <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)}
                className="flex-1 min-w-0 bg-surface-700 border border-surface-600 text-gray-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <button onClick={fetchReport} disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-surface-700 border border-surface-600 text-[10px] text-gray-300 hover:bg-surface-600 disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button onClick={handleExport} disabled={exporting || loading || data.length === 0}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs text-white font-medium transition-colors">
            <Presentation className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Gerando PPT…' : 'Exportar PPT'}
          </button>
        </div>

        {/* Month nav */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button onClick={() => setActiveMonth(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
              ${!activeMonth ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'}`}>
            Resumo Geral
          </button>
          <div className="pt-1.5 border-t border-surface-700 space-y-0.5 mt-1">
            {data.map(row => (
              <button key={row.ym} onClick={() => setActiveMonth(row.ym)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2
                  ${activeMonth === row.ym
                    ? 'bg-indigo-600 text-white font-semibold'
                    : row.error
                      ? 'text-red-400 hover:text-red-300 hover:bg-surface-700'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'}`}>
                <span className="truncate">{row.month}</span>
                {row.error
                  ? <span className="text-[9px] opacity-70 shrink-0">erro</span>
                  : row.spend > 0 && <span className="text-[9px] tabular-nums opacity-60 shrink-0">{R$(row.spend)}</span>}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto min-w-0">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="ml-3 text-gray-400">Buscando dados mês a mês…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
        )}

        {!loading && displayRow && (
          <div className="px-6 py-5">

            {/* Section title */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-100">
                {activeMonth ? displayRow.month : 'Resumo do Período'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeMonth
                  ? 'Desempenho mensal detalhado'
                  : `${data.length} meses · ${startMonth} → ${endMonth}`}
              </p>
            </div>

            {/* Error banner for failed month */}
            {displayRow.error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                Erro ao buscar dados deste mês: {displayRow.errorMsg ?? 'Falha na API da Meta'}
              </div>
            )}

            {/* Hero cards */}
            <div className="grid grid-cols-5 gap-3 mb-4">
              {HERO_METRICS.map(m => (
                <Card key={m.key} label={m.label} value={val(displayRow, m)} accent />
              ))}
            </div>

            {/* Rest metrics */}
            <div className="grid grid-cols-5 gap-2.5 mb-6">
              {REST_METRICS.map(m => (
                <Card key={m.key} label={m.label} value={val(displayRow, m)} />
              ))}
            </div>

            {/* Bar chart — summary only */}
            {!activeMonth && total && (
              <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Investimento por Mês</h3>
                <div className="space-y-2">
                  {data.map(row => (
                    <BarRow key={row.ym} label={row.month} value={row.spend} max={maxSpend} fmt={R$} />
                  ))}
                </div>
              </div>
            )}

            {/* Comparison table — summary only */}
            {!activeMonth && total && (
              <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-surface-700">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Comparativo Mensal</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-700">
                        <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Mês</th>
                        {HERO_METRICS.map(m => (
                          <th key={m.key} className="text-right px-3 py-2.5 text-gray-500 font-medium whitespace-nowrap">{m.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={row.ym} onClick={() => setActiveMonth(row.ym)}
                          className={`border-b border-surface-700/40 cursor-pointer hover:bg-surface-700/40 transition-colors
                            ${i % 2 === 0 ? '' : 'bg-surface-700/20'}
                            ${row.error ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-300">{row.month}</td>
                          {HERO_METRICS.map(m => (
                            <td key={m.key} className="text-right px-3 py-2.5 tabular-nums text-gray-400">{val(row, m)}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-indigo-500/10 border-t border-indigo-500/20">
                        <td className="px-4 py-2.5 font-bold text-indigo-300">TOTAL</td>
                        {HERO_METRICS.map(m => (
                          <td key={m.key} className="text-right px-3 py-2.5 tabular-nums font-semibold text-indigo-200">{val(total, m)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
