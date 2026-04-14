'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DollarSign, ShoppingCart, TrendingUp, Users, Target,
  BarChart2, MousePointerClick, RefreshCw, Eye, Activity,
  ChevronDown, Check, Loader2, GripVertical,
  Plus, X, ArrowUpDown, ArrowUp, ArrowDown, LayoutDashboard,
  TableProperties, AlertCircle, Settings2, Search,
  AlertTriangle, Download, TrendingDown, Minus, Clock, BarChart3, FileText, ImageIcon, Layers,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import TimeBreakdown    from '@/components/dashboard/TimeBreakdown'
import GA4Section       from '@/components/dashboard/GA4Section'
import DateRangePicker  from '@/components/DateRangePicker'
import toast from 'react-hot-toast'
import type { CampaignInsight } from '@/services/meta/insights'
import type { AdInsight } from '@/services/meta/creatives'
import type { CreativeDetail } from '@/app/api/meta/creative-detail/route'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AggregatedData {
  spend: number; impressions: number; reach: number; clicks: number
  purchases: number; leads: number; initiateCheckout: number
  revenue: number; roas: number; landingPageViews: number; connectRate: number
  cpm: number; ctr: number; frequency: number
  purchaseRate: number; leadRate: number
  cpc: number; costPerLead: number; costPerPurchase: number
  costPerInitiateCheckout: number
}

interface MetricDef {
  id:       string
  label:    string
  format:   'currency' | 'percent' | 'number' | 'decimal'
  icon:     React.ElementType
  color:    string
  getValue: (d: AggregatedData) => number
}

interface MetaCampaign { id: string; name: string; status: string; effective_status?: string }
type SortDir = 'asc' | 'desc'

// ── All available metrics ─────────────────────────────────────────────────────
const ALL_METRICS: MetricDef[] = [
  { id: 'spend',           label: 'Valor Investido',        format: 'currency', icon: DollarSign,       color: 'text-emerald-400', getValue: d => d.spend           },
  { id: 'purchases',       label: 'Compras',                format: 'number',   icon: ShoppingCart,     color: 'text-blue-400',    getValue: d => d.purchases       },
  { id: 'purchaseRate',    label: 'Tx Conv. Compras',       format: 'percent',  icon: TrendingUp,       color: 'text-violet-400',  getValue: d => d.purchaseRate    },
  { id: 'leads',           label: 'Leads',                  format: 'number',   icon: Users,            color: 'text-cyan-400',    getValue: d => d.leads           },
  { id: 'leadRate',        label: 'Tx Conv. Leads',         format: 'percent',  icon: Target,           color: 'text-pink-400',    getValue: d => d.leadRate        },
  { id: 'cpm',             label: 'CPM',                    format: 'currency', icon: BarChart2,        color: 'text-orange-400',  getValue: d => d.cpm             },
  { id: 'ctr',             label: 'CTR',                    format: 'percent',  icon: MousePointerClick,color: 'text-yellow-400',  getValue: d => d.ctr             },
  { id: 'frequency',       label: 'Frequência',             format: 'decimal',  icon: RefreshCw,        color: 'text-indigo-400',  getValue: d => d.frequency       },
  { id: 'reach',           label: 'Alcance',                format: 'number',   icon: Eye,              color: 'text-teal-400',    getValue: d => d.reach           },
  { id: 'impressions',     label: 'Impressões',             format: 'number',   icon: Activity,         color: 'text-slate-400',   getValue: d => d.impressions     },
  { id: 'clicks',          label: 'Cliques',                format: 'number',   icon: MousePointerClick,color: 'text-sky-400',     getValue: d => d.clicks          },
  { id: 'cpc',             label: 'CPC',                    format: 'currency', icon: DollarSign,       color: 'text-amber-400',   getValue: d => d.cpc             },
  { id: 'costPerLead',     label: 'Custo por Lead',         format: 'currency', icon: DollarSign,       color: 'text-rose-400',    getValue: d => d.costPerLead     },
  { id: 'costPerPurchase',         label: 'Custo por Compra',             format: 'currency', icon: DollarSign,       color: 'text-lime-400',    getValue: d => d.costPerPurchase         },
  { id: 'initiateCheckout',        label: 'Initiate Checkout',            format: 'number',   icon: ShoppingCart,     color: 'text-fuchsia-400', getValue: d => d.initiateCheckout        },
  { id: 'costPerInitiateCheckout', label: 'Custo por Initiate Checkout',  format: 'currency', icon: DollarSign,       color: 'text-purple-400',  getValue: d => d.costPerInitiateCheckout },
  { id: 'revenue',          label: 'Receita',               format: 'currency', icon: TrendingUp,       color: 'text-green-400',   getValue: d => d.revenue          },
  { id: 'roas',             label: 'ROAS',                  format: 'decimal',  icon: TrendingUp,       color: 'text-emerald-300', getValue: d => d.roas             },
  { id: 'landingPageViews', label: 'Visualiz. Landing Page',format: 'number',   icon: Eye,              color: 'text-blue-300',    getValue: d => d.landingPageViews },
  { id: 'connectRate',      label: 'Taxa de Conexão',       format: 'percent',  icon: Activity,         color: 'text-cyan-300',    getValue: d => d.connectRate      },
]

const DEFAULT_IDS = ['spend', 'purchases', 'purchaseRate', 'leads', 'leadRate', 'cpm', 'ctr', 'frequency', 'reach', 'impressions']

// ── Date helpers ──────────────────────────────────────────────────────────────
function toYMD(d: Date) { return d.toISOString().split('T')[0] }
function today() { return toYMD(new Date()) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toYMD(d) }
function startOfMonth() { const d = new Date(); d.setDate(1); return toYMD(d) }

function getPreviousPeriod(start: string, end: string): { start: string; end: string } {
  const s    = new Date(start + 'T00:00:00')
  const e    = new Date(end   + 'T00:00:00')
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevEnd   = new Date(s.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000)
  return { start: toYMD(prevStart), end: toYMD(prevEnd) }
}

// ── Number formatters ─────────────────────────────────────────────────────────
const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPercent = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const fmtNumber = (v: number) =>
  Math.round(v).toLocaleString('pt-BR')
