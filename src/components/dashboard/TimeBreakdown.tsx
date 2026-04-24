'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Loader2, Clock, CalendarDays, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { BreakdownRow } from '@/app/api/meta/breakdown/route'

interface MetricDef {
  id:       string
  label:    string
  format:   'currency' | 'percent' | 'number' | 'decimal'
  getValue: (r: BreakdownRow) => number
}

const METRICS: MetricDef[] = [
  { id: 'purchases',       label: 'Compras',                format: 'number',   getValue: r => r.purchases       },
  { id: 'leads',           label: 'Leads',                  format: 'number',   getValue: r => r.leads           },
  { id: 'spend',           label: 'Valor Investido',        format: 'currency', getValue: r => r.spend           },
  { id: 'roas',            label: 'ROAS',                   format: 'decimal',  getValue: r => r.roas            },
  { id: 'revenue',         label: 'Receita',                format: 'currency', getValue: r => r.revenue         },
  { id: 'costPerPurchase', label: 'Custo por Compra',       format: 'currency', getValue: r => r.costPerPurchase },
  { id: 'costPerLead',     label: 'Custo por Lead',         format: 'currency', getValue: r => r.costPerLead     },
  { id: 'ctr',             label: 'CTR',                    format: 'percent',  getValue: r => r.ctr             },
  { id: 'cpm',             label: 'CPM',                    format: 'currency', getValue: r => r.cpm             },
  { id: 'cpc',             label: 'CPC',                    format: 'currency', getValue: r => r.cpc             },
  { id: 'clicks',          label: 'Cliques',                format: 'number',   getValue: r => r.clicks          },
  { id: 'impressions',     label: 'Impressões',             format: 'number',   getValue: r => r.impressions     },
  { id: 'reach',           label: 'Alcance',                format: 'number',   getValue: r => r.reach           },
  { id: 'initiateCheckout',label: 'Initiate Checkout',      format: 'number',   getValue: r => r.initiateCheckout},
  { id: 'landingPageViews',label: 'Visualiz. Landing Page', format: 'number',   getValue: r => r.landingPageViews},
]

function fmt(v: number, format: MetricDef['format']) {
  if (format === 'currency') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (format === 'percent')  return `${v.toFixed(2)}%`
  if (format === 'decimal')  return v.toFixed(2)
  return Math.round(v).toLocaleString('pt-BR')
}

interface Props {
  workspaceId: string
  startDate:   string
  endDate:     string
  campaignIds: string[]
}

