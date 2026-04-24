'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  ChartNoAxesCombined, RotateCcw, FileDown, ChevronDown, ChevronUp, Loader2, AlertCircle,
  FileText, List, AlignLeft, Pencil, Layers, AlertTriangle, Lightbulb,
  TrendingDown, Target, BarChart2, Zap, Globe, Shield, Clock, Star,
  HelpCircle, MousePointer, ArrowRight, Activity, type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormState {
  url: string; pageType: string; goal: string; audience: string; offer: string; notes: string
}
interface Metric    { label: string; score: number }
interface ScoreData { metrics: Metric[]; overall: number | null; classification: string | null }
interface PageSpeedData {
  performance: number; seo: number; accessibility: number; bestPractices: number
  lcp: string | null; tbt: string | null; cls: string | null; fcp: string | null
}

const PAGE_TYPES    = ['Página de vendas', 'Página de captura', 'Página de webinar', 'Página de checkout', 'Outro']
const GOAL_EXAMPLES = ['Vender produto', 'Captar leads', 'Levar para WhatsApp', 'Agendar reunião', 'Inscrição em evento']
const METRIC_KEYS   = ['Clareza', 'Persuasão', 'Estrutura', 'Oferta', 'Confiança', 'Potencial']

// ── Parsers ───────────────────────────────────────────────────────────────────
function parseScores(content: string): ScoreData {
  const metrics: Metric[] = []
  for (const label of METRIC_KEYS) {
    const re = new RegExp(`${label}[^0-9\\n]{0,40}?([0-9]+(?:\\.[0-9]+)?)`, 'i')
    const m  = content.match(re)
    if (m) metrics.push({ label, score: Math.min(10, parseFloat(m[1])) })
  }
  const overallM = content.match(/(?:Nota Geral|Geral Final|Média)[^0-9\n]{0,40}?([0-9]+(?:\.[0-9]+)?)/i)
  const overall  = overallM
    ? parseFloat(overallM[1])
    : metrics.length ? parseFloat((metrics.reduce((s, m) => s + m.score, 0) / metrics.length).toFixed(1)) : null
  const classM   = content.match(/\b(Fraca|Básica|Boa|Forte|Muito\s+forte)\b/i)
  return { metrics, overall, classification: classM ? classM[1] : null }
}

function parseSections(md: string) {
  const sections: { title: string; content: string }[] = []
  let current: { title: string; lines: string[] } | null = null
  for (const line of md.split('\n')) {
    if (line.startsWith('# ')) {
      if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() })
      current = { title: line.replace(/^# /, ''), lines: [] }
    } else { current?.lines.push(line) }
  }
  if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() })
  return sections
}

function parseQuickWins(content: string): string[] {
  return content
    .split('\n')
    .filter(l => l.match(/^[-*]\s/))
    .map(l => l.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/\[.*?\]\s*/, '').trim())
    .filter(Boolean)
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function scoreHex(n: number)   { return n >= 8 ? '#10b981' : n >= 6 ? '#f59e0b' : '#ef4444' }
function scoreTw(n: number)    { return n >= 8 ? 'text-emerald-400' : n >= 6 ? 'text-yellow-400' : 'text-red-400' }
function psHex(n: number)      { return n >= 90 ? '#10b981' : n >= 50 ? '#f59e0b' : '#ef4444' }

// ── Circular gauge (audit score) ──────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const r = 46, circ = 2 * Math.PI * r, fill = (score / 10) * circ, color = scoreHex(score)
  return (
    <svg viewBox="0 0 120 120" className="w-[110px] h-[110px] flex-shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="9" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9" strokeOpacity="0.15" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
      <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color} fontFamily="Arial">{score.toFixed(1)}</text>
      <text x="60" y="70" textAnchor="middle" fontSize="10" fill="#475569" fontFamily="Arial">/ 10</text>
    </svg>
  )
}

// ── Mini gauge (PageSpeed score 0–100) ────────────────────────────────────────
function MiniGauge({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r, fill = (score / 100) * circ, color = psHex(score)
  return (
    <svg viewBox="0 0 60 60" className="w-14 h-14">
      <circle cx="30" cy="30" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 30 30)" />
      <text x="30" y="34" textAnchor="middle" fontSize="13" fontWeight="bold" fill={color} fontFamily="Arial">{score}</text>
    </svg>
  )
}

