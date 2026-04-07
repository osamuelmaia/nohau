'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Users, MousePointerClick, ShoppingCart, TrendingUp, Clock, Activity, BarChart3, Globe } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { GA4Result, GA4Overview, GA4DailyRow, GA4ChannelRow } from '@/services/ga4/insights'

interface Props {
  workspaceId: string
  startDate:   string
  endDate:     string
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtNum = (v: number) => Math.round(v).toLocaleString('pt-BR')
const fmtCur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtDur = (v: number) => {
  const m = Math.floor(v / 60)
  const s = Math.round(v % 60)
  return `${m}m ${s}s`
}

// ── Metric card ───────────────────────────────────────────────────────────────
function Card({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-xl bg-surface-700 flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  )
}

// ── Channel bar ───────────────────────────────────────────────────────────────
function ChannelRow({ row, max }: { row: GA4ChannelRow; max: number }) {
  const pct = max > 0 ? (row.sessions / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300 font-medium truncate max-w-[160px]">{row.channel}</span>
        <div className="flex items-center gap-3 text-gray-500 flex-shrink-0">
          <span>{fmtNum(row.sessions)} sessões</span>
          {row.conversions > 0 && <span className="text-emerald-400">{fmtNum(row.conversions)} conv.</span>}
        </div>
      </div>
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
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
      if (json.success) setData(json.data)
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
      {(error.includes('não configurado') || error.includes('Property')) && (
        <p className="text-xs text-gray-500 text-center">
          Configure suas credenciais em <strong className="text-gray-400">Config → Analytics</strong>
        </p>
      )}
    </div>
  )

  if (!data) return null

  const { overview, daily, channels } = data
  const maxSessions = Math.max(...channels.map(c => c.sessions), 1)

  // Format daily for chart
  const chartData = daily.map(r => ({
    date:     new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    Sessões:  r.sessions,
    Usuários: r.users,
  }))

  return (
    <div className="space-y-5">
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card label="Sessões"            value={fmtNum(overview.sessions)}              icon={Activity}          color="text-indigo-400" />
        <Card label="Usuários"           value={fmtNum(overview.users)}                 icon={Users}             color="text-cyan-400"   />
        <Card label="Novos Usuários"     value={fmtNum(overview.newUsers)}              icon={Users}             color="text-blue-400"   />
        <Card label="Pageviews"          value={fmtNum(overview.pageViews)}             icon={MousePointerClick} color="text-violet-400" />
        <Card label="Conversões"         value={fmtNum(overview.conversions)}           icon={ShoppingCart}      color="text-emerald-400"/>
        <Card label="Receita"            value={fmtCur(overview.revenue)}               icon={TrendingUp}        color="text-green-400"  />
        <Card label="Taxa de Rejeição"   value={fmtPct(overview.bounceRate)}            icon={Activity}          color="text-orange-400" />
        <Card label="Duração Média"      value={fmtDur(overview.avgSessionDuration)}    icon={Clock}             color="text-yellow-400" />
      </div>

      {/* Sessions chart */}
      {chartData.length > 1 && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-gray-200">Sessões & Usuários por dia</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ga4Sessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="ga4Users" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1c1c28', border: '1px solid #2a2a3d', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="Sessões"  stroke="#6366f1" fill="url(#ga4Sessions)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Usuários" stroke="#22d3ee" fill="url(#ga4Users)"    strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Channels */}
      {channels.length > 0 && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-gray-200">Fontes de tráfego</span>
          </div>
          <div className="space-y-3">
            {channels.map(c => (
              <ChannelRow key={c.channel} row={c} max={maxSessions} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
