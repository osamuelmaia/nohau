'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Printer, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
interface MonthRow {
  month:                   string
  ym:                      string
  spend:                   number
  impressions:             number
  reach:                   number
  clicks:                  number
  ctr:                     number
  cpm:                     number
  frequency:               number
  purchases:               number
  leads:                   number
  initiateCheckout:        number
  revenue:                 number
  roas:                    number
  cpc:                     number
  costPerLead:             number
  costPerPurchase:         number
  landingPageViews:        number
  purchaseRate:            number
  leadRate:                number
  costPerInitiateCheckout: number
  connectRate:             number
}

// ── Formatters ────────────────────────────────────────────────────────────────
const R$ = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const N  = (v: number) => v.toLocaleString('pt-BR')
const P  = (v: number) => `${v.toFixed(2)}%`
const D  = (v: number) => v.toFixed(2)

// ── All metrics definition ─────────────────────────────────────────────────
const METRICS: { key: keyof MonthRow; label: string; fmt: (v: number) => string; hero?: boolean }[] = [
  { key: 'spend',                   label: 'Valor Investido',        fmt: R$, hero: true  },
  { key: 'revenue',                 label: 'Receita',                fmt: R$, hero: true  },
  { key: 'roas',                    label: 'ROAS',                   fmt: D,  hero: true  },
  { key: 'purchases',               label: 'Compras',                fmt: N,  hero: true  },
  { key: 'costPerPurchase',         label: 'Custo por Compra',       fmt: R$              },
  { key: 'purchaseRate',            label: 'Taxa Conv. Compras',     fmt: P               },
  { key: 'leads',                   label: 'Leads',                  fmt: N,  hero: true  },
  { key: 'costPerLead',             label: 'Custo por Lead',         fmt: R$              },
  { key: 'leadRate',                label: 'Taxa Conv. Leads',       fmt: P               },
  { key: 'initiateCheckout',        label: 'Initiate Checkout',      fmt: N               },
  { key: 'costPerInitiateCheckout', label: 'Custo por Checkout',     fmt: R$              },
  { key: 'impressions',             label: 'Impressões',             fmt: N               },
  { key: 'reach',                   label: 'Alcance',                fmt: N               },
  { key: 'frequency',               label: 'Frequência',             fmt: D               },
  { key: 'clicks',                  label: 'Cliques',                fmt: N               },
  { key: 'ctr',                     label: 'CTR',                    fmt: P               },
  { key: 'cpm',                     label: 'CPM',                    fmt: R$              },
  { key: 'cpc',                     label: 'CPC',                    fmt: R$              },
  { key: 'landingPageViews',        label: 'LP Views',               fmt: N               },
  { key: 'connectRate',             label: 'Taxa de Conexão',        fmt: P               },
]

