'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Loader2, Clock, CalendarDays } from 'lucide-react'
import type { BreakdownRow } from '@/app/api/meta/breakdown/route'

// ── Metric definitions (same set as dashboard) ─────────────────────────────────
interface MetricDef {
  id:       string
  label:    string
  format:   'currency' | 'percent' | 'number' | 'decimal'
  getValue: (r: BreakdownRow) => number
}

const METRICS: MetricDef[] = [
  { id: 'spend',           label: 'Valor Investido',            format: 'currency', getValue: r => r.spend           },
  { id: 'purchases',       label: 'Compras',                    format: 'number',   getValue: r => r.purchases       },
  { id: 'leads',           label: 'Leads',                      format: 'number',   getValue: r => r.leads           },
  { id: 'revenue',         label: 'Receita',                    format: 'currency', getValue: r => r.revenue         },
  { id: 'roas',            label: 'ROAS',                       format: 'decimal',  getValue: r => r.roas            },
  { id: 'impressions',     label: 'Impressões',                 format: 'number',   getValue: r => r.impressions     },
  { id: 'clicks',          label: 'Cliques',                    format: 'number',   getValue: r => r.clicks          },
  { id: 'ctr',             label: 'CTR',                        format: 'percent',  getValue: r => r.ctr             },
  { id: 'cpm',             label: 'CPM',                        format: 'currency', getValue: r => r.cpm             },
  { id: 'cpc',             label: 'CPC',                        format: 'currency', getValue: r => r.cpc             },
  { id: 'reach',           label: 'Alcance',                    format: 'number',   getValue: r => r.reach           },
  { id: 'costPerLead',     label: 'Custo por Lead',             format: 'currency', getValue: r => r.costPerLead     },
  { id: 'costPerPurchase', label: 'Custo por Compra',           format: 'currency', getValue: r => r.costPerPurchase },
  { id: 'landingPageViews',label: 'Visualiz. Landing Page',     format: 'number',   getValue: r => r.landingPageViews},
  { id: 'initiateCheckout',label: 'Initiate Checkout',          format: 'number',   getValue: r => r.initiateCheckout},
]

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(v: number, format: MetricDef['format']) {
  if (format === 'currency') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (format === 'percent')  return `${v.toFixed(2)}%`
  if (format === 'decimal')  return v.toFixed(2)
  return Math.round(v).toLocaleString('pt-BR')
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  workspaceId: string
  startDate:   string
  endDate:     string
  campaignIds: string[]
}

