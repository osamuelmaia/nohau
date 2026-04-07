'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Printer, Download, ArrowLeft, RefreshCw } from 'lucide-react'
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
}

// ── Formatters ────────────────────────────────────────────────────────────────
const R$ = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const N  = (v: number) => v.toLocaleString('pt-BR')
const P  = (v: number) => `${v.toFixed(2)}%`
const D  = (v: number) => v.toFixed(2)

// ── Columns config ─────────────────────────────────────────────────────────────
const COLS: { key: keyof MonthRow; label: string; fmt: (v: number) => string; total: boolean }[] = [
  { key: 'spend',                   label: 'Investido',        fmt: R$, total: true  },
  { key: 'impressions',             label: 'Impressões',       fmt: N,  total: true  },
  { key: 'reach',                   label: 'Alcance',          fmt: N,  total: true  },
  { key: 'clicks',                  label: 'Cliques',          fmt: N,  total: true  },
  { key: 'ctr',                     label: 'CTR',              fmt: P,  total: false },
  { key: 'cpm',                     label: 'CPM',              fmt: R$, total: false },
  { key: 'cpc',                     label: 'CPC',              fmt: R$, total: false },
  { key: 'frequency',               label: 'Freq.',            fmt: D,  total: false },
  { key: 'purchases',               label: 'Compras',          fmt: N,  total: true  },
  { key: 'costPerPurchase',         label: 'CPP',              fmt: R$, total: false },
  { key: 'revenue',                 label: 'Receita',          fmt: R$, total: true  },
  { key: 'roas',                    label: 'ROAS',             fmt: D,  total: false },
  { key: 'leads',                   label: 'Leads',            fmt: N,  total: true  },
  { key: 'costPerLead',             label: 'CPL',              fmt: R$, total: false },
  { key: 'initiateCheckout',        label: 'Checkouts',        fmt: N,  total: true  },
  { key: 'landingPageViews',        label: 'LP Views',         fmt: N,  total: true  },
]