// ── Sum rows ─────────────────────────────────────────────────────────────────
function sumRows(data: MonthRow[]): MonthRow {
  const s: MonthRow = { month: 'TOTAL', ym: '', spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, frequency: 0, purchases: 0, leads: 0, initiateCheckout: 0, revenue: 0, roas: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0, landingPageViews: 0, purchaseRate: 0, leadRate: 0, costPerInitiateCheckout: 0, connectRate: 0 }
  for (const r of data) {
    s.spend            += r.spend
    s.impressions      += r.impressions
    s.reach            += r.reach
    s.clicks           += r.clicks
    s.purchases        += r.purchases
    s.leads            += r.leads
    s.initiateCheckout += r.initiateCheckout
    s.revenue          += r.revenue
    s.landingPageViews += r.landingPageViews
  }
  s.ctr             = s.impressions > 0 ? (s.clicks      / s.impressions) * 100  : 0
  s.cpm             = s.impressions > 0 ? (s.spend       / s.impressions) * 1000 : 0
  s.cpc             = s.clicks      > 0 ?  s.spend       / s.clicks              : 0
  s.frequency       = data.length   > 0 ? data.reduce((a, r) => a + r.frequency, 0) / data.length : 0
  s.roas            = s.spend       > 0 ?  s.revenue     / s.spend               : 0
  s.costPerPurchase = s.purchases   > 0 ?  s.spend       / s.purchases           : 0
  s.costPerLead     = s.leads       > 0 ?  s.spend       / s.leads               : 0
  s.costPerInitiateCheckout = s.initiateCheckout > 0 ? s.spend / s.initiateCheckout : 0
  s.purchaseRate    = s.clicks      > 0 ? (s.purchases   / s.clicks)  * 100       : 0
  s.leadRate        = s.clicks      > 0 ? (s.leads       / s.clicks)  * 100       : 0
  s.connectRate     = data.length   > 0 ? data.reduce((a, r) => a + r.connectRate, 0) / data.length : 0
  return s
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 print:border-gray-300 bg-white p-3 ${large ? 'col-span-1' : ''}`}>
      <p className="text-[9pt] text-gray-500 uppercase tracking-wider font-medium leading-tight">{label}</p>
      <p className={`font-bold text-gray-900 mt-1 leading-none tabular-nums ${large ? 'text-[18pt]' : 'text-[13pt]'}`}>{value}</p>
    </div>
  )
}

// ── Month page ─────────────────────────────────────────────────────────────
function MonthPage({ row, isLast }: { row: MonthRow; isLast: boolean }) {
  return (
    <div className={`report-page bg-white text-gray-900 px-10 py-8 ${isLast ? '' : 'page-break'}`}>
      {/* Month header */}
      <div className="flex items-baseline justify-between border-b-2 border-gray-800 pb-2 mb-5">
        <h2 className="text-[18pt] font-bold text-gray-900">{row.month}</h2>
        <span className="text-[9pt] text-gray-500 uppercase tracking-widest">Meta Ads · Desempenho Mensal</span>
      </div>

      {/* Hero row — top 5 most important */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {METRICS.filter(m => m.hero).map(m => (
          <MetricCard key={m.key} label={m.label} value={(row[m.key] as number) === 0 ? '—' : m.fmt(row[m.key] as number)} large />
        ))}
      </div>

      {/* All remaining metrics */}
      <div className="grid grid-cols-5 gap-3">
        {METRICS.filter(m => !m.hero).map(m => (
          <MetricCard key={m.key} label={m.label} value={(row[m.key] as number) === 0 ? '—' : m.fmt(row[m.key] as number)} />
        ))}
      </div>

      {/* Spend bar relative indicator */}
      <div className="mt-5 pt-3 border-t border-gray-200">
        <p className="text-[8pt] text-gray-400 uppercase tracking-wider">Proporção investimento / receita</p>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: row.revenue > 0 ? `${Math.min(100, (row.spend / row.revenue) * 100)}%` : '0%' }}
            />
          </div>
          <span className="text-[9pt] text-gray-600 tabular-nums whitespace-nowrap">
            {row.revenue > 0 ? `${((row.spend / row.revenue) * 100).toFixed(1)}% do faturamento` : 'Sem receita registrada'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Cover / Summary page ────────────────────────────────────────────────────
function SummaryPage({ total, data, wsName, startMonth, endMonth }: {
  total: MonthRow; data: MonthRow[]; wsName: string; startMonth: string; endMonth: string
}) {
  const printDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const maxSpend  = Math.max(...data.map(r => r.spend), 1)

  return (
    <div className="report-page page-break bg-white text-gray-900 px-10 py-8">
      {/* Header */}
      <div className="border-b-4 border-gray-900 pb-4 mb-6">
        <p className="text-[9pt] text-gray-500 uppercase tracking-widest mb-1">Relatório de Desempenho · Meta Ads</p>
        <h1 className="text-[28pt] font-bold text-gray-900 leading-none">{wsName}</h1>
        <div className="flex items-center gap-6 mt-2 text-[10pt] text-gray-500">
          <span>Período: <strong className="text-gray-800">{startMonth} — {endMonth}</strong></span>
          <span>{data.length} meses analisados</span>
          <span>Gerado em {printDate}</span>
        </div>
      </div>

      {/* Hero metrics — investment + revenue + ROAS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Investido',   value: R$(total.spend)    },
          { label: 'Total de Receita',  value: R$(total.revenue)  },
          { label: 'ROAS Acumulado',    value: D(total.roas)      },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
            <p className="text-[9pt] text-gray-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-[24pt] font-bold text-gray-900 mt-1 leading-none tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {/* All metrics grid */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {METRICS.filter(m => !m.hero).map(m => (
          <MetricCard key={m.key} label={m.label} value={(total[m.key] as number) === 0 ? '—' : m.fmt(total[m.key] as number)} />
        ))}
        {METRICS.filter(m => m.hero && m.key !== 'spend' && m.key !== 'revenue' && m.key !== 'roas').map(m => (
          <MetricCard key={m.key} label={m.label} value={(total[m.key] as number) === 0 ? '—' : m.fmt(total[m.key] as number)} />
        ))}
      </div>

      {/* Monthly spend bar chart */}
      <div className="border-t border-gray-200 pt-4">
        <p className="text-[9pt] text-gray-500 uppercase tracking-wider mb-3">Investimento por Mês</p>
        <div className="space-y-1.5">
          {data.map(row => (
            <div key={row.ym} className="flex items-center gap-3">
              <span className="text-[9pt] text-gray-600 w-16 shrink-0">{row.month}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full flex items-center px-2"
                  style={{ width: `${(row.spend / maxSpend) * 100}%`, minWidth: row.spend > 0 ? '2%' : '0' }}>
                </div>
              </div>
              <span className="text-[9pt] text-gray-700 tabular-nums w-24 text-right shrink-0">
                {row.spend > 0 ? R$(row.spend) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    fetch('/api/workspaces').then(r => r.json()).then(j => {
      if (j.success) {
        const ws = j.data.find((w: { id: string; name: string }) => w.id === workspaceId)
        if (ws) setWsName(ws.name)
      }
    }).catch(() => {})
  }, [workspaceId])

  const fetchReport = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/meta/report?startMonth=${startMonth}&endMonth=${endMonth}&workspaceId=${workspaceId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }, [startMonth, endMonth, workspaceId])

  useEffect(() => { fetchReport() }, [fetchReport])

  const total = data.length > 0 ? sumRows(data) : null

  return (
    <>
      <style>{`
        .page-break { page-break-after: always; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .report-page { box-shadow: none !important; border: none !important; }
        }
        @page { size: A4 portrait; margin: 0; }
      `}</style>

      {/* ── Toolbar (screen only) ── */}
      <div className="no-print sticky top-0 z-10 bg-surface-800 border-b border-surface-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/${workspaceId}`} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-medium text-gray-200">Relatório Mensal · {wsName}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-500">De</label>
            <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)}
              className="bg-surface-700 border border-surface-600 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <label className="text-gray-500">até</label>
            <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)}
              className="bg-surface-700 border border-surface-600 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <button onClick={fetchReport} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-xs text-gray-300 hover:bg-surface-600 disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors">
            <Printer className="w-3.5 h-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="no-print flex items-center justify-center py-24">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="ml-3 text-gray-400 text-sm">Buscando {startMonth} → {endMonth}...</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="no-print m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Report pages ── */}
      {!loading && total && data.length > 0 && (
        <div className="bg-gray-200 print:bg-white py-6 print:py-0 space-y-6 print:space-y-0">
          {/* Page 1 — overall summary */}
          <div className="mx-auto shadow-xl print:shadow-none" style={{ width: '210mm', minHeight: '297mm' }}>
            <SummaryPage total={total} data={data} wsName={wsName} startMonth={startMonth} endMonth={endMonth} />
          </div>

          {/* Pages 2+ — one per month */}
          {data.map((row, i) => (
            <div key={row.ym} className="mx-auto shadow-xl print:shadow-none" style={{ width: '210mm', minHeight: '297mm' }}>
              <MonthPage row={row} isLast={i === data.length - 1} />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="no-print text-center py-24 text-gray-500 text-sm">
          Nenhum dado para o período selecionado.
        </div>
      )}
    </>
  )
}
