'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Printer, ArrowLeft, RefreshCw } from 'lucide-react'
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
  { key: 'spend',    label: 'Valor Investido',  fmt: R$ },
  { key: 'revenue',  label: 'Receita',          fmt: R$ },
  { key: 'roas',     label: 'ROAS',             fmt: D  },
  { key: 'purchases',label: 'Compras',          fmt: N  },
  { key: 'leads',    label: 'Leads',            fmt: N  },
]

const ALL_METRICS: MetricDef[] = [
  ...HERO_METRICS,
  { key: 'costPerPurchase',         label: 'Custo por Compra',    fmt: R$ },
  { key: 'purchaseRate',            label: 'Tx Conv. Compras',    fmt: P  },
  { key: 'costPerLead',             label: 'Custo por Lead',      fmt: R$ },
  { key: 'leadRate',                label: 'Tx Conv. Leads',      fmt: P  },
  { key: 'initiateCheckout',        label: 'Initiate Checkout',   fmt: N  },
  { key: 'costPerInitiateCheckout', label: 'Custo p/ Checkout',   fmt: R$ },
  { key: 'impressions',             label: 'Impressões',          fmt: N  },
  { key: 'reach',                   label: 'Alcance',             fmt: N  },
  { key: 'frequency',               label: 'Frequência',          fmt: D  },
  { key: 'clicks',                  label: 'Cliques',             fmt: N  },
  { key: 'ctr',                     label: 'CTR',                 fmt: P  },
  { key: 'cpm',                     label: 'CPM',                 fmt: R$ },
  { key: 'cpc',                     label: 'CPC',                 fmt: R$ },
  { key: 'landingPageViews',        label: 'LP Views',            fmt: N  },
  { key: 'connectRate',             label: 'Taxa de Conexão',     fmt: P  },
]

const REST_METRICS = ALL_METRICS.filter(m => !HERO_METRICS.find(h => h.key === m.key))

// ── Sum helper ────────────────────────────────────────────────────────────────
function sumRows(data: MonthRow[]): MonthRow {
  const s: MonthRow = { month: 'TOTAL', ym: '', spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, frequency: 0, purchases: 0, leads: 0, initiateCheckout: 0, revenue: 0, roas: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0, landingPageViews: 0, purchaseRate: 0, leadRate: 0, costPerInitiateCheckout: 0, connectRate: 0 }
  for (const r of data) {
    s.spend += r.spend; s.impressions += r.impressions; s.reach += r.reach
    s.clicks += r.clicks; s.purchases += r.purchases; s.leads += r.leads
    s.initiateCheckout += r.initiateCheckout; s.revenue += r.revenue
    s.landingPageViews += r.landingPageViews
  }
  const n = data.length || 1
  s.ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0
  s.cpm = s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0
  s.cpc = s.clicks > 0 ? s.spend / s.clicks : 0
  s.frequency = data.reduce((a, r) => a + r.frequency, 0) / n
  s.roas = s.spend > 0 ? s.revenue / s.spend : 0
  s.costPerPurchase = s.purchases > 0 ? s.spend / s.purchases : 0
  s.costPerLead = s.leads > 0 ? s.spend / s.leads : 0
  s.costPerInitiateCheckout = s.initiateCheckout > 0 ? s.spend / s.initiateCheckout : 0
  s.purchaseRate = s.clicks > 0 ? (s.purchases / s.clicks) * 100 : 0
  s.leadRate = s.clicks > 0 ? (s.leads / s.clicks) * 100 : 0
  s.connectRate = data.reduce((a, r) => a + r.connectRate, 0) / n
  return s
}

function val(row: MonthRow, m: MetricDef) {
  const v = row[m.key] as number
  return v === 0 ? '—' : m.fmt(v)
}

// ── Screen metric card ────────────────────────────────────────────────────────
function ScreenCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border min-w-0 overflow-hidden ${accent ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-surface-700 border-surface-600'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider truncate">{label}</p>
      <p className={`font-bold mt-1 tabular-nums leading-tight overflow-hidden text-ellipsis whitespace-nowrap ${accent ? 'text-indigo-200 text-lg' : 'text-gray-100 text-base'}`}>{value}</p>
    </div>
  )
}