const fmtDecimal = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatValue(value: number, format: MetricDef['format']) {
  if (format === 'currency') return fmtCurrency(value)
  if (format === 'percent')  return fmtPercent(value)
  if (format === 'decimal')  return fmtDecimal(value)
  return fmtNumber(value)
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(rows: CampaignInsight[]) {
  const headers = ['Data','Investido','Compras','Tx Conv. Compra','Leads','Tx Conv. Lead','CPM','CTR','Frequência','Alcance','Impressões','Receita','ROAS','LP Views','Taxa Conexão']
  const escape  = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines   = [
    headers.join(','),
    ...rows.map(r => [
      r.date ?? '',
      r.spend.toFixed(2),
      r.purchases,
      r.purchaseRate.toFixed(2),
      r.leads,
      r.leadRate.toFixed(2),
      r.cpm.toFixed(2),
      r.ctr.toFixed(2),
      r.frequency.toFixed(2),
      r.reach,
      r.impressions,
      r.revenue.toFixed(2),
      r.roas.toFixed(2),
      r.landingPageViews,
      r.connectRate.toFixed(2),
    ].map(escape).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `dashboard-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Aggregation ───────────────────────────────────────────────────────────────
function aggregate(rows: CampaignInsight[]): AggregatedData | null {
  if (!rows.length) return null
  const spend       = rows.reduce((s, r) => s + r.spend,       0)
  const impressions = rows.reduce((s, r) => s + r.impressions, 0)
  const reach       = rows.reduce((s, r) => s + r.reach,       0)
  const clicks      = rows.reduce((s, r) => s + r.clicks,      0)
  const purchases        = rows.reduce((s, r) => s + r.purchases,        0)
  const leads            = rows.reduce((s, r) => s + r.leads,            0)
  const initiateCheckout = rows.reduce((s, r) => s + r.initiateCheckout, 0)
  const revenue          = rows.reduce((s, r) => s + r.revenue,          0)
  const landingPageViews = rows.reduce((s, r) => s + r.landingPageViews, 0)
  const frequency        = impressions > 0
    ? rows.reduce((s, r) => s + r.frequency * r.impressions, 0) / impressions
    : 0
  return {
    spend, impressions, reach, clicks, purchases, leads, initiateCheckout,
    revenue,
    roas:            spend > 0 ? revenue / spend : 0,
    landingPageViews,
    connectRate:     clicks > 0 ? (landingPageViews / clicks) * 100 : 0,
    frequency,
    cpm:                     impressions > 0      ? (spend / impressions) * 1000  : 0,
    ctr:                     impressions > 0      ? (clicks / impressions) * 100  : 0,
    purchaseRate:            landingPageViews > 0  ? (purchases / landingPageViews) * 100 : 0,
    leadRate:                landingPageViews > 0  ? (leads     / landingPageViews) * 100 : 0,
    cpc:                     clicks > 0           ? spend / clicks                : 0,
    costPerLead:             leads > 0            ? spend / leads                 : 0,
    costPerPurchase:         purchases > 0        ? spend / purchases             : 0,
    costPerInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout      : 0,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Campaign multi-select dropdown
type StatusFilter = 'all' | 'active' | 'inactive'

function CampaignFilter({
  campaigns, selected, onChange,
}: { campaigns: MetaCampaign[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen]           = useState(false)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<StatusFilter>('all')
  const ref                       = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  const filtered = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const effStatus = c.effective_status ?? c.status
    const matchStatus =
      statusFilter === 'all'      ? true :
      statusFilter === 'active'   ? effStatus === 'ACTIVE' :
                                    effStatus !== 'ACTIVE'
    return matchSearch && matchStatus
  })

  const label = selected.length === 0
    ? 'Todas as campanhas'
    : selected.length === 1
      ? campaigns.find(c => c.id === selected[0])?.name ?? '1 selecionada'
      : `${selected.length} campanhas`

  const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'all',      label: 'Todas'   },
    { id: 'active',   label: 'Ativas'  },
    { id: 'inactive', label: 'Pausadas'},
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700
          text-sm text-gray-300 hover:border-surface-600 transition-colors min-w-[200px]">
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 w-80 bg-surface-800 border border-surface-700
          rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">

          {/* Search input */}
          <div className="p-2.5 border-b border-surface-700">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-700 border border-surface-600 focus-within:border-indigo-500/60 transition-colors">
              <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar campanha..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 p-2 border-b border-surface-700">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatus(tab.id)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-surface-700 text-gray-400 hover:text-gray-200 hover:bg-surface-600 border border-transparent'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Select all / clear row */}
          <div className="flex gap-1 p-2 border-b border-surface-700">
            <button
              onClick={() => onChange(filtered.map(c => c.id))}
              className="flex-1 text-xs py-1.5 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
              Selecionar visíveis
            </button>
            <button
              onClick={() => onChange([])}
              className="flex-1 text-xs py-1.5 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
              Limpar
            </button>
          </div>

          {/* Campaign list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="text-xs text-gray-500 px-4 py-3 text-center">Nenhuma campanha encontrada</p>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-700 transition-colors text-left">
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                  selected.includes(c.id)
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-surface-600'
                }`}>
                  {selected.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{c.name}</p>
                  <p className={`text-[10px] ${(c.effective_status ?? c.status) === 'ACTIVE' ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {(c.effective_status ?? c.status) === 'ACTIVE' ? 'Ativa' : (c.effective_status ?? c.status) === 'PAUSED' ? 'Pausada' : (c.effective_status ?? c.status)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Metric card (draggable)
function MetricCard({
  metric, value, isDragging, isOver,
  onDragStart, onDragOver, onDrop, onDragEnd, onRemove,
  customLabel, onLabelChange, metricId, prevValue,
}: {
  metric:        MetricDef
  value:         number
  isDragging:    boolean
  isOver:        boolean
  onDragStart:   () => void
  onDragOver:    (e: React.DragEvent) => void
  onDrop:        () => void
  onDragEnd:     () => void
  onRemove:      () => void
  customLabel?:  string
  onLabelChange: (id: string, label: string) => void
  metricId:      string
  prevValue?:    number
}) {
  const [editing,   setEditing]   = useState(false)
  const [editValue, setEditValue] = useState(customLabel ?? metric.label)

  const displayLabel = customLabel || metric.label

  const handleLabelSubmit = () => {
    setEditing(false)
    if (editValue.trim()) onLabelChange(metricId, editValue.trim())
  }

  // Delta vs previous period
  const showDelta = prevValue !== undefined && prevValue !== null
  const delta     = showDelta ? value - prevValue! : 0
  const deltaPct  = showDelta && prevValue! !== 0 ? (delta / prevValue!) * 100 : 0

  // Frequency alert: warn when >= 3
  const isFrequency = metricId === 'frequency'
  const freqHigh    = isFrequency && value >= 3
  const freqColor   = isFrequency
    ? value >= 4 ? 'text-red-400' : value >= 3 ? 'text-orange-400' : 'text-gray-100'
    : 'text-gray-100'

  const Icon = metric.icon
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative bg-surface-800 border rounded-2xl p-5 transition-all select-none ${
        isDragging ? 'opacity-40 scale-95'
        : isOver   ? 'border-indigo-500/60 bg-surface-750 scale-[1.02]'
        :            'border-surface-700 hover:border-surface-600'
      }`}>
      {/* Drag handle */}
      <div className="absolute top-3 left-3 text-gray-600 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </div>
      {/* Remove */}
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 p-1 rounded-lg text-gray-600 hover:text-gray-400
          hover:bg-surface-700 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="mt-1 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-surface-750 ${metric.color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          {freqHigh && (
            <span title="Frequência alta — considere pausar ou renovar criativos">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </span>
          )}
        </div>
        <div>
          {editing ? (
            <input
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={handleLabelSubmit}
              onKeyDown={e => { if (e.key === 'Enter') handleLabelSubmit(); if (e.key === 'Escape') setEditing(false) }}
              className="text-xs font-medium text-indigo-300 bg-transparent border-b border-indigo-500 outline-none w-full mb-1"
            />
          ) : (
            <p
              className="text-xs text-gray-500 font-medium mb-1 cursor-pointer hover:text-indigo-400 transition-colors"
              onDoubleClick={() => { setEditValue(displayLabel); setEditing(true) }}
              title="Clique duplo para editar o rótulo">
              {displayLabel}
            </p>
          )}
          <p className={`text-2xl font-bold leading-none ${freqColor}`}>
            {formatValue(value, metric.format)}
          </p>
          {showDelta && prevValue! !== 0 && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
              delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'
            }`}>
              {delta > 0
                ? <TrendingUp className="w-3 h-3" />
                : delta < 0
                ? <TrendingDown className="w-3 h-3" />
                : <Minus className="w-3 h-3" />}
              {delta > 0 ? '+' : ''}{deltaPct.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Add metric modal
function AddMetricModal({
  visibleIds, onAdd, onClose,
}: { visibleIds: string[]; onAdd: (id: string) => void; onClose: () => void }) {
  const hidden = ALL_METRICS.filter(m => !visibleIds.includes(m.id))
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[420px] bg-surface-800 border border-surface-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h3 className="text-sm font-semibold text-gray-200">Adicionar métrica</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 max-h-80 overflow-y-auto">
          {hidden.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Todas as métricas já estão visíveis.</p>
          ) : (
            <div className="space-y-1">
              {hidden.map(m => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => { onAdd(m.id); onClose() }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      hover:bg-surface-700 transition-colors text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-surface-750 ${m.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">{m.label}</p>
                      <p className="text-xs text-gray-500 capitalize">{m.format}</p>
                    </div>
                    <Plus className="w-4 h-4 text-gray-500 ml-auto" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Sortable table header
function Th({ label, sortKey, currentKey, dir, onSort }: {
  label: string; sortKey: string; currentKey: string; dir: SortDir
  onSort: (key: string) => void
}) {
  const active = sortKey === currentKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer
        hover:text-gray-300 transition-colors whitespace-nowrap select-none">
      <div className="flex items-center gap-1">
        {label}
        {active
          ? dir === 'asc'
            ? <ArrowUp className="w-3 h-3 text-indigo-400" />
            : <ArrowDown className="w-3 h-3 text-indigo-400" />
          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </div>
    </th>
  )
}

// ── FunnelSection ─────────────────────────────────────────────────────────────
function FunnelSection({ data }: { data: AggregatedData }) {
  const steps = [
    { label: 'Impressões',       value: data.impressions      },
    { label: 'Cliques',          value: data.clicks           },
    { label: 'LP Views',         value: data.landingPageViews },
    { label: 'Iniciar Checkout', value: data.initiateCheckout },
    { label: 'Compras',          value: data.purchases        },
  ]
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-1">Funil de Conversão</h3>
      <div>
        {steps.map((step, i) => {
          const rate = i > 0 && steps[i - 1].value > 0
            ? (step.value / steps[i - 1].value) * 100
            : null
          return (
            <div key={step.label} className="flex items-center justify-between py-2.5 border-b border-surface-700/50 last:border-0">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-gray-600 w-3.5 tabular-nums">{i + 1}</span>
                <span className="text-sm text-gray-300">{step.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {rate !== null && (
                  <span className="text-xs text-gray-600">↓ {rate.toFixed(1)}%</span>
                )}
                <span className="text-sm font-semibold text-gray-100 tabular-nums w-24 text-right">
                  {fmtNumber(step.value)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TopCampaigns ──────────────────────────────────────────────────────────────
function TopCampaigns({ rows }: { rows: CampaignInsight[] }) {
  const top = [...rows].sort((a, b) => b.spend - a.spend).slice(0, 5)
  if (!top.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-gray-300">Top Campanhas por Investimento</h3>
      </div>
      <div className="divide-y divide-surface-700/50">
        {top.map((r, i) => (
          <div key={r.campaignId} className="px-5 py-3">
            {/* Name + spend */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-gray-600 w-3.5 flex-shrink-0">{i + 1}</span>
              <span className="text-sm font-medium text-gray-200 truncate flex-1" title={r.campaignName}>
                {r.campaignName}
              </span>
              <span className="text-sm font-semibold text-emerald-400 flex-shrink-0">{fmtCurrency(r.spend)}</span>
            </div>
            {/* Inline metrics */}
            <p className="text-[11px] text-gray-500 ml-5 leading-relaxed">
              {fmtNumber(r.purchases)} compras
              {r.costPerPurchase > 0 && <> · {fmtCurrency(r.costPerPurchase)}/compra</>}
              {' '}· {fmtPercent(r.purchaseRate)} conv.
              <span className="text-gray-700 mx-1.5">|</span>
              {fmtNumber(r.leads)} leads
              {r.costPerLead > 0 && <> · {fmtCurrency(r.costPerLead)}/lead</>}
              {' '}· {fmtPercent(r.leadRate)} conv.
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── EvolutionChart ────────────────────────────────────────────────────────────
type ChartMetric = {
  key:       keyof CampaignInsight
  label:     string
  color:     string
  gradient:  string
  format:    'currency' | 'number'
}

const CHART_METRICS: ChartMetric[] = [
  { key: 'spend',     label: 'Investido', color: '#6366f1', gradient: 'gradSpend',     format: 'currency' },
  { key: 'revenue',   label: 'Receita',   color: '#10b981', gradient: 'gradRevenue',   format: 'currency' },
  { key: 'purchases', label: 'Compras',   color: '#3b82f6', gradient: 'gradPurchases', format: 'number'   },
  { key: 'leads',     label: 'Leads',     color: '#f472b6', gradient: 'gradLeads',     format: 'number'   },
]

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; payload: Record<string, unknown> }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#13151f] border border-surface-600 rounded-2xl p-3.5 shadow-2xl shadow-black/60 min-w-[160px]">
      <p className="text-xs font-semibold text-gray-300 mb-2.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-1.5 last:mb-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-gray-400">{p.name}</span>
          </div>
          <span className="text-xs font-semibold text-white">
            {CHART_METRICS.find(m => m.label === p.name)?.format === 'currency'
              ? p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : Math.round(p.value).toLocaleString('pt-BR')
            }
          </span>
        </div>
      ))}
    </div>
  )
}

function EvolutionChart({ daily }: { daily: CampaignInsight[] }) {
  const [active, setActive] = useState<string[]>(['spend', 'revenue'])

  const byDate = daily.reduce<Record<string, Record<string, number>>>((acc, row) => {
    const d = row.date ?? ''
    if (!d) return acc
    if (!acc[d]) acc[d] = {}
    for (const m of CHART_METRICS)
      acc[d][m.key as string] = (acc[d][m.key as string] ?? 0) + (row[m.key] as number)
    return acc
  }, {})

  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      ...vals,
    }))

  if (data.length < 2) return null

  const toggle = (key: string) =>
    setActive(prev => prev.includes(key)
      ? prev.length > 1 ? prev.filter(k => k !== key) : prev
      : [...prev, key]
    )

  const activeMetrics = CHART_METRICS.filter(m => active.includes(m.key as string))

  // separate currency vs number metrics for dual axis
  const leftMetrics  = activeMetrics.filter(m => m.format === 'currency')
  const rightMetrics = activeMetrics.filter(m => m.format === 'number')
  const hasLeft  = leftMetrics.length > 0
  const hasRight = rightMetrics.length > 0

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Evolução Diária</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{data.length} dias com dados</p>
        </div>
        {/* Metric toggles */}
        <div className="flex items-center gap-2">
          {CHART_METRICS.map(m => {
            const on = active.includes(m.key as string)
            return (
              <button
                key={m.key as string}
                onClick={() => toggle(m.key as string)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  on ? 'border-opacity-60' : 'border-transparent bg-surface-700/50 text-gray-500 hover:text-gray-400'
                }`}
                style={on ? { borderColor: m.color + '80', background: m.color + '15', color: m.color } : {}}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: on ? m.color : '#4b5563' }} />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: hasRight ? 55 : 10, left: hasLeft ? 10 : 0, bottom: 0 }}>
          <defs>
            {CHART_METRICS.map(m => (
              <linearGradient key={m.gradient} id={m.gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={m.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0}    />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="4 4" stroke="#1e2130" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />

          {hasLeft && (
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={62}
              tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`}
            />
          )}
          {hasRight && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))}
            />
          )}

          <RechartsTooltip
            content={<ChartTooltip />}
            cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {activeMetrics.map(m => {
            const yId = m.format === 'currency' ? (hasLeft ? 'left' : 'right') : (hasRight ? 'right' : 'left')
            return (
              <Area
                key={m.key as string}
                yAxisId={yId}
                type="monotone"
                dataKey={m.key as string}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                fill={`url(#${m.gradient})`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: m.color }}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage({ params }: { params: { workspaceId: string } }) {
  const workspaceId = params.workspaceId

  // ── Tabs & filters ─────────────────────────────────────────────────────────
  const [tab,        setTab]        = useState<'overview' | 'daily' | 'breakdown' | 'analytics' | 'creatives'>('overview')
  const [startDate,  setStartDate]  = useState(daysAgo(29))
  const [endDate,    setEndDate]    = useState(today())
  const [activePreset, setPreset]   = useState('30 dias')
  const [campaigns,  setCampaigns]  = useState<MetaCampaign[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // ── Data ───────────────────────────────────────────────────────────────────
  const [insights,         setInsights]         = useState<CampaignInsight[]>([])
  const [daily,            setDaily]            = useState<CampaignInsight[]>([])
  const [prevOverview,     setPrevOverview]     = useState<AggregatedData | null>(null)
  const [creatives,        setCreatives]        = useState<AdInsight[]>([])
  const [creativesLoading, setCreativesLoading] = useState(false)
  const [creativesError,   setCreativesError]   = useState<string | null>(null)
  const [creativeSortKey,  setCreativeSortKey]  = useState('spend')
  const [creativeSortDir,  setCreativeSortDir]  = useState<SortDir>('desc')
  const [groupCreatives,   setGroupCreatives]   = useState(true)
  const [previewAd,        setPreviewAd]        = useState<AdInsight | null>(null)
  const [previewDetail,    setPreviewDetail]    = useState<CreativeDetail | null>(null)
  const [previewLoading,   setPreviewLoading]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // ── Metric cards state (persisted in localStorage) ─────────────────────────
  const [metricOrder, setMetricOrder] = useState<string[]>(DEFAULT_IDS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [draggedId,  setDraggedId]  = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // ── Custom labels (persisted in localStorage) ─────────────────────────────
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({})

  // ── Daily table sort ───────────────────────────────────────────────────────
  const [sortKey,  setSortKey]  = useState('date')
  const [sortDir,  setSortDir]  = useState<SortDir>('desc')

  // ── Load metric order + labels from localStorage ───────────────────────────
  useEffect(() => {
    const savedLabels = localStorage.getItem(`dash-metric-labels-${workspaceId}`)
    if (savedLabels) {
      try { setCustomLabels(JSON.parse(savedLabels) as Record<string, string>) } catch { /* ignore */ }
    }
  }, [workspaceId])

  const updateCustomLabel = (metricId: string, label: string) => {
    setCustomLabels(prev => {
      const next = { ...prev, [metricId]: label }
      localStorage.setItem(`dash-metric-labels-${workspaceId}`, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    const saved = localStorage.getItem(`dash-metric-order-${workspaceId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[]
        // Merge: keep saved order, add any new default IDs not yet saved
        const merged = [...parsed, ...DEFAULT_IDS.filter(id => !parsed.includes(id))]
        setMetricOrder(merged)
      } catch { /* ignore */ }
    }
  }, [workspaceId])

  const saveOrder = (order: string[]) => {
    setMetricOrder(order)
    localStorage.setItem(`dash-metric-order-${workspaceId}`, JSON.stringify(order))
  }

  // ── Fetch campaigns list once ───────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/meta/campaigns-list?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(j => { if (j.success) setCampaigns(j.data) })
      .catch(() => {})
  }, [workspaceId])

  // ── Fetch insights ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const prev   = getPreviousPeriod(startDate, endDate)
      const params = new URLSearchParams({
        startDate,
        endDate,
        workspaceId,
        ...(selectedIds.length ? { campaignIds: selectedIds.join(',') } : {}),
      })
      const prevParams = new URLSearchParams({
        startDate: prev.start,
        endDate:   prev.end,
        workspaceId,
        ...(selectedIds.length ? { campaignIds: selectedIds.join(',') } : {}),
      })

      const [overviewRes, dailyRes, prevRes] = await Promise.all([
        fetch(`/api/meta/insights?${params}`),
        fetch(`/api/meta/insights?${params}&daily=true`),
        fetch(`/api/meta/insights?${prevParams}`),
      ])

      const [overviewJson, dailyJson, prevJson] = await Promise.all([
        overviewRes.json(),
        dailyRes.json(),
        prevRes.json(),
      ])

      if (!overviewJson.success) throw new Error(overviewJson.error)
      if (!dailyJson.success)    throw new Error(dailyJson.error)

      setInsights(overviewJson.data)
      setDaily(dailyJson.data)
      if (prevJson.success) {
        setPrevOverview(aggregate(prevJson.data))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar dados'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedIds, workspaceId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Fetch creatives (lazy — only when tab is active) ──────────────────────
  const fetchCreatives = useCallback(async () => {
    setCreativesLoading(true)
    setCreativesError(null)
    try {
      const params = new URLSearchParams({
        startDate, endDate, workspaceId,
        ...(selectedIds.length ? { campaignIds: selectedIds.join(',') } : {}),
      })
      const res  = await fetch(`/api/meta/creatives?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setCreatives(json.data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar criativos'
      setCreativesError(msg)
      toast.error(msg)
    } finally {
      setCreativesLoading(false)
    }
  }, [startDate, endDate, selectedIds, workspaceId])

  useEffect(() => {
    if (tab === 'creatives') fetchCreatives()
  }, [tab, fetchCreatives])

  // ── Creative preview ───────────────────────────────────────────────────────
  const openCreativePreview = useCallback(async (ad: AdInsight) => {
    setPreviewAd(ad)
    setPreviewDetail(null)
    setPreviewLoading(true)
    try {
      const res  = await fetch(`/api/meta/creative-detail?adId=${ad.adId}&workspaceId=${workspaceId}`)
      const json = await res.json()
      if (json.success) setPreviewDetail(json.data as CreativeDetail)
    } catch { /* non-fatal */ }
    finally { setPreviewLoading(false) }
  }, [workspaceId])

  // ── Preset picker ──────────────────────────────────────────────────────────
  // ── Drag and drop ──────────────────────────────────────────────────────────
  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragOver  = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id) }
  const handleDrop      = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return
    const newOrder = [...metricOrder]
    const from = newOrder.indexOf(draggedId)
    const to   = newOrder.indexOf(targetId)
    newOrder.splice(from, 1)
    newOrder.splice(to, 0, draggedId)
    saveOrder(newOrder)
    setDraggedId(null)
    setDragOverId(null)
  }
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null) }

  const removeMetric = (id: string) => saveOrder(metricOrder.filter(m => m !== id))
  const addMetric    = (id: string) => saveOrder([...metricOrder, id])

  // ── Sort daily table ───────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // API already returns one row per date (aggregated server-side)
  const sortedDaily = [...daily].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const va = (a as unknown as Record<string, unknown>)[sortKey]
    const vb = (b as unknown as Record<string, unknown>)[sortKey]
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir
    return (Number(va ?? 0) - Number(vb ?? 0)) * dir
  })

  // ── Aggregated data ────────────────────────────────────────────────────────
  const aggData = aggregate(insights)

  // ── Visible metric defs in current order ──────────────────────────────────
  const visibleMetrics = metricOrder
    .map(id => ALL_METRICS.find(m => m.id === id))
    .filter((m): m is MetricDef => !!m)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Performance das campanhas Meta Ads</p>
          </div>
          <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${workspaceId}/report`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-700 border border-surface-600
              text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-surface-600 transition-colors">
            <FileText className="w-4 h-4" />
            Relatório PDF
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700
              text-sm font-medium text-white transition-colors disabled:opacity-50">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            Atualizar
          </button>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-surface-800 rounded-xl w-fit">
          {[
            { id: 'overview',   label: 'Visão Geral',        icon: LayoutDashboard },
            { id: 'daily',      label: 'Desempenho Diário',  icon: TableProperties },
            { id: 'creatives',  label: 'Criativos',          icon: ImageIcon       },
            { id: 'breakdown',  label: 'Horários & Dias',    icon: Clock           },
            { id: 'analytics',  label: 'Google Analytics',   icon: BarChart3       },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-surface-700 text-gray-100'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range picker */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            activePreset={activePreset}
            onChange={(s, e, p) => {
              setStartDate(s)
              setEndDate(e)
              setPreset(p ?? '')
            }}
          />

          {/* Campaign filter */}
          <CampaignFilter
            campaigns={campaigns}
            selected={selectedIds}
            onChange={setSelectedIds}
          />

          {/* Group toggle — only visible on Criativos tab */}
          {tab === 'creatives' && (
            <button
              onClick={() => setGroupCreatives(g => !g)}
              className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors
                ${groupCreatives
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-surface-800 text-gray-400 border-surface-700 hover:text-gray-200 hover:border-surface-600'
                }`}
            >
              <Layers className="w-4 h-4" />
              {groupCreatives ? 'Agrupado por nome' : 'Individual por conjunto'}
            </button>
          )}
        </div>

        {/* ── Error state ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: VISÃO GERAL                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Metric cards grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: metricOrder.length }).map((_, i) => (
                  <div key={i} className="bg-surface-800 border border-surface-700 rounded-2xl p-5 animate-pulse">
                    <div className="w-9 h-9 bg-surface-700 rounded-xl mb-3" />
                    <div className="h-3 bg-surface-700 rounded w-20 mb-2" />
                    <div className="h-7 bg-surface-700 rounded w-28" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {visibleMetrics.map(metric => (
                    <MetricCard
                      key={metric.id}
                      metric={metric}
                      metricId={metric.id}
                      value={aggData ? metric.getValue(aggData) : 0}
                      prevValue={prevOverview ? metric.getValue(prevOverview) : undefined}
                      customLabel={customLabels[metric.id]}
                      onLabelChange={updateCustomLabel}
                      isDragging={draggedId === metric.id}
                      isOver={dragOverId === metric.id && draggedId !== metric.id}
                      onDragStart={() => handleDragStart(metric.id)}
                      onDragOver={e => handleDragOver(e, metric.id)}
                      onDrop={() => handleDrop(metric.id)}
                      onDragEnd={handleDragEnd}
                      onRemove={() => removeMetric(metric.id)}
                    />
                  ))}

                  {/* Add metric button */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="border-2 border-dashed border-surface-700 rounded-2xl p-5 flex flex-col
                      items-center justify-center gap-2 text-gray-600 hover:border-indigo-500/50
                      hover:text-indigo-400 transition-colors min-h-[120px]">
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-medium">Adicionar métrica</span>
                  </button>
                </div>

                {/* Empty state */}
                {!aggData && !loading && !error && (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum dado encontrado para o período selecionado.</p>
                  </div>
                )}

                {/* Hint */}
                {visibleMetrics.length > 0 && (
                  <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                    <Settings2 className="w-3 h-3" />
                    Segure e arraste os cards para reordenar · clique no × para remover · clique duplo no rótulo para editar
                  </p>
                )}

                {/* ── Campaigns breakdown table ─────────────────────────── */}
                {insights.length > 0 && (() => {
                  // Aggregate insights by campaignId (overview call already returns
                  // one row per campaign, but group just in case)
                  const byId = new Map<string, typeof insights>()
                  for (const r of insights) {
                    if (!byId.has(r.campaignId)) byId.set(r.campaignId, [])
                    byId.get(r.campaignId)!.push(r)
                  }
                  const rows = Array.from(byId.values()).map(rs => {
                    const spend            = rs.reduce((s, r) => s + r.spend,            0)
                    const impressions      = rs.reduce((s, r) => s + r.impressions,      0)
                    const reach            = rs.reduce((s, r) => s + r.reach,            0)
                    const clicks           = rs.reduce((s, r) => s + r.clicks,           0)
                    const purchases        = rs.reduce((s, r) => s + r.purchases,        0)
                    const leads            = rs.reduce((s, r) => s + r.leads,            0)
                    const initiateCheckout = rs.reduce((s, r) => s + r.initiateCheckout, 0)
                    const revenue          = rs.reduce((s, r) => s + r.revenue,          0)
                    const landingPageViews = rs.reduce((s, r) => s + r.landingPageViews, 0)
                    return {
                      campaignId:   rs[0].campaignId,
                      campaignName: rs[0].campaignName,
                      spend, impressions, reach, clicks, purchases, leads,
                      initiateCheckout, revenue, landingPageViews,
                      roas:                    spend > 0            ? revenue / spend                    : 0,
                      ctr:                     impressions > 0      ? (clicks / impressions) * 100       : 0,
                      cpm:                     impressions > 0      ? (spend  / impressions) * 1000      : 0,
                      frequency:               reach > 0            ? impressions / reach                : 0,
                      connectRate:             clicks > 0           ? (landingPageViews / clicks) * 100  : 0,
                      purchaseRate:            landingPageViews > 0 ? (purchases / landingPageViews) * 100 : 0,
                      leadRate:                landingPageViews > 0 ? (leads     / landingPageViews) * 100 : 0,
                      cpc:                     clicks > 0           ? spend / clicks                     : 0,
                      costPerLead:             leads > 0            ? spend / leads                      : 0,
                      costPerPurchase:         purchases > 0        ? spend / purchases                  : 0,
                      costPerInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout           : 0,
                    }
                  }).sort((a, b) => b.spend - a.spend)

                  return (
                    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden mt-2">
                      <div className="px-5 py-3 border-b border-surface-700 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-200">Campanhas no Período</h3>
                        <span className="text-xs text-gray-500">{rows.length} campanha{rows.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-surface-700 bg-surface-750">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 min-w-[200px]">Campanha</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Investido</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">ROAS</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Receita</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Compras</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Custo/Compra</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Tx Conv.</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Leads</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Custo/Lead</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Tx Conv. Lead</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">CPC</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">CPM</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">CTR</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Frequência</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Alcance</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Impressões</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-700/50">
                            {rows.map((row, i) => (
                              <tr key={row.campaignId} className="hover:bg-surface-750/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-[11px] font-medium text-gray-600 w-5 text-center flex-shrink-0">{i + 1}</span>
                                    <span className="text-gray-200 text-sm font-medium truncate max-w-[280px]" title={row.campaignName}>
                                      {row.campaignName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-400 font-medium whitespace-nowrap">{fmtCurrency(row.spend)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtDecimal(row.roas)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtCurrency(row.revenue)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtNumber(row.purchases)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{row.costPerPurchase > 0 ? fmtCurrency(row.costPerPurchase) : '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtPercent(row.purchaseRate)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtNumber(row.leads)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{row.costPerLead > 0 ? fmtCurrency(row.costPerLead) : '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtPercent(row.leadRate)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtCurrency(row.cpc)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtCurrency(row.cpm)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtPercent(row.ctr)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtDecimal(row.frequency)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtNumber(row.reach)}</td>
                                <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">{fmtNumber(row.impressions)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}

                {/* Funnel + Top campaigns */}
                {aggData && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                    <FunnelSection data={aggData} />
                    <TopCampaigns rows={insights} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: DESEMPENHO DIÁRIO                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'daily' && (
          <div className="space-y-4">
            {/* Evolution chart */}
            {!loading && daily.length > 0 && <EvolutionChart daily={daily} />}

            {/* Export CSV button */}
            {!loading && sortedDaily.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => exportCSV(sortedDaily)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800 border border-surface-700
                    text-sm text-gray-300 hover:border-surface-600 hover:text-gray-200 transition-colors">
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
            )}

          <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : sortedDaily.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <TableProperties className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum dado diário encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-surface-700 bg-surface-750">
                    <tr>
                      <Th label="Data"           sortKey="date"                    currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Investido"       sortKey="spend"                  currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="ROAS"            sortKey="roas"                   currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Receita"         sortKey="revenue"                currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Compras"         sortKey="purchases"              currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Custo/Compra"    sortKey="costPerPurchase"        currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Tx Conv."        sortKey="purchaseRate"           currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Leads"           sortKey="leads"                  currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Custo/Lead"      sortKey="costPerLead"            currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Tx Conv. Lead"   sortKey="leadRate"               currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="CPC"             sortKey="cpc"                    currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="CPM"             sortKey="cpm"                    currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="CTR"             sortKey="ctr"                    currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Frequência"      sortKey="frequency"              currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Alcance"         sortKey="reach"                  currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Impressões"      sortKey="impressions"            currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/50">
                    {sortedDaily.map((row, i) => (
                      <tr key={i} className="hover:bg-surface-750/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                          {row.date
                            ? new Date(row.date + 'T00:00:00').toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-medium whitespace-nowrap">{fmtCurrency(row.spend)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDecimal(row.roas)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtCurrency(row.revenue)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.purchases)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{row.costPerPurchase > 0 ? fmtCurrency(row.costPerPurchase) : '—'}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.purchaseRate)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.leads)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{row.costPerLead > 0 ? fmtCurrency(row.costPerLead) : '—'}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.leadRate)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtCurrency(row.cpc)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtCurrency(row.cpm)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.ctr)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDecimal(row.frequency)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.reach)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.impressions)}</td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Totals row */}
                  {(() => {
                    const t = aggregate(daily)
                    if (!t) return null
                    return (
                      <tfoot className="border-t-2 border-surface-600 bg-surface-750">
                        <tr>
                          <td className="px-4 py-3 text-xs font-bold text-gray-400">TOTAL</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold whitespace-nowrap">{fmtCurrency(t.spend)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtDecimal(t.roas)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtCurrency(t.revenue)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtNumber(t.purchases)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{t.costPerPurchase > 0 ? fmtCurrency(t.costPerPurchase) : '—'}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtPercent(t.purchaseRate)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtNumber(t.leads)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{t.costPerLead > 0 ? fmtCurrency(t.costPerLead) : '—'}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtPercent(t.leadRate)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtCurrency(t.cpc)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtCurrency(t.cpm)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtPercent(t.ctr)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtDecimal(t.frequency)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtNumber(t.reach)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtNumber(t.impressions)}</td>
                        </tr>
                      </tfoot>
                    )
                  })()}
                </table>
              </div>
            )}
          </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: CRIATIVOS                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'creatives' && (() => {
          // ── Group by adName when toggle is ON ────────────────────────────
          const displayRows = (() => {
            if (!groupCreatives) return creatives
            const map = new Map<string, typeof creatives>()
            for (const row of creatives) {
              const key = row.adName
              if (!map.has(key)) map.set(key, [])
              map.get(key)!.push(row)
            }
            return Array.from(map.values()).map(rows => {
              const spend            = rows.reduce((s, r) => s + r.spend,            0)
              const impressions      = rows.reduce((s, r) => s + r.impressions,      0)
              const reach            = rows.reduce((s, r) => s + r.reach,            0)
              const clicks           = rows.reduce((s, r) => s + r.clicks,           0)
              const purchases        = rows.reduce((s, r) => s + r.purchases,        0)
              const leads            = rows.reduce((s, r) => s + r.leads,            0)
              const initiateCheckout = rows.reduce((s, r) => s + r.initiateCheckout, 0)
              const revenue          = rows.reduce((s, r) => s + r.revenue,          0)
              const landingPageViews = rows.reduce((s, r) => s + r.landingPageViews, 0)
              return {
                ...rows[0],
                thumbnailUrl:            rows.find(r => r.thumbnailUrl)?.thumbnailUrl,
                adSetName:               '',
                adSetId:                 '',
                spend, impressions, reach, clicks, purchases, leads,
                initiateCheckout, revenue, landingPageViews,
                roas:                    spend > 0            ? revenue / spend                    : 0,
                ctr:                     impressions > 0      ? (clicks / impressions) * 100       : 0,
                cpm:                     impressions > 0      ? (spend  / impressions) * 1000      : 0,
                frequency:               reach > 0            ? impressions / reach                : 0,
                connectRate:             clicks > 0           ? (landingPageViews / clicks) * 100  : 0,
                purchaseRate:            landingPageViews > 0 ? (purchases / landingPageViews) * 100 : 0,
                leadRate:                landingPageViews > 0 ? (leads     / landingPageViews) * 100 : 0,
                cpc:                     clicks > 0           ? spend / clicks                     : 0,
                costPerLead:             leads > 0            ? spend / leads                      : 0,
                costPerPurchase:         purchases > 0        ? spend / purchases                  : 0,
                costPerInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout           : 0,
              }
            })
          })()

          const sortedRows = [...displayRows].sort((a, b) => {
            const dir = creativeSortDir === 'asc' ? 1 : -1
            const va  = (a as unknown as Record<string, unknown>)[creativeSortKey]
            const vb  = (b as unknown as Record<string, unknown>)[creativeSortKey]
            return (Number(va ?? 0) - Number(vb ?? 0)) * dir
          })

          const onSort = (k: string) => {
            if (k === creativeSortKey) setCreativeSortDir(d => d === 'asc' ? 'desc' : 'asc')
            else { setCreativeSortKey(k); setCreativeSortDir('desc') }
          }

          return (
            <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
                {creativesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  </div>
                ) : creativesError ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-sm text-red-400">{creativesError}</p>
                    <button onClick={fetchCreatives} className="text-xs text-indigo-400 hover:underline">Tentar novamente</button>
                  </div>
                ) : creatives.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum criativo encontrado para o período selecionado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-surface-700 bg-surface-750">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-16">Preview</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                            {groupCreatives ? 'Criativo' : 'Criativo / Conjunto'}
                          </th>
                          {([
                            ['spend',           'Investido'],
                            ['roas',            'ROAS'],
                            ['revenue',         'Receita'],
                            ['purchases',       'Compras'],
                            ['costPerPurchase', 'Custo/Compra'],
                            ['purchaseRate',    'Tx Conv.'],
                            ['leads',           'Leads'],
                            ['costPerLead',     'Custo/Lead'],
                            ['leadRate',        'Tx Conv. Lead'],
                            ['cpc',             'CPC'],
                            ['cpm',             'CPM'],
                            ['ctr',             'CTR'],
                            ['frequency',       'Freq.'],
                            ['impressions',     'Impressões'],
                            ['reach',           'Alcance'],
                          ] as [string, string][]).map(([key, label]) => (
                            <Th key={key} label={label} sortKey={key}
                              currentKey={creativeSortKey} dir={creativeSortDir}
                              onSort={onSort} />
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-700/50">
                        {sortedRows.map((row, i) => (
                          <tr key={i} className="hover:bg-surface-750/50 transition-colors">
                            {/* Thumbnail */}
                            <td className="px-4 py-2">
                              <button
                                onClick={() => openCreativePreview(row)}
                                className="block w-12 h-12 rounded-lg overflow-hidden bg-surface-700 flex-shrink-0 ring-0 hover:ring-2 hover:ring-indigo-500/60 transition-all group relative"
                              >
                                {row.thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.thumbnailUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-gray-600" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            </td>
                            {/* Name + subtitle */}
                            <td className="px-4 py-2 max-w-[240px]">
                              <p className="text-gray-200 text-sm truncate font-medium" title={row.adName}>{row.adName}</p>
                              {groupCreatives ? null : (
                                <p className="text-gray-500 text-xs truncate mt-0.5"
                                  title={`${row.campaignName} / ${row.adSetName}`}>
                                  {row.campaignName}
                                  {row.adSetName ? <span className="text-gray-600"> / {row.adSetName}</span> : null}
                                </p>
                              )}
                            </td>
                            {/* Metrics */}
                            <td className="px-4 py-3 text-emerald-400 font-medium whitespace-nowrap">{fmtCurrency(row.spend)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDecimal(row.roas)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtCurrency(row.revenue)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.purchases)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{row.costPerPurchase > 0 ? fmtCurrency(row.costPerPurchase) : '—'}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.purchaseRate)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.leads)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{row.costPerLead > 0 ? fmtCurrency(row.costPerLead) : '—'}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.leadRate)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtCurrency(row.cpc)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtCurrency(row.cpm)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.ctr)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDecimal(row.frequency)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.impressions)}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.reach)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: HORÁRIOS & DIAS                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'breakdown' && (
          <TimeBreakdown
            workspaceId={workspaceId}
            startDate={startDate}
            endDate={endDate}
            campaignIds={selectedIds}
          />
        )}

        {tab === 'analytics' && (
          <GA4Section
            workspaceId={workspaceId}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </div>

      {/* Add metric modal */}
      {showAddModal && (
        <AddMetricModal
          visibleIds={metricOrder}
          onAdd={addMetric}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* ── Creative preview modal ─────────────────────────────────────────── */}
      {previewAd && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setPreviewAd(null); setPreviewDetail(null) }}
        >
          <div
            className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-700 flex-shrink-0">
              <p className="text-sm font-semibold text-gray-200 truncate pr-4" title={previewAd.adName}>
                {previewAd.adName}
              </p>
              <button
                onClick={() => { setPreviewAd(null); setPreviewDetail(null) }}
                className="text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col sm:flex-row overflow-hidden flex-1 min-h-0">
              {/* Media */}
              <div className="sm:w-64 flex-shrink-0 bg-black flex items-center justify-center min-h-[200px] relative">
                {previewLoading ? (
                  <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                ) : previewDetail?.videoUrl ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    key={previewDetail.videoUrl}
                    src={`/api/meta/video-proxy?url=${encodeURIComponent(previewDetail.videoUrl)}`}
                    poster={previewDetail.thumbUrl ?? previewAd.thumbnailUrl ?? undefined}
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full h-full object-contain max-h-[70vh]"
                  />
                ) : previewDetail?.isVideo ? (
                  /* Video detected but source URL unavailable */
                  <div className="flex flex-col items-center gap-3 p-4 text-center">
                    {(previewDetail.thumbUrl ?? previewAd.thumbnailUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewDetail.thumbUrl ?? previewAd.thumbnailUrl}
                        alt=""
                        className="w-full object-contain max-h-40 opacity-60"
                      />
                    )}
                    <p className="text-xs text-gray-500">Vídeo não disponível via API</p>
                  </div>
                ) : (previewDetail?.imageUrl ?? previewDetail?.thumbUrl ?? previewAd.thumbnailUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewDetail?.imageUrl ?? previewDetail?.thumbUrl ?? previewAd.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-contain max-h-[70vh]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-700">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-xs">Sem mídia</span>
                  </div>
                )}
              </div>

              {/* Text details */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando detalhes...
                  </div>
                ) : (
                  <>
                    {previewDetail?.title && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Título</p>
                        <p className="text-sm text-gray-200 leading-relaxed">{previewDetail.title}</p>
                      </div>
                    )}
                    {previewDetail?.body && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Texto do anúncio</p>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{previewDetail.body}</p>
                      </div>
                    )}
                    {!previewDetail?.title && !previewDetail?.body && !previewLoading && (
                      <p className="text-xs text-gray-600 italic">Textos não disponíveis para este criativo.</p>
                    )}
                    {/* Metrics summary */}
                    <div className="pt-2 border-t border-surface-700 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-gray-600">Investido</p>
                        <p className="text-sm font-semibold text-emerald-400">{fmtCurrency(previewAd.spend)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">ROAS</p>
                        <p className="text-sm font-semibold text-gray-200">{fmtDecimal(previewAd.roas)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">Compras</p>
                        <p className="text-sm font-semibold text-gray-200">{fmtNumber(previewAd.purchases)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">CTR</p>
                        <p className="text-sm font-semibold text-gray-200">{fmtPercent(previewAd.ctr)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