function sumRow(data: MonthRow[]): MonthRow {
  const s = { month: 'TOTAL', ym: '', spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, frequency: 0, purchases: 0, leads: 0, initiateCheckout: 0, revenue: 0, roas: 0, cpc: 0, costPerLead: 0, costPerPurchase: 0, landingPageViews: 0, purchaseRate: 0, leadRate: 0, costPerInitiateCheckout: 0 }
  for (const r of data) {
    s.spend           += r.spend
    s.impressions     += r.impressions
    s.reach           += r.reach
    s.clicks          += r.clicks
    s.purchases       += r.purchases
    s.leads           += r.leads
    s.initiateCheckout+= r.initiateCheckout
    s.revenue         += r.revenue
    s.landingPageViews+= r.landingPageViews
  }
  // Derived averages
  s.ctr             = s.impressions > 0 ? (s.clicks      / s.impressions) * 100 : 0
  s.cpm             = s.impressions > 0 ? (s.spend       / s.impressions) * 1000 : 0
  s.cpc             = s.clicks      > 0 ?  s.spend       / s.clicks            : 0
  s.frequency       = data.reduce((acc, r) => acc + r.frequency, 0) / (data.length || 1)
  s.roas            = s.spend       > 0 ?  s.revenue     / s.spend             : 0
  s.costPerPurchase = s.purchases   > 0 ?  s.spend       / s.purchases         : 0
  s.costPerLead     = s.leads       > 0 ?  s.spend       / s.leads             : 0
  s.costPerInitiateCheckout = s.initiateCheckout > 0 ? s.spend / s.initiateCheckout : 0
  s.purchaseRate    = s.clicks      > 0 ? (s.purchases   / s.clicks) * 100      : 0
  s.leadRate        = s.clicks      > 0 ? (s.leads       / s.clicks) * 100      : 0
  return s
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const params      = useParams<{ workspaceId: string }>()
  const workspaceId = params.workspaceId

  const currentYM   = new Date().toISOString().slice(0, 7)
  const [startMonth, setStartMonth] = useState('2025-11')
  const [endMonth,   setEndMonth]   = useState(currentYM)
  const [data,       setData]       = useState<MonthRow[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [wsName,     setWsName]     = useState('Workspace')

  // Load workspace name
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

  const total = data.length > 0 ? sumRow(data) : null

  const printDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { padding: 0 !important; }
          table { font-size: 9pt !important; }
          th, td { padding: 4px 6px !important; }
          .total-row td { font-weight: bold; background: #f0f0f0 !important; color: black !important; }
        }
        @page { size: A4 landscape; margin: 12mm; }
      `}</style>

      <div className="min-h-screen bg-surface-900 text-gray-100 print-page">

        {/* ── Toolbar (hidden on print) ── */}
        <div className="no-print sticky top-0 z-10 bg-surface-800 border-b border-surface-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${workspaceId}`} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-sm font-medium text-gray-200">Relatório Mensal</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range */}
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

        {/* ── Report content ── */}
        <div className="px-6 py-6 max-w-[1400px] mx-auto">

          {/* Header */}
          <div className="mb-6 print:mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white print:text-black">{wsName}</h1>
                <p className="text-sm text-gray-400 print:text-gray-600 mt-1">
                  Relatório de Desempenho Mensal — Meta Ads
                </p>
                <p className="text-xs text-gray-500 print:text-gray-500 mt-0.5">
                  Período: {startMonth} até {endMonth} · Gerado em {printDate}
                </p>
              </div>
              <div className="no-print text-xs text-gray-600">
                {data.length} meses
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="flex items-center justify-center py-20 no-print">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="ml-3 text-gray-400">Buscando dados mês a mês...</span>
            </div>
          )}

          {/* Table */}
          {!loading && data.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-surface-700 print:border-gray-300">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-800 print:bg-gray-100">
                    <th className="sticky left-0 bg-surface-800 print:bg-gray-100 text-left px-4 py-3 text-gray-400 print:text-gray-600 font-semibold uppercase tracking-wider text-[10px] border-b border-surface-700 print:border-gray-300 whitespace-nowrap">
                      Mês
                    </th>
                    {COLS.map(c => (
                      <th key={c.key} className="text-right px-3 py-3 text-gray-400 print:text-gray-600 font-semibold uppercase tracking-wider text-[10px] border-b border-surface-700 print:border-gray-300 whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={row.ym} className={`border-b border-surface-700/50 print:border-gray-200 transition-colors hover:bg-surface-700/30 ${i % 2 === 0 ? '' : 'bg-surface-800/30'}`}>
                      <td className="sticky left-0 bg-inherit px-4 py-2.5 font-semibold text-gray-200 print:text-black whitespace-nowrap">
                        {row.month}
                      </td>
                      {COLS.map(c => {
                        const v = row[c.key] as number
                        return (
                          <td key={c.key} className={`text-right px-3 py-2.5 tabular-nums ${v === 0 ? 'text-gray-600 print:text-gray-400' : 'text-gray-300 print:text-black'}`}>
                            {v === 0 ? '—' : c.fmt(v)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {/* Total row */}
                  {total && (
                    <tr className="total-row bg-indigo-500/10 print:bg-gray-100 border-t-2 border-indigo-500/30 print:border-gray-400">
                      <td className="px-4 py-3 font-bold text-indigo-300 print:text-black whitespace-nowrap">
                        TOTAL
                      </td>
                      {COLS.map(c => {
                        const v = total[c.key] as number
                        return (
                          <td key={c.key} className="text-right px-3 py-3 font-bold tabular-nums text-indigo-200 print:text-black">
                            {c.fmt(v)}
                          </td>
                        )
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary cards (for print) */}
          {!loading && total && (
            <div className="mt-6 grid grid-cols-4 gap-4 print:grid-cols-4">
              {[
                { label: 'Total Investido',  value: R$(total.spend),     sub: `${data.length} meses` },
                { label: 'Total Compras',    value: N(total.purchases),  sub: `CPP: ${R$(total.costPerPurchase)}` },
                { label: 'Total Leads',      value: N(total.leads),      sub: `CPL: ${R$(total.costPerLead)}` },
                { label: 'ROAS Médio',       value: D(total.roas),       sub: `Receita: ${R$(total.revenue)}` },
              ].map(card => (
                <div key={card.label} className="rounded-xl bg-surface-800 print:bg-gray-50 border border-surface-700 print:border-gray-300 p-4">
                  <p className="text-xs text-gray-500 print:text-gray-600 uppercase tracking-wider">{card.label}</p>
                  <p className="text-xl font-bold text-white print:text-black mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 print:text-gray-600 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>
          )}

          {!loading && data.length === 0 && !error && (
            <div className="text-center py-20 text-gray-500">
              Nenhum dado encontrado para o período selecionado.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