// ── Heatmap bar ───────────────────────────────────────────────────────────────
function HeatBar({ row, metric, max, isLast }: { row: BreakdownRow; metric: MetricDef; max: number; isLast?: boolean }) {
  const [hover, setHover] = useState(false)
  const value   = metric.getValue(row)
  const pct     = max > 0 ? value / max : 0
  const opacity = pct < 0.05 && value > 0 ? 0.15 : pct

  return (
    <div
      className="flex flex-col items-center gap-1 relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>

      {hover && (
        <div
          className={`absolute bottom-full mb-2 z-10 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs shadow-xl ${isLast ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
          style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
          <p className="font-medium" style={{ color: 'var(--t-2)' }}>{row.label}</p>
          <p className="font-semibold" style={{ color: 'var(--t-1)' }}>{fmt(value, metric.format)}</p>
        </div>
      )}

      <div className="w-full flex-1 flex items-end">
        <div
          className="w-full rounded-t-sm transition-all duration-200"
          style={{
            height:          `${Math.max(opacity * 100, value > 0 ? 4 : 0)}%`,
            backgroundColor: `rgba(249, 115, 22, ${Math.max(opacity, value > 0 ? 0.12 : 0)})`,
            border:          hover ? '1px solid rgba(249,115,22,0.6)' : '1px solid transparent',
          }}
        />
      </div>

      <span className="text-[9px] font-medium" style={{ color: 'var(--t-3)' }}>{row.label}</span>
    </div>
  )
}

// ── Chart section ─────────────────────────────────────────────────────────────
function Chart({ data, metric, title, icon: Icon }: { data: BreakdownRow[]; metric: MetricDef; title: string; icon: React.ElementType }) {
  const values = data.map(r => metric.getValue(r))
  const max    = Math.max(...values, 0)
  const top3   = [...data]
    .sort((a, b) => metric.getValue(b) - metric.getValue(a))
    .slice(0, 3)
    .filter(r => metric.getValue(r) > 0)

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)' }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: '#f97316' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--t-1)' }}>{title}</span>
      </div>

      <div className="flex gap-0.5 h-28 w-full">
        {data.map((row, i) => (
          <HeatBar key={row.key} row={row} metric={metric} max={max} isLast={i >= data.length - 3} />
        ))}
      </div>

      {top3.length > 0 && (
        <div>
          <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--t-3)' }}>
            Melhores {title === 'Por Hora do Dia' ? 'horários' : 'dias'} por {metric.label.toLowerCase()}
          </p>
          <div className="flex gap-2 flex-wrap">
            {top3.map((r, i) => (
              <div
                key={r.key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                style={i === 0
                  ? { background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316' }
                  : { background: 'var(--s-800)',         border: '1px solid var(--t-border)',      color: 'var(--t-2)' }
                }>
                <span style={{ color: 'var(--t-3)' }} className="tabular-nums">{i + 1}°</span>
                <span className="font-semibold">{r.label}</span>
                <span style={{ color: 'var(--t-3)' }}>·</span>
                <span>{fmt(metric.getValue(r), metric.format)}</span>
              </div>
            ))}
          </div>
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
        style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)', color: 'var(--t-1)' }}>
        <span className="font-medium">{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--t-3)' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-30 w-52 rounded-xl shadow-xl py-1 overflow-hidden"
            style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)' }}>
            {METRICS.map(m => (
              <button
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{
                  color:      m.id === value ? '#f97316'      : 'var(--t-1)',
                  background: m.id === value ? 'rgba(249,115,22,0.08)' : 'transparent',
                }}
                onMouseEnter={e => { if (m.id !== value) e.currentTarget.style.background = 'var(--s-800)' }}
                onMouseLeave={e => { if (m.id !== value) e.currentTarget.style.background = 'transparent' }}>
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── XLSX export ───────────────────────────────────────────────────────────────
const EXPORT_COLS = [
  { key: 'label',            header: 'Período'                },
  { key: 'spend',            header: 'Investido (R$)'         },
  { key: 'revenue',          header: 'Receita (R$)'           },
  { key: 'roas',             header: 'ROAS'                   },
  { key: 'purchases',        header: 'Compras'                },
  { key: 'leads',            header: 'Leads'                  },
  { key: 'initiateCheckout', header: 'Init. Checkout'         },
  { key: 'impressions',      header: 'Impressões'             },
  { key: 'reach',            header: 'Alcance'                },
  { key: 'clicks',           header: 'Cliques'                },
  { key: 'ctr',              header: 'CTR (%)'                },
  { key: 'cpm',              header: 'CPM (R$)'               },
  { key: 'cpc',              header: 'CPC (R$)'               },
  { key: 'costPerLead',      header: 'Custo/Lead (R$)'        },
  { key: 'costPerPurchase',  header: 'Custo/Compra (R$)'      },
  { key: 'landingPageViews', header: 'Visualiz. Landing Page' },
] as const

function exportBreakdownXLSX(hours: BreakdownRow[], days: BreakdownRow[], startDate: string, endDate: string) {
  const wb  = XLSX.utils.book_new()
  const toRows = (rows: BreakdownRow[]) => rows.map(r =>
    EXPORT_COLS.reduce<Record<string, string | number>>((acc, col) => {
      acc[col.header] = r[col.key as keyof BreakdownRow] as string | number
      return acc
    }, {})
  )
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(hours)), 'Por Hora do Dia')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(days)),  'Por Dia da Semana')
  XLSX.writeFile(wb, `horarios_dias_${startDate}_${endDate}.xlsx`)
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TimeBreakdown({ workspaceId, startDate, endDate, campaignIds }: Props) {
  const [metricId, setMetricId] = useState('purchases')
  const [hours,    setHours]    = useState<BreakdownRow[]>([])
  const [days,     setDays]     = useState<BreakdownRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

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
      if (rHours.success) setHours(rHours.data); else throw new Error(rHours.error)
      if (rDays.success)  setDays(rDays.data);   else throw new Error(rDays.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, startDate, endDate, campaignIds])

  useEffect(() => { fetch_() }, [fetch_])

  const hasData = hours.some(r => metric.getValue(r) > 0) || days.some(r => metric.getValue(r) > 0)

  return (
    <div className="space-y-4">
      {/* Header — sempre visível */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--t-1)' }}>Desempenho por Horário e Dia da Semana</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--t-3)' }}>Em quais horários e dias sua conta gera mais resultado</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--t-3)' }}>Métrica:</span>
          <MetricPicker value={metricId} onChange={setMetricId} />
          <button
            onClick={() => exportBreakdownXLSX(hours, days, startDate, endDate)}
            disabled={loading || (!hours.length && !days.length)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)', color: 'var(--t-2)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f97316'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--t-2)'; e.currentTarget.style.borderColor = 'var(--t-border)' }}>
            <Download className="w-3.5 h-3.5" />
            Exportar XLSX
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: 'var(--t-3)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando dados de horários...
        </div>
      ) : error ? (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-500">
          {error}
        </div>
      ) : !hasData ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--t-3)' }}>
          Sem dados para o período selecionado
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Chart data={hours} metric={metric} title="Por Hora do Dia"    icon={Clock}        />
          <Chart data={days}  metric={metric} title="Por Dia da Semana"  icon={CalendarDays} />
        </div>
      )}
    </div>
  )
}