// ── Print metric card ─────────────────────────────────────────────────────────
function PrintCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border min-w-0 overflow-hidden ${accent ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
      <p className="text-gray-500 uppercase tracking-wide leading-tight mb-1" style={{ fontSize: '7pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      <p className={`font-bold tabular-nums leading-none ${accent ? 'text-indigo-700' : 'text-gray-900'}`} style={{ fontSize: '12pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
    </div>
  )
}

// ── Bar chart row ─────────────────────────────────────────────────────────────
function BarRow({ label, value, max, fmt }: { label: string; value: number; max: number; fmt: (v: number) => string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs text-gray-400 w-14 shrink-0 truncate print:text-gray-600">{label}</span>
      <div className="flex-1 bg-surface-700 print:bg-gray-200 rounded-full h-3 overflow-hidden min-w-0">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300 print:text-gray-700 tabular-nums w-28 text-right shrink-0">{value > 0 ? fmt(value) : '—'}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const params      = useParams<{ workspaceId: string }>()
  const workspaceId = params.workspaceId

  const currentYM = new Date().toISOString().slice(0, 7)
  const [startMonth, setStartMonth] = useState('2025-11')
  const [endMonth,   setEndMonth]   = useState(currentYM)
  const [data,       setData]       = useState<MonthRow[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [wsName,     setWsName]     = useState('Workspace')
  const [activeMonth, setActiveMonth] = useState<string | null>(null)

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
  const printDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const activeRow = activeMonth ? data.find(r => r.ym === activeMonth) : null
  const displayRow = activeRow ?? total

  return (
    <>
      <style>{`
        /* ── Print styles ── */
        @media print {
          .no-print  { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0; padding: 0; color: black; }
          .print-page { break-after: page; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
        @page { size: A4 portrait; margin: 12mm 14mm; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════════
          SCREEN VIEW  (hidden on print)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="no-print min-h-screen bg-surface-900 text-gray-100">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="ml-3 text-gray-400">Buscando dados mês a mês...</span>
          </div>
        )}

        {/* Error */}
        {error && <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

        {!loading && total && data.length > 0 && (
          <div className="flex h-screen">

            {/* ── Sidebar: controls + month nav ── */}
            <aside className="w-52 shrink-0 bg-surface-800 border-r border-surface-700 overflow-y-auto flex flex-col">
              {/* Controls */}
              <div className="p-3 border-b border-surface-700 space-y-2">
                <Link href={`/dashboard/${workspaceId}`} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{wsName}</span>
                </Link>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-gray-500 w-6">De</label>
                    <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)}
                      className="flex-1 min-w-0 bg-surface-700 border border-surface-600 text-gray-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-gray-500 w-6">Até</label>
                    <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)}
                      className="flex-1 min-w-0 bg-surface-700 border border-surface-600 text-gray-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={fetchReport} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-surface-700 border border-surface-600 text-[10px] text-gray-300 hover:bg-surface-600 disabled:opacity-50 transition-colors">
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                  <button onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white transition-colors">
                    <Printer className="w-3 h-3" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Month nav */}
              <div className="p-3 space-y-1 flex-1">
                <button
                  onClick={() => setActiveMonth(null)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${!activeMonth ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'}`}>
                  Resumo Geral
                </button>
                <div className="pt-2 border-t border-surface-700">
                  {data.map(row => (
                    <button
                      key={row.ym}
                      onClick={() => setActiveMonth(row.ym)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${activeMonth === row.ym ? 'bg-indigo-600 text-white font-semibold' : row.error ? 'text-red-400 hover:text-red-300 hover:bg-surface-700' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'}`}>
                      <span className="truncate">{row.month}</span>
                      {row.error
                        ? <span className="text-[10px] opacity-70 shrink-0">erro</span>
                        : row.spend > 0 && <span className="text-[10px] tabular-nums opacity-60 shrink-0">{R$(row.spend)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* ── Main content ── */}
            <main className="flex-1 overflow-y-auto px-8 py-6 min-w-0">

              {/* Section header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-100">
                  {displayRow ? (activeMonth ? displayRow.month : 'Resumo do Período') : ''}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {activeMonth ? 'Desempenho mensal detalhado' : `${data.length} meses · ${startMonth} → ${endMonth}`}
                </p>
              </div>

              {/* Error banner for failed month */}
              {displayRow?.error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  Erro ao buscar dados deste mês: {displayRow.errorMsg ?? 'Falha na API da Meta'}
                </div>
              )}

              {displayRow && (
                <>
                  {/* Hero metrics */}
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    {HERO_METRICS.map(m => (
                      <ScreenCard key={m.key} label={m.label} value={val(displayRow, m)} accent />
                    ))}
                  </div>

                  {/* All remaining metrics */}
                  <div className="grid grid-cols-5 gap-3 mb-8">
                    {REST_METRICS.map(m => (
                      <ScreenCard key={m.key} label={m.label} value={val(displayRow, m)} />
                    ))}
                  </div>

                  {/* Bar chart — only on summary */}
                  {!activeMonth && (
                    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-gray-300 mb-4">Investimento por Mês</h3>
                      <div className="space-y-2">
                        {data.map(row => (
                          <BarRow key={row.ym} label={row.month} value={row.spend} max={maxSpend} fmt={R$} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Month comparison table — only on summary */}
                  {!activeMonth && (
                    <div className="mt-6 bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-surface-700">
                        <h3 className="text-sm font-semibold text-gray-300">Comparativo Mensal</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-surface-700">
                              <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Mês</th>
                              {HERO_METRICS.map(m => <th key={m.key} className="text-right px-3 py-2.5 text-gray-500 font-medium whitespace-nowrap">{m.label}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((row, i) => (
                              <tr key={row.ym} onClick={() => setActiveMonth(row.ym)} className={`border-b border-surface-700/40 cursor-pointer hover:bg-surface-700/40 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-700/20'}`}>
                                <td className="px-4 py-2.5 font-medium text-gray-300">{row.month}</td>
                                {HERO_METRICS.map(m => <td key={m.key} className="text-right px-3 py-2.5 tabular-nums text-gray-400">{val(row, m)}</td>)}
                              </tr>
                            ))}
                            <tr className="bg-indigo-500/10 border-t border-indigo-500/20">
                              <td className="px-4 py-2.5 font-bold text-indigo-300">TOTAL</td>
                              {HERO_METRICS.map(m => <td key={m.key} className="text-right px-3 py-2.5 tabular-nums font-semibold text-indigo-200">{val(total, m)}</td>)}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PRINT VIEW  (A4 portrait, shown only when printing)
      ════════════════════════════════════════════════════════════════════════ */}
      {total && data.length > 0 && (
        <div className="print-only" style={{ fontFamily: 'system-ui, sans-serif', color: '#111' }}>

          {/* ── Page 1: Summary ── */}
          <div className="print-page">
            {/* Header */}
            <div style={{ borderBottom: '3px solid #1e1b4b', paddingBottom: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Relatório de Desempenho · Meta Ads</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>{wsName}</div>
              <div style={{ fontSize: 9, color: '#6b7280', display: 'flex', gap: 20 }}>
                <span>Período: <strong style={{ color: '#111' }}>{startMonth} — {endMonth}</strong></span>
                <span>{data.length} meses analisados</span>
                <span>Gerado em {printDate}</span>
              </div>
            </div>

            {/* Big 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total Investido', value: R$(total.spend) },
                { label: 'Total de Receita', value: R$(total.revenue) },
                { label: 'ROAS Acumulado', value: D(total.roas) },
              ].map(c => (
                <div key={c.label} style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 8, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Hero 5 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 12 }}>
              {HERO_METRICS.slice(3).concat(
                REST_METRICS.slice(0, 3)
              ).map(m => (
                <div key={m.key} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', overflow: 'hidden' }}>
                  <div style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val(total, m)}</div>
                </div>
              ))}
            </div>

            {/* All rest */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
              {REST_METRICS.slice(3).map(m => (
                <div key={m.key} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', overflow: 'hidden' }}>
                  <div style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val(total, m)}</div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
              <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Investimento por Mês</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data.map(row => (
                  <div key={row.ym} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 8, color: '#6b7280', width: 28, flexShrink: 0 }}>{row.month}</span>
                    <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 10, overflow: 'hidden', minWidth: 0 }}>
                      <div style={{ width: `${maxSpend > 0 ? (row.spend / maxSpend) * 100 : 0}%`, height: '100%', background: '#6366f1', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 8, color: '#374151', width: 70, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.spend > 0 ? R$(row.spend) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Pages 2+: One per month ── */}
          {data.map(row => (
            <div key={row.ym} className="print-page">
              {/* Month header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #1e1b4b', paddingBottom: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{row.month}</div>
                <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 2 }}>{wsName} · Meta Ads</div>
              </div>

              {/* Hero 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
                {HERO_METRICS.map(m => (
                  <div key={m.key} style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '10px 12px', overflow: 'hidden' }}>
                    <div style={{ fontSize: 7, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val(row, m)}</div>
                  </div>
                ))}
              </div>

              {/* All 15 remaining */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 14 }}>
                {REST_METRICS.map(m => (
                  <div key={m.key} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', overflow: 'hidden' }}>
                    <div style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val(row, m)}</div>
                  </div>
                ))}
              </div>

              {/* Invest vs revenue bar */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
                <div style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Proporção Investimento / Receita</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 10, overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ width: `${row.revenue > 0 ? Math.min(100, (row.spend / row.revenue) * 100) : 0}%`, height: '100%', background: '#6366f1', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 8, color: '#374151', flexShrink: 0 }}>
                    {row.revenue > 0 ? `${((row.spend / row.revenue) * 100).toFixed(1)}% do faturamento` : 'Sem receita registrada'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
