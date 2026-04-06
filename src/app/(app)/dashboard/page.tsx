'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DollarSign, ShoppingCart, TrendingUp, Users, Target,
  BarChart2, MousePointerClick, RefreshCw, Eye, Activity,
  Calendar, ChevronDown, Check, Loader2, GripVertical,
  Plus, X, ArrowUpDown, ArrowUp, ArrowDown, LayoutDashboard,
  TableProperties, AlertCircle, Settings2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { CampaignInsight } from '@/services/meta/insights'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AggregatedData {
  spend: number; impressions: number; reach: number; clicks: number
  purchases: number; leads: number; cpm: number; ctr: number
  frequency: number; purchaseRate: number; leadRate: number
  cpc: number; costPerLead: number; costPerPurchase: number
}

interface MetricDef {
  id:       string
  label:    string
  format:   'currency' | 'percent' | 'number' | 'decimal'
  icon:     React.ElementType
  color:    string
  getValue: (d: AggregatedData) => number
}

interface MetaCampaign { id: string; name: string; status: string }
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
  { id: 'costPerPurchase', label: 'Custo por Compra',       format: 'currency', icon: DollarSign,       color: 'text-lime-400',    getValue: d => d.costPerPurchase },
]

const DEFAULT_IDS = ['spend', 'purchases', 'purchaseRate', 'leads', 'leadRate', 'cpm', 'ctr', 'frequency', 'reach', 'impressions']
const STORAGE_KEY = 'dash-metric-order'

// ── Date helpers ──────────────────────────────────────────────────────────────
function toYMD(d: Date) { return d.toISOString().split('T')[0] }
function today() { return toYMD(new Date()) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toYMD(d) }
function startOfMonth() { const d = new Date(); d.setDate(1); return toYMD(d) }

const PRESETS = [
  { label: 'Hoje',      start: () => today(),        end: () => today()   },
  { label: '7 dias',    start: () => daysAgo(6),     end: () => today()   },
  { label: '30 dias',   start: () => daysAgo(29),    end: () => today()   },
  { label: 'Este mês',  start: () => startOfMonth(), end: () => today()   },
]

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