// ── Heatmap bar ───────────────────────────────────────────────────────────────
function HeatBar({
  row, metric, max, isLast,
}: { row: BreakdownRow; metric: MetricDef; max: number; isLast?: boolean }) {
  const [hover, setHover] = useState(false)
  const value    = metric.getValue(row)
  const pct      = max > 0 ? value / max : 0
  const opacity  = pct < 0.05 && value > 0 ? 0.15 : pct

  return (
    <div
      className="flex flex-col items-center gap-1 relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>

      {/* Tooltip */}
      {hover && (
        <div className={`absolute bottom-full mb-2 z-10 whitespace-nowrap px-2.5 py-1.5 bg-surface-700 border border-surface-600 rounded-lg text-xs shadow-xl ${isLast ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
          <p className="text-gray-400 font-medium">{row.label}</p>
          <p className="text-white font-semibold">{fmt(value, metric.format)}</p>
        </div>
      )}

      {/* Bar */}
      <div className="w-full flex-1 flex items-end">
        <div
          className="w-full rounded-t-sm transition-all duration-200"
          style={{
            height:          `${Math.max(opacity * 100, value > 0 ? 4 : 0)}%`,
            backgroundColor: `rgba(99, 102, 241, ${Math.max(opacity, value > 0 ? 0.12 : 0)})`,
            border:          hover ? '1px solid rgba(99,102,241,0.6)' : '1px solid transparent',
          }}
        />
      </div>

      {/* Label */}
      <span className="text-[9px] text-gray-600 font-medium">{row.label}</span>
    </div>
  )
}

// ── Chart section ─────────────────────────────────────────────────────────────
function Chart({
  data, metric, title, icon: Icon,
}: { data: BreakdownRow[]; metric: MetricDef; title: string; icon: React.ElementType }) {
  const values = data.map(r => metric.getValue(r))
  const max    = Math.max(...values, 0)

  // find top slot
  const topIdx = values.indexOf(max)
  const topRow = data[topIdx]

  // sorted top-3
  const top3 = [...data]
    .sort((a, b) => metric.getValue(b) - metric.getValue(a))
    .slice(0, 3)
    .filter(r => metric.getValue(r) > 0)

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-gray-200">{title}</span>
        </div>
        {topRow && metric.getValue(topRow) > 0 && (
          <div className="text-xs text-gray-500">
            Melhor: <span className="text-indigo-300 font-medium">{topRow.label}</span>
            {' · '}<span className="text-gray-300">{fmt(metric.getValue(topRow), metric.format)}</span>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div
        className="flex gap-0.5 h-28 w-full"
        style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
        {data.map((row, i) => (
          <HeatBar
            key={row.key}
            row={row}
            metric={metric}
            max={max}
            isLast={i >= data.length - 3}
          />
        ))}
      </div>

      {/* Top 3 badges */}
      {top3.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {top3.map((r, i) => (
            <div key={r.key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
              i === 0
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                : 'bg-surface-700 border-surface-600 text-gray-400'
            }`}>
              <span className="font-semibold">{r.label}</span>
              <span className="text-gray-500">·</span>
              <span>{fmt(metric.getValue(r), metric.format)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Metric selector ───────────────────────────────────────────────────────────
function MetricPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = METRICS.find(m => m.id === value) ?? METRICS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-gray-200 hover:border-surface-600 transition-colors">
        <span className="font-medium">{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-30 w-52 bg-surface-800 border border-surface-700 rounded-xl shadow-xl py-1 overflow-hidden">
            {METRICS.map(m => (
              <button
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  m.id === value
                    ? 'text-indigo-300 bg-indigo-500/10'
                    : 'text-gray-300 hover:bg-surface-700'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TimeBreakdown({ workspaceId, startDate, endDate, campaignIds }: Props) {
  const [metricId, setMetricId]   = useState('spend')
  const [hours,    setHours]      = useState<BreakdownRow[]>([])
  const [days,     setDays]       = useState<BreakdownRow[]>([])
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState<string | null>(null)

  const metric = METRICS.find(m => m.id === metricId) ?? METRICS[0]

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null)
    const base = `/api/meta/breakdown?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}`
      + (campaignIds.length ? `&campaignIds=${campaignIds.join(',')}` : '')

    try {
      const [rHours, rDays] = await Promise.all([
        fetch(`${base}&type=hours`).then(r => r.json()),
        fetch(`${base}&type=days`).then(r => r.json()),
      ])
      if (rHours.success) setHours(rHours.data)
      else throw new Error(rHours.error)
      if (rDays.success)  setDays(rDays.data)
      else throw new Error(rDays.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, startDate, endDate, campaignIds])

  useEffect(() => { fetch_() }, [fetch_])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
      <Loader2 className="w-5 h-5 animate-spin" />
      Carregando dados de horários...
    </div>
  )

  if (error) return (
    <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
      {error}
    </div>
  )

  const hasData = hours.some(r => metric.getValue(r) > 0) || days.some(r => metric.getValue(r) > 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Veja em quais horários e dias sua conta gera mais resultado.</p>
        </div>
        <MetricPicker value={metricId} onChange={setMetricId} />
      </div>

      {!hasData ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          Sem dados para o período selecionado
        </div>
      ) : (
        <div className="space-y-4">
          <Chart data={hours} metric={metric} title="Por Hora do Dia" icon={Clock} />
          <Chart data={days}  metric={metric} title="Por Dia da Semana" icon={CalendarDays} />
        </div>
      )}
    </div>
  )
}