// ── Radar chart ───────────────────────────────────────────────────────────────
function RadarChart({ metrics }: { metrics: Metric[] }) {
  if (metrics.length < 3) return null
  const cx = 130, cy = 135, r = 90, n = metrics.length
  const pt = (i: number, s: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: cx + s * r * Math.cos(a), y: cy + s * r * Math.sin(a) }
  }
  const gridPoly = (s: number) => metrics.map((_, i) => `${pt(i, s).x},${pt(i, s).y}`).join(' ')
  const dataPts  = metrics.map((m, i) => pt(i, m.score / 10))
  const dataPoly = dataPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const labelPt  = (i: number) => {
    const base = pt(i, 1.35)
    const a    = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const anchor = (Math.abs(Math.cos(a)) < 0.15 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end') as 'middle' | 'start' | 'end'
    return { ...base, anchor }
  }
  return (
    <svg viewBox="0 0 260 270" className="w-full max-w-[200px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s} points={gridPoly(s)} fill="none"
          stroke={s === 1 ? '#334155' : '#1e293b'} strokeWidth={s === 1 ? '1' : '0.5'} />
      ))}
      {metrics.map((_, i) => {
        const end = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#1e293b" strokeWidth="1" />
      })}
      <circle cx={cx} cy={cy} r="2" fill="#334155" />
      <polygon points={dataPoly} fill="rgba(99,102,241,0.18)" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill="#6366f1" stroke="#1e1b4b" strokeWidth="1.5" />
      ))}
      {metrics.map((m, i) => {
        const { x, y, anchor } = labelPt(i)
        return (
          <text key={i} x={x.toFixed(1)} y={y.toFixed(1)} textAnchor={anchor}
            dominantBaseline="middle" fontSize="9.5" fill="#94a3b8" fontFamily="Arial">{m.label}</text>
        )
      })}
    </svg>
  )
}

// ── Metric bar ────────────────────────────────────────────────────────────────
function MetricBar({ label, score }: Metric) {
  const color = scoreHex(score)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-700 overflow-hidden">
        <div className="h-1.5 rounded-full" style={{ width: `${score * 10}%`, backgroundColor: color }} />
      </div>
      <span className={`text-xs font-bold w-5 text-right flex-shrink-0 ${scoreTw(score)}`}>{score}</span>
    </div>
  )
}

// ── Classification badge styles ───────────────────────────────────────────────
const CLASS_STYLES: Record<string, string> = {
  'Fraca':       'text-red-400 bg-red-500/10 border-red-500/30',
  'Básica':      'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Boa':         'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'Forte':       'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'Muito forte': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'Muito Forte': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
}

