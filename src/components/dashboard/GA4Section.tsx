'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Users, ShoppingCart, TrendingUp, Clock,
  Activity, Globe, Settings, MousePointerClick,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { GA4Result, GA4ChannelRow, GA4LandingPageRow } from '@/services/ga4/insights'

interface Props {
  workspaceId: string
  startDate:   string
  endDate:     string
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtNum = (v: number) => Math.round(v).toLocaleString('pt-BR')
const fmtCur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtDur = (v: number) => {
  const m = Math.floor(v / 60)
  const s = Math.round(v % 60)
  return `${m}m ${s}s`
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-xl bg-surface-750 flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Channel table ─────────────────────────────────────────────────────────────
function ChannelTable({ channels }: { channels: GA4ChannelRow[] }) {
  const totalSessions = channels.reduce((s, c) => s + c.sessions, 0)
  const isPaidSocial  = (ch: string) =>
    ch.toLowerCase().includes('paid social') || ch.toLowerCase().includes('paid')

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-700 flex items-center gap-2">
        <Globe className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-200">Canais de Tráfego</h3>
        <span className="text-[11px] text-gray-500 ml-1">— performance por origem</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-surface-700 bg-surface-750">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Canal</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Sessões</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">% do Total</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Tx. Engajamento</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Conversões</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Tx. Conversão</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {channels.map(ch => {
              const sharePct   = totalSessions > 0 ? (ch.sessions / totalSessions) * 100 : 0
              const engPct     = ch.sessions > 0 ? (ch.engagedSessions / ch.sessions) * 100 : 0
              const convRate   = ch.sessions > 0 ? (ch.conversions / ch.sessions) * 100 : 0
              const highlight  = isPaidSocial(ch.channel)
              return (
                <tr key={ch.channel} className={`transition-colors ${highlight ? 'bg-indigo-500/[0.04]' : 'hover:bg-surface-750/50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {highlight && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
                      <span className={`text-sm font-medium ${highlight ? 'text-indigo-300' : 'text-gray-200'}`}>
                        {ch.channel}
                      </span>
                      {highlight && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-medium">Meta</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums">{fmtNum(ch.sessions)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: `${Math.min(sharePct, 100)}%` }} />
                      </div>
                      <span className="text-gray-400 tabular-nums text-xs w-9 text-right">{fmtPct(sharePct)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={engPct >= 60 ? 'text-emerald-400' : engPct >= 40 ? 'text-yellow-400' : 'text-gray-400'}>
                      {fmtPct(engPct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums">{fmtNum(ch.conversions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={convRate >= 3 ? 'text-emerald-400' : convRate > 0 ? 'text-gray-300' : 'text-gray-600'}>
                      {convRate > 0 ? fmtPct(convRate) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums whitespace-nowrap">
                    {ch.revenue > 0 ? fmtCur(ch.revenue) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Landing pages table ───────────────────────────────────────────────────────
function LandingPages({ pages }: { pages: GA4LandingPageRow[] }) {
  if (!pages.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-700 flex items-center gap-2">
        <MousePointerClick className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-200">Páginas de Entrada</h3>
        <span className="text-[11px] text-gray-500 ml-1">— primeiras páginas visitadas na sessão</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-surface-700 bg-surface-750">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Página</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Sessões</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Tx. Engajamento</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Conversões</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Tx. Conversão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {pages.map(p => {
              const engPct   = p.sessions > 0 ? (p.engagedSessions / p.sessions) * 100 : 0
              const convRate = p.sessions > 0 ? (p.conversions / p.sessions) * 100 : 0
              const label    = p.page.length > 55 ? p.page.slice(0, 52) + '…' : p.page
              return (
                <tr key={p.page} className="hover:bg-surface-750/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300 font-mono text-xs" title={p.page}>{label || '/'}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums">{fmtNum(p.sessions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={engPct >= 60 ? 'text-emerald-400' : engPct >= 40 ? 'text-yellow-400' : 'text-gray-400'}>
                      {fmtPct(engPct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums">{fmtNum(p.conversions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={convRate >= 3 ? 'text-emerald-400' : convRate > 0 ? 'text-gray-300' : 'text-gray-600'}>
                      {convRate > 0 ? fmtPct(convRate) : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Daily trend chart ─────────────────────────────────────────────────────────
type TrendMetric = 'sessions' | 'conversions' | 'revenue'
const TREND_OPTIONS: { key: TrendMetric; label: string; color: string; currency?: boolean }[] = [
  { key: 'sessions',    label: 'Sessões',    color: '#6366f1'  },
  { key: 'conversions', label: 'Conversões', color: '#10b981'  },
  { key: 'revenue',     label: 'Receita',    color: '#f59e0b', currency: true },
]

function DailyTrend({ daily }: { daily: { date: string; sessions: number; conversions: number; revenue: number }[] }) {
  const [active, setActive] = useState<TrendMetric>('sessions')
  if (daily.length < 2) return null

  const def     = TREND_OPTIONS.find(m => m.key === active)!
  const data    = daily.map(r => ({
    label: new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    value: r[active],
  }))

  const fmtTick = (v: number) =>
    def.currency
      ? (v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`)
      : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))

  const fmtVal = (v: number) =>
    def.currency ? fmtCur(v) : fmtNum(v)

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-200">Tendência Diária</h3>
        </div>
        <div className="flex gap-1">
          {TREND_OPTIONS.map(m => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                active === m.key
                  ? 'border-opacity-40 text-white'
                  : 'border-surface-600 bg-surface-700/40 text-gray-400 hover:text-gray-200'
              }`}
              style={active === m.key ? { borderColor: m.color + '60', background: m.color + '18', color: m.color } : {}}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ga4Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={def.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={def.color} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} dy={6} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={56} tickFormatter={fmtTick} />
          <Tooltip
            cursor={{ stroke: def.color, strokeWidth: 1, strokeOpacity: 0.3 }}
            content={({ active: a, payload, label }) => {
              if (!a || !payload?.length) return null
              return (
                <div className="bg-[#13151f] border border-surface-600 rounded-xl px-3.5 py-2.5 shadow-xl">
                  <p className="text-[11px] text-gray-500 mb-1">{label}</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: def.color }} />
                    <span className="text-xs text-gray-400">{def.label}</span>
                    <span className="text-sm font-bold text-white ml-1">{fmtVal(payload[0]?.value as number)}</span>
                  </div>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="value" stroke={def.color} fill="url(#ga4Grad)" strokeWidth={2.5} dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: def.color, fill: '#13151f' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GA4Section({ workspaceId, startDate, endDate }: Props) {
  const [data,    setData]    = useState<GA4Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/ga4/insights?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}`)
      const json = await res.json()
      if (json.success) setData(json.data as GA4Result)
      else throw new Error(json.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar GA4')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, startDate, endDate])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
      <Loader2 className="w-5 h-5 animate-spin" />
      Carregando Google Analytics...
    </div>
  )

  if (error) return (
    <div className="space-y-3">
      <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
        {error}
      </div>
      {(error.includes('não configurado') || error.includes('Property') || error.includes('GA4')) && (
        <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
          <Settings className="w-3.5 h-3.5" />
          Configure suas credenciais em <strong className="text-gray-400">Config → Analytics</strong>
        </div>
      )}
    </div>
  )

  if (!data) return null

  const { overview, daily, channels, landingPages } = data

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-200">Web Analytics</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Dados do Google Analytics 4 para o período selecionado</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Sessões"
          value={fmtNum(overview.sessions)}
          sub={`${fmtNum(overview.engagedSessions)} engajadas`}
          icon={Activity}
          color="text-indigo-400"
        />
        <KpiCard
          label="Taxa de Engajamento"
          value={fmtPct(overview.engagementRate)}
          sub="sessões com interação real"
          icon={Users}
          color="text-cyan-400"
        />
        <KpiCard
          label="Conversões"
          value={fmtNum(overview.conversions)}
          sub={`${fmtPct(overview.sessionConversionRate)} das sessões`}
          icon={ShoppingCart}
          color="text-emerald-400"
        />
        <KpiCard
          label="Receita (GA4)"
          value={fmtCur(overview.revenue)}
          icon={TrendingUp}
          color="text-green-400"
        />
        <KpiCard
          label="Duração Média"
          value={fmtDur(overview.avgSessionDuration)}
          sub="por sessão"
          icon={Clock}
          color="text-yellow-400"
        />
      </div>

      {/* Channels table */}
      {channels.length > 0 && <ChannelTable channels={channels} />}

      {/* Landing pages table */}
      {landingPages.length > 0 && <LandingPages pages={landingPages} />}

      {/* Daily trend */}
      <DailyTrend daily={daily} />
    </div>
  )
}