// ── Aggregation ───────────────────────────────────────────────────────────────
function aggregate(rows: CampaignInsight[]): AggregatedData | null {
  if (!rows.length) return null
  const spend       = rows.reduce((s, r) => s + r.spend,       0)
  const impressions = rows.reduce((s, r) => s + r.impressions, 0)
  const reach       = rows.reduce((s, r) => s + r.reach,       0)
  const clicks      = rows.reduce((s, r) => s + r.clicks,      0)
  const purchases   = rows.reduce((s, r) => s + r.purchases,   0)
  const leads       = rows.reduce((s, r) => s + r.leads,       0)
  const frequency   = impressions > 0
    ? rows.reduce((s, r) => s + r.frequency * r.impressions, 0) / impressions
    : 0
  return {
    spend, impressions, reach, clicks, purchases, leads, frequency,
    cpm:             impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr:             impressions > 0 ? (clicks / impressions) * 100 : 0,
    purchaseRate:    clicks > 0 ? (purchases / clicks) * 100 : 0,
    leadRate:        clicks > 0 ? (leads / clicks) * 100 : 0,
    cpc:             clicks > 0 ? spend / clicks : 0,
    costPerLead:     leads > 0  ? spend / leads  : 0,
    costPerPurchase: purchases > 0 ? spend / purchases : 0,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Campaign multi-select dropdown
function CampaignFilter({
  campaigns, selected, onChange,
}: { campaigns: MetaCampaign[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  const label = selected.length === 0
    ? 'Todas as campanhas'
    : selected.length === 1
      ? campaigns.find(c => c.id === selected[0])?.name ?? '1 selecionada'
      : `${selected.length} campanhas`

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
        <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-surface-800 border border-surface-700
          rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="p-2 border-b border-surface-700 flex gap-2">
            <button
              onClick={() => onChange(campaigns.map(c => c.id))}
              className="flex-1 text-xs py-1.5 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
              Todas
            </button>
            <button
              onClick={() => onChange([])}
              className="flex-1 text-xs py-1.5 rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
              Limpar
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {campaigns.length === 0 && (
              <p className="text-xs text-gray-500 px-4 py-3">Nenhuma campanha encontrada</p>
            )}
            {campaigns.map(c => (
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
                  <p className={`text-[10px] ${c.status === 'ACTIVE' ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
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
}: {
  metric:      MetricDef
  value:       number
  isDragging:  boolean
  isOver:      boolean
  onDragStart: () => void
  onDragOver:  (e: React.DragEvent) => void
  onDrop:      () => void
  onDragEnd:   () => void
  onRemove:    () => void
}) {
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
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-surface-750 ${metric.color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">{metric.label}</p>
          <p className="text-2xl font-bold text-gray-100 leading-none">
            {formatValue(value, metric.format)}
          </p>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // ── Tabs & filters ─────────────────────────────────────────────────────────
  const [tab,        setTab]        = useState<'overview' | 'daily'>('overview')
  const [startDate,  setStartDate]  = useState(daysAgo(29))
  const [endDate,    setEndDate]    = useState(today())
  const [activePreset, setPreset]   = useState('30 dias')
  const [campaigns,  setCampaigns]  = useState<MetaCampaign[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // ── Data ───────────────────────────────────────────────────────────────────
  const [insights,   setInsights]   = useState<CampaignInsight[]>([])
  const [daily,      setDaily]      = useState<CampaignInsight[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // ── Metric cards state (persisted in localStorage) ─────────────────────────
  const [metricOrder, setMetricOrder] = useState<string[]>(DEFAULT_IDS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [draggedId,  setDraggedId]  = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // ── Daily table sort ───────────────────────────────────────────────────────
  const [sortKey,  setSortKey]  = useState('date')
  const [sortDir,  setSortDir]  = useState<SortDir>('desc')

  // ── Load metric order from localStorage ────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[]
        // Merge: keep saved order, add any new default IDs not yet saved
        const merged = [...parsed, ...DEFAULT_IDS.filter(id => !parsed.includes(id))]
        setMetricOrder(merged)
      } catch { /* ignore */ }
    }
  }, [])

  const saveOrder = (order: string[]) => {
    setMetricOrder(order)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  }

  // ── Fetch campaigns list once ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/meta/campaigns-list')
      .then(r => r.json())
      .then(j => { if (j.success) setCampaigns(j.data) })
      .catch(() => {})
  }, [])

  // ── Fetch insights ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedIds.length ? { campaignIds: selectedIds.join(',') } : {}),
      })

      const [overviewRes, dailyRes] = await Promise.all([
        fetch(`/api/meta/insights?${params}`),
        fetch(`/api/meta/insights?${params}&daily=true`),
      ])

      const [overviewJson, dailyJson] = await Promise.all([
        overviewRes.json(),
        dailyRes.json(),
      ])

      if (!overviewJson.success) throw new Error(overviewJson.error)
      if (!dailyJson.success)    throw new Error(dailyJson.error)

      setInsights(overviewJson.data)
      setDaily(dailyJson.data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar dados'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedIds])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Preset picker ──────────────────────────────────────────────────────────
  const applyPreset = (preset: typeof PRESETS[0]) => {
    setStartDate(preset.start())
    setEndDate(preset.end())
    setPreset(preset.label)
  }

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

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-surface-800 rounded-xl w-fit">
          {[
            { id: 'overview', label: 'Visão Geral',        icon: LayoutDashboard },
            { id: 'daily',    label: 'Desempenho Diário',  icon: TableProperties },
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
          {/* Date presets */}
          <div className="flex gap-1 p-1 bg-surface-800 border border-surface-700 rounded-xl">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePreset === p.label
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-800 border border-surface-700 rounded-xl">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPreset('') }}
              className="bg-transparent text-sm text-gray-300 outline-none w-32"
            />
            <span className="text-gray-600">→</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPreset('') }}
              className="bg-transparent text-sm text-gray-300 outline-none w-32"
            />
          </div>

          {/* Campaign filter */}
          <CampaignFilter
            campaigns={campaigns}
            selected={selectedIds}
            onChange={setSelectedIds}
          />
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
                      value={aggData ? metric.getValue(aggData) : 0}
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
                    Segure e arraste os cards para reordenar · clique no × para remover
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: DESEMPENHO DIÁRIO                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'daily' && (
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
                      <Th label="Data"           sortKey="date"            currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Campanha"        sortKey="campaignName"   currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Investido"       sortKey="spend"          currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Compras"         sortKey="purchases"      currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Tx Conv. Compra" sortKey="purchaseRate"   currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Leads"           sortKey="leads"          currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Tx Conv. Lead"   sortKey="leadRate"       currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="CPM"             sortKey="cpm"            currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="CTR"             sortKey="ctr"            currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Frequência"      sortKey="frequency"      currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Alcance"         sortKey="reach"          currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <Th label="Impressões"      sortKey="impressions"    currentKey={sortKey} dir={sortDir} onSort={handleSort} />
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
                        <td className="px-4 py-3 text-gray-200 max-w-[200px]">
                          <span className="block truncate" title={row.campaignName}>{row.campaignName}</span>
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-medium whitespace-nowrap">
                          {fmtCurrency(row.spend)}
                        </td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.purchases)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.purchaseRate)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtNumber(row.leads)}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtPercent(row.leadRate)}</td>
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
                    const t = aggregate(sortedDaily)
                    if (!t) return null
                    return (
                      <tfoot className="border-t-2 border-surface-600 bg-surface-750">
                        <tr>
                          <td className="px-4 py-3 text-xs font-bold text-gray-400" colSpan={2}>TOTAL</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold whitespace-nowrap">{fmtCurrency(t.spend)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtNumber(t.purchases)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtPercent(t.purchaseRate)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtNumber(t.leads)}</td>
                          <td className="px-4 py-3 text-gray-200 font-bold whitespace-nowrap">{fmtPercent(t.leadRate)}</td>
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
    </div>
  )
}