// ── Score hero card ───────────────────────────────────────────────────────────
function ScoreHeroCard({ data }: { data: ScoreData }) {
  const classStyle = CLASS_STYLES[data.classification ?? ''] ?? 'text-gray-400 bg-surface-700 border-surface-600'
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-gray-300">Nota Geral da Página</span>
        </div>
        {data.classification && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${classStyle}`}>
            {data.classification}
          </span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {data.overall !== null && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <ScoreGauge score={data.overall} />
            <span className="text-[11px] text-gray-500">Nota Geral</span>
          </div>
        )}
        <div className="hidden sm:block w-px self-stretch bg-surface-700" />
        {data.metrics.length > 0 && (
          <div className="flex-1 w-full space-y-3.5">
            {data.metrics.map(m => <MetricBar key={m.label} {...m} />)}
          </div>
        )}
        {data.metrics.length >= 3 && (
          <>
            <div className="hidden lg:block w-px self-stretch bg-surface-700" />
            <div className="hidden lg:flex flex-col items-center gap-1 flex-shrink-0">
              <RadarChart metrics={data.metrics} />
              <span className="text-[11px] text-gray-500">Visão radar</span>
            </div>
          </>
        )}
      </div>
      {data.metrics.length >= 3 && (
        <div className="lg:hidden flex flex-col items-center gap-1 pt-2 border-t border-surface-700">
          <RadarChart metrics={data.metrics} />
          <span className="text-[11px] text-gray-500">Visão radar</span>
        </div>
      )}
    </div>
  )
}

// ── Quick Wins icon resolver ──────────────────────────────────────────────────
function quickWinIcon(text: string): { icon: LucideIcon; color: string } {
  const t = text.toLowerCase()
  if (/headline|título|copy|text|gancho|hook/.test(t))   return { icon: AlignLeft,    color: 'text-indigo-400' }
  if (/prova|depoimento|testemunho|social|resultado/.test(t)) return { icon: Star,    color: 'text-yellow-400' }
  if (/garantia|confiança|credib/.test(t))               return { icon: Shield,       color: 'text-cyan-400'   }
  if (/faq|objeção|dúvida|pergunta/.test(t))             return { icon: HelpCircle,   color: 'text-purple-400' }
  if (/urgência|escassez|prazo|limite/.test(t))          return { icon: Clock,        color: 'text-orange-400' }
  if (/cta|botão|chamar|ação|clique/.test(t))            return { icon: MousePointer, color: 'text-emerald-400'}
  if (/estrutura|layout|visual|seção/.test(t))           return { icon: Layers,       color: 'text-orange-400' }
  if (/criativo|vídeo|imagem|criação/.test(t))           return { icon: Lightbulb,    color: 'text-pink-400'   }
  return { icon: ArrowRight, color: 'text-gray-400' }
}

// ── Quick Wins card ───────────────────────────────────────────────────────────
function QuickWinsCard({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="bg-surface-800 border border-amber-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-gray-300">O que melhorar</span>
        <span className="ml-auto text-xs text-gray-600 bg-surface-750 px-2 py-0.5 rounded-full">
          {items.length} itens
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, i) => {
          const { icon: Icon, color } = quickWinIcon(item)
          return (
            <div key={i} className="flex items-start gap-2.5 bg-surface-750 rounded-xl px-3 py-2.5 hover:bg-surface-700 transition-colors">
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${color}`} />
              <span className="text-xs text-gray-300 leading-snug">{item}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PageSpeed card ────────────────────────────────────────────────────────────
function PageSpeedCard({ data, loading }: { data: PageSpeedData | null; loading: boolean }) {
  if (!loading && !data) return null

  const categories = data ? [
    { label: 'Performance',    score: data.performance   },
    { label: 'SEO',            score: data.seo           },
    { label: 'Acessibilidade', score: data.accessibility },
    { label: 'Boas práticas',  score: data.bestPractices },
  ] : []

  const webVitals = data ? [
    data.lcp && { label: 'LCP', value: data.lcp, hint: 'Maior elemento visível' },
    data.fcp && { label: 'FCP', value: data.fcp, hint: 'Primeiro conteúdo' },
    data.tbt && { label: 'TBT', value: data.tbt, hint: 'Bloqueio de thread' },
    data.cls && { label: 'CLS', value: data.cls, hint: 'Estabilidade visual' },
  ].filter(Boolean) as { label: string; value: string; hint: string }[] : []

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-sky-400" />
        <span className="text-sm font-semibold text-gray-300">Performance da Página</span>
        <span className="ml-2 text-[10px] text-gray-600 bg-surface-750 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Mobile
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin ml-auto" />}
      </div>

      {loading && !data && (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Activity className="w-4 h-4 animate-pulse" />
          Consultando PageSpeed Insights...
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Score circles */}
          <div className="grid grid-cols-4 gap-2">
            {categories.map(c => (
              <div key={c.label} className="flex flex-col items-center gap-1.5">
                <MiniGauge score={c.score} />
                <span className="text-[10px] text-gray-500 text-center leading-tight">{c.label}</span>
              </div>
            ))}
          </div>

          {/* Web vitals */}
          {webVitals.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-surface-700">
              {webVitals.map(v => (
                <div key={v.label} title={v.hint}
                  className="flex items-center gap-1.5 bg-surface-750 rounded-lg px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{v.label}</span>
                  <span className="text-xs font-semibold text-gray-200">{v.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section icons ─────────────────────────────────────────────────────────────
const SECTION_ICONS: { kw: string[]; icon: LucideIcon; color: string }[] = [
  { kw: ['resumo', 'executivo'],   icon: FileText,      color: 'text-blue-400'    },
  { kw: ['seção', 'secao'],        icon: List,          color: 'text-violet-400'  },
  { kw: ['headline'],              icon: AlignLeft,     color: 'text-indigo-400'  },
  { kw: ['copy'],                  icon: Pencil,        color: 'text-cyan-400'    },
  { kw: ['estrutura'],             icon: Layers,        color: 'text-orange-400'  },
  { kw: ['faltando', 'ausente'],   icon: AlertTriangle, color: 'text-yellow-400'  },
  { kw: ['criativo'],              icon: Lightbulb,     color: 'text-pink-400'    },
  { kw: ['lacuna'],                icon: TrendingDown,  color: 'text-red-400'     },
  { kw: ['ações', 'prioridade'],   icon: Target,        color: 'text-emerald-400' },
]

function getIcon(title: string): { icon: LucideIcon; color: string } {
  const lower = title.toLowerCase()
  for (const cfg of SECTION_ICONS) {
    if (cfg.kw.some(k => lower.includes(k))) return cfg
  }
  return { icon: FileText, color: 'text-gray-400' }
}

// ── Section card ──────────────────────────────────────────────────────────────
function AuditSection({ title, content, defaultOpen = false }: {
  title: string; content: string; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const { icon: Icon, color } = getIcon(title)

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-750 transition-colors text-left">
        <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
        <span className="text-sm font-semibold text-gray-200 flex-1 leading-snug">{title}</span>
        {open
          ? <ChevronUp   className="w-4 h-4 text-gray-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-3 border-t border-surface-700/60">
          <ReactMarkdown
            components={{
              h2:         ({ children }) => <h2 className="text-sm font-bold text-indigo-400 mt-4 mb-1.5">{children}</h2>,
              h3:         ({ children }) => <h3 className="text-xs font-bold text-gray-300 mt-3 mb-1">{children}</h3>,
              p:          ({ children }) => <p className="text-sm text-gray-300 leading-relaxed mb-2">{children}</p>,
              strong:     ({ children }) => <strong className="text-gray-100 font-semibold">{children}</strong>,
              em:         ({ children }) => <em className="text-gray-400">{children}</em>,
              ul:         ({ children }) => <ul className="space-y-1.5 my-2">{children}</ul>,
              ol:         ({ children }) => <ol className="space-y-1.5 my-2 list-decimal list-inside">{children}</ol>,
              li:         ({ children }) => (
                <li className="text-sm text-gray-300 leading-relaxed flex gap-2 items-start">
                  <span className="text-indigo-400 mt-[3px] flex-shrink-0">•</span>
                  <span>{children}</span>
                </li>
              ),
              code:       ({ children }) => (
                <code className="text-xs bg-surface-700 text-indigo-300 px-1.5 py-0.5 rounded font-mono">{children}</code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-indigo-500/60 pl-3 my-2 italic text-gray-400">{children}</blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const [form, setForm] = useState<FormState>({
    url: '', pageType: 'Página de vendas', goal: '', audience: '', offer: '', notes: '',
  })
  const [auditing,         setAuditing]         = useState(false)
  const [exporting,        setExporting]        = useState(false)
  const [result,           setResult]           = useState<string | null>(null)
  const [pageSpeed,        setPageSpeed]        = useState<PageSpeedData | null>(null)
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false)

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
    return trimmed
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const audit = async () => {
    const normalizedUrl = normalizeUrl(form.url)
    if (normalizedUrl !== form.url) setForm(f => ({ ...f, url: normalizedUrl }))

    if (!normalizedUrl || !form.goal || !form.audience || !form.offer)
      return toast.error('Preencha os campos obrigatórios')

    setAuditing(true)
    setPageSpeed(null)
    setPageSpeedLoading(true)

    // PageSpeed runs in parallel — resolves independently
    fetch(`/api/audit/pagespeed?url=${encodeURIComponent(normalizedUrl)}`)
      .then(r => r.json())
      .then(json => { if (json.success) setPageSpeed(json.data) })
      .catch(() => {})
      .finally(() => setPageSpeedLoading(false))

    try {
      const res  = await fetch('/api/audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, url: normalizedUrl }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na webanalisis')
    } finally {
      setAuditing(false)
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportDocx = async () => {
    if (!result) return
    setExporting(true)
    try {
      const res  = await fetch('/api/audit/export', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, result }),
      })
      if (!res.ok) throw new Error('Erro ao gerar DOCX')
      const blob = await res.blob()
      const slug = form.url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `webanalisis-${slug}.docx`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('DOCX exportado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setExporting(false)
    }
  }

  // ── Results view ──────────────────────────────────────────────────────────
  if (result) {
    const sections       = parseSections(result)
    const scoreIdx       = sections.findIndex(s =>
      s.title.toLowerCase().includes('nota') || !!s.title.match(/^\s*2[\.\s]/)
    )
    const quickWinsIdx   = sections.findIndex(s =>
      s.title.toLowerCase().includes('checklist') ||
      s.title.toLowerCase().includes('quick') ||
      !!s.title.match(/^\s*11[\.\s]/)
    )
    const scoreData      = scoreIdx >= 0 ? parseScores(sections[scoreIdx].content) : null
    const quickWinItems  = quickWinsIdx >= 0 ? parseQuickWins(sections[quickWinsIdx].content) : []
    const skipIdx        = new Set([scoreIdx, quickWinsIdx].filter(i => i >= 0))
    const otherSections  = sections.filter((_, i) => !skipIdx.has(i))

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ChartNoAxesCombined className="w-5 h-5 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Webanalisis</h1>
              <p className="text-xs text-gray-500 truncate max-w-xs">{form.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportDocx} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/10 text-xs text-indigo-300 hover:bg-indigo-600/20 transition-colors disabled:opacity-50">
              <FileDown className="w-3.5 h-3.5" />
              {exporting ? 'Exportando...' : 'Exportar DOCX'}
            </button>
            <button onClick={() => { setResult(null); setPageSpeed(null) }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Nova análise
            </button>
          </div>
        </div>

        {/* Score visualization */}
        {scoreData && (scoreData.overall !== null || scoreData.metrics.length > 0) && (
          <ScoreHeroCard data={scoreData} />
        )}

        {/* PageSpeed */}
        {(pageSpeedLoading || pageSpeed) && (
          <PageSpeedCard data={pageSpeed} loading={pageSpeedLoading} />
        )}

        {/* Quick Wins */}
        {quickWinItems.length > 0 && <QuickWinsCard items={quickWinItems} />}

        {/* Section cards */}
        {otherSections.map((s, i) => (
          <AuditSection key={i} title={s.title} content={s.content} defaultOpen={i === 0} />
        ))}
      </div>
    )
  }

  // ── Input form ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-2.5">
        <ChartNoAxesCombined className="w-5 h-5 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Webanalisis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análise estratégica completa de conversão e copy.</p>
        </div>
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Página a analisar</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            URL da página <span className="text-red-400">*</span>
          </label>
          <input value={form.url} onChange={set('url')}
            onBlur={e => setForm(f => ({ ...f, url: normalizeUrl(e.target.value) }))}
            placeholder="seusite.com.br/pagina"
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Tipo de página</label>
          <select value={form.pageType} onChange={set('pageType')}
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {PAGE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Contexto da análise</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Objetivo principal <span className="text-red-400">*</span>
          </label>
          <input value={form.goal} onChange={set('goal')} list="goals-list"
            placeholder="Ex: Vender produto, captar leads, levar ao WhatsApp..."
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <datalist id="goals-list">{GOAL_EXAMPLES.map(g => <option key={g} value={g} />)}</datalist>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Público-alvo <span className="text-red-400">*</span>
          </label>
          <input value={form.audience} onChange={set('audience')}
            placeholder="Ex: Empreendedores iniciantes no digital, 25–45 anos"
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Oferta / produto / serviço <span className="text-red-400">*</span>
          </label>
          <input value={form.offer} onChange={set('offer')}
            placeholder="Ex: Curso online de tráfego pago, R$497 à vista"
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Observações <span className="text-gray-600">(opcional)</span>
          </label>
          <textarea value={form.notes} onChange={set('notes')} rows={3}
            placeholder="Ex: A página vende um infoproduto de ticket médio..."
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
        <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-300 leading-relaxed">
          O sistema acessa a URL, extrai o conteúdo e envia para análise pelo GPT-4o.
          A geração leva entre 30–60 segundos. Páginas protegidas por login ou CAPTCHA não podem ser acessadas.
        </p>
      </div>

      <Button onClick={audit} loading={auditing} size="lg" className="w-full">
        {auditing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando página...</>
          : <><ChartNoAxesCombined className="w-4 h-4" /> Iniciar webanalisis</>}
      </Button>
    </div>
  )
}
