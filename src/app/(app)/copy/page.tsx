'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PenLine, Plus, Trash2, Edit3, Check, Copy, ChevronDown, ChevronUp,
  Sparkles, ArrowLeft, User, Loader2, FileText, Mail, Megaphone,
  ShoppingCart, MousePointerClick, RotateCcw, BookOpen, Info,
  MessageSquare, RefreshCw, FileDown, X, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PersonaSummary {
  id:          string
  name:        string
  expertName:  string
  niche:       string
  toneOfVoice: string
  createdAt:   string
  _count:      { jobs: number }
}

interface PersonaFull extends PersonaSummary {
  targetAvatar:     string
  corePromise:      string
  writingStyle:     string
  painPoints:       string
  objections:       string
  uniqueMechanism:  string
  socialProof:      string
  vocabulary:       string
  avoidVocabulary:  string
  copyReferences:   string
  products:         string
  pricePositioning: string
  ctaStyle:         string
  brandValues:      string
  competitors:      string
}

interface AdVariation {
  texto:  string
  angulo: string
}

interface AdResult {
  headlines:  AdVariation[]
  textos:     AdVariation[]
  titulos:    AdVariation[]
  descricoes: AdVariation[]
  ctas:       AdVariation[]
}

type AppView  = 'generate' | 'personas' | 'persona-form'
type CopyType = 'vsl' | 'email' | 'ad' | 'salespage' | 'capturepage'

// ── Copy type definitions ─────────────────────────────────────────────────────
const COPY_TYPES: {
  id: CopyType; label: string; icon: React.ElementType; desc: string
  subtypes?: { id: string; label: string }[]
}[] = [
  { id: 'vsl', label: 'VSL', icon: FileText, desc: 'Script completo de Video Sales Letter' },
  {
    id: 'email', label: 'E-mail', icon: Mail, desc: 'E-mails de marketing e automação',
    subtypes: [
      { id: 'cold',         label: 'E-mail Frio' },
      { id: 'nurture',      label: 'Nutrição' },
      { id: 'launch',       label: 'Lançamento' },
      { id: 'cart-open',    label: 'Abertura de Carrinho' },
      { id: 'cart-close',   label: 'Fechamento de Carrinho' },
      { id: 'reengagement', label: 'Reengajamento' },
    ],
  },
  {
    id: 'ad', label: 'Anúncio', icon: Megaphone, desc: 'Copy para tráfego pago',
    subtypes: [
      { id: 'facebook',          label: 'Facebook Feed' },
      { id: 'instagram',         label: 'Instagram Feed/Stories' },
      { id: 'youtube-skippable', label: 'YouTube (Skippable)' },
      { id: 'youtube-bumper',    label: 'YouTube (Bumper 6s)' },
    ],
  },
  { id: 'salespage',    label: 'Página de Vendas',  icon: ShoppingCart,    desc: 'Copy completo de landing page' },
  { id: 'capturepage',  label: 'Página de Captura', icon: MousePointerClick, desc: 'Opt-in page de alta conversão' },
]

// ── Blank persona form ────────────────────────────────────────────────────────
const BLANK_PERSONA: Omit<PersonaFull, 'id' | 'createdAt' | '_count'> = {
  name: '', expertName: '', niche: '', targetAvatar: '', corePromise: '',
  toneOfVoice: '', writingStyle: '', painPoints: '', objections: '',
  uniqueMechanism: '', socialProof: '', vocabulary: '', avoidVocabulary: '',
  copyReferences: '', products: '', pricePositioning: '', ctaStyle: '',
  brandValues: '', competitors: '',
}

// ── Small reusable components ─────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <button onClick={handle} className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors flex-shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function AnguloTooltip({ angulo }: { angulo: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded text-indigo-500/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 w-72 bg-surface-750 border border-indigo-500/30 rounded-xl p-3 shadow-2xl">
            <div className="flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-200/90 leading-relaxed">{angulo}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Ad variation card with comment/refine ─────────────────────────────────────
function AdVariationCard({
  index, variation, itemType, personaId, subtype, onRefined,
}: {
  index:       number
  variation:   AdVariation
  itemType:    'headline' | 'texto' | 'titulo' | 'descricao' | 'cta'
  personaId:   string
  subtype:     string
  onRefined:   (v: AdVariation) => void
}) {
  const [showComment, setShowComment] = useState(false)
  const [comment,     setComment]     = useState('')
  const [refining,    setRefining]    = useState(false)

  const isLong = itemType === 'texto'

  const refine = async () => {
    if (!comment.trim()) return toast.error('Escreva um comentário para refinar.')
    setRefining(true)
    try {
      const res  = await fetch('/api/copy/refine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          personaId,
          subtype,
          itemType,
          originalText:   variation.texto,
          originalAngulo: variation.angulo,
          comment,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onRefined(json.data)
      setComment('')
      setShowComment(false)
      toast.success('Variação refinada!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao refinar')
    } finally {
      setRefining(false)
    }
  }

  return (
    <div className="bg-surface-750 border border-surface-600 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-600/60">
        <span className="text-xs font-bold text-indigo-400 font-mono w-5 flex-shrink-0">{index + 1}</span>
        <AnguloTooltip angulo={variation.angulo} />
        <div className="flex-1" />
        <CopyBtn text={variation.texto} />
        <button
          onClick={() => setShowComment(!showComment)}
          className={`p-1.5 rounded transition-colors flex-shrink-0 ${
            showComment
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10'
          }`}>
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {isLong ? (
          <div className="space-y-1.5">
            {variation.texto.split(/\n+/).filter(Boolean).map((line, i) => (
              <p key={i} className="text-sm text-gray-200 leading-relaxed">{line}</p>
            ))}
          </div>
        ) : (
          <p className={`leading-snug ${
            itemType === 'headline' ? 'text-base font-semibold text-gray-100' : 'text-sm text-gray-200'
          }`}>{variation.texto}</p>
        )}
      </div>

      {/* Comment box */}
      {showComment && (
        <div className="px-3 pb-3 pt-1 border-t border-amber-500/20 bg-amber-500/5 space-y-2">
          <p className="text-[11px] text-amber-400/80 font-medium">Instrução para a IA refinar esta variação</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ex: Deixa mais urgente, muda o ângulo para storytelling, aumenta o tamanho, usa mais emojis..."
            rows={2}
            className="w-full rounded-lg bg-surface-800 border border-amber-500/30 text-gray-100
              placeholder-gray-600 px-3 py-2 text-xs focus:outline-none focus:ring-2
              focus:ring-amber-500/40 resize-none leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowComment(false); setComment('') }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Cancelar
            </button>
            <button
              onClick={refine}
              disabled={refining || !comment.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20
                border border-amber-500/40 text-xs font-medium text-amber-300
                hover:bg-amber-600/30 transition-colors disabled:opacity-50 ml-auto">
              {refining
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Refinando...</>
                : <><RefreshCw className="w-3 h-3" /> Refinar com IA</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ad section: 5 variations for one element ──────────────────────────────────
function AdSection({
  title, items, itemType, personaId, subtype, onUpdate,
}: {
  title:     string
  items:     AdVariation[]
  itemType:  'headline' | 'texto' | 'titulo' | 'descricao' | 'cta'
  personaId: string
  subtype:   string
  onUpdate:  (index: number, v: AdVariation) => void
}) {
  const [open, setOpen] = useState(true)
  const copyAll = () => {
    navigator.clipboard.writeText(items.map((v, i) => `${i + 1}. ${v.texto}`).join('\n\n'))
    toast.success('Todas as variações copiadas!')
  }

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
          <span className="text-sm font-semibold text-gray-200">{title}</span>
          <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
            {items.length} variações
          </span>
          {open
            ? <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
            : <ChevronUp   className="w-4 h-4 text-gray-500 ml-auto" />}
        </button>
        <button onClick={copyAll} className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors ml-2 flex-shrink-0">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          {items.map((v, i) => (
            <AdVariationCard
              key={i}
              index={i}
              variation={v}
              itemType={itemType}
              personaId={personaId}
              subtype={subtype}
              onRefined={refined => onUpdate(i, refined)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ad result panel ───────────────────────────────────────────────────────────
function AdResultPanel({
  data, personaId, subtype, onUpdate,
}: {
  data:      AdResult
  personaId: string
  subtype:   string
  onUpdate:  (section: keyof AdResult, index: number, v: AdVariation) => void
}) {
  return (
    <div className="space-y-4">
      {data.headlines  && (
        <AdSection title="Headlines" items={data.headlines} itemType="headline"
          personaId={personaId} subtype={subtype}
          onUpdate={(i, v) => onUpdate('headlines', i, v)} />
      )}
      {data.textos && (
        <AdSection title="Textos Principais" items={data.textos} itemType="texto"
          personaId={personaId} subtype={subtype}
          onUpdate={(i, v) => onUpdate('textos', i, v)} />
      )}
      {data.titulos && (
        <AdSection title="Títulos (máx 30 chars)" items={data.titulos} itemType="titulo"
          personaId={personaId} subtype={subtype}
          onUpdate={(i, v) => onUpdate('titulos', i, v)} />
      )}
      {data.descricoes && (
        <AdSection title="Descrições (máx 30 chars)" items={data.descricoes} itemType="descricao"
          personaId={personaId} subtype={subtype}
          onUpdate={(i, v) => onUpdate('descricoes', i, v)} />
      )}
      {data.ctas && (
        <AdSection title="CTAs" items={data.ctas} itemType="cta"
          personaId={personaId} subtype={subtype}
          onUpdate={(i, v) => onUpdate('ctas', i, v)} />
      )}
    </div>
  )
}

// ── Generic result section (for non-ad types) ─────────────────────────────────
function ResultSection({ title, content, list }: { title: string; content?: string; list?: string[] }) {
  const [open, setOpen] = useState(true)
  const copyText = list ? list.join('\n') : (content ?? '')
  if (!copyText?.trim()) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
          <span className="text-sm font-semibold text-gray-200">{title}</span>
          {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
        </button>
        <CopyBtn text={copyText} />
      </div>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-surface-700/60">
          {list ? (
            <div className="space-y-2">
              {list.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 bg-surface-750 border border-surface-600 rounded-xl">
                  <span className="text-xs font-mono text-indigo-400 w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-gray-200 leading-relaxed flex-1">{item}</p>
                  <CopyBtn text={item} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
        </div>
      )}
    </div>
  )
}

function RenderResult({ type, data }: { type: CopyType; data: Record<string, unknown> }) {
  const sections: { title: string; key: string; list?: boolean }[] = {
    vsl: [
      { title: 'Hook (abertura)',   key: 'hook' },
      { title: 'Problema',          key: 'problema' },
      { title: 'Agitação',          key: 'agitacao' },
      { title: 'Mecanismo único',   key: 'mecanismo' },
      { title: 'Prova social',      key: 'prova_social' },
      { title: 'Oferta',            key: 'oferta' },
      { title: 'Bônus',             key: 'bonus' },
      { title: 'Garantia',          key: 'garantia' },
      { title: 'Urgência',          key: 'urgencia' },
      { title: 'CTA',               key: 'cta' },
    ],
    email: [
      { title: 'Assuntos (3 opções)', key: 'assuntos', list: true },
      { title: 'Preview text',        key: 'preview' },
      { title: 'Corpo do e-mail',     key: 'corpo' },
      { title: 'CTA',                 key: 'cta' },
    ],
    ad: [],
    salespage: [
      { title: 'Headline principal',    key: 'hero_headline' },
      { title: 'Subheadline',           key: 'hero_subheadline' },
      { title: 'Problema',              key: 'problema' },
      { title: 'Agitação',              key: 'agitacao' },
      { title: 'Mecanismo único',       key: 'mecanismo' },
      { title: 'Para quem é',           key: 'para_quem' },
      { title: 'O que você vai ter',    key: 'o_que_voce_vai_ter' },
      { title: 'Prova social',          key: 'prova_social' },
      { title: 'Oferta',                key: 'oferta' },
      { title: 'Bônus',                 key: 'bonus' },
      { title: 'Garantia',              key: 'garantia' },
      { title: 'FAQ',                   key: 'faq' },
      { title: 'CTA principal',         key: 'cta_principal' },
    ],
    capturepage: [
      { title: 'Headline',      key: 'headline' },
      { title: 'Subheadline',   key: 'subheadline' },
      { title: 'Bullets',       key: 'bullets', list: true },
      { title: 'CTA do botão',  key: 'cta_botao' },
      { title: 'Credibilidade', key: 'credibilidade' },
    ],
  }[type] ?? []

  return (
    <div className="space-y-3">
      {sections.map(s => {
        const val = data[s.key]
        if (!val) return null
        if (s.list && Array.isArray(val)) return <ResultSection key={s.key} title={s.title} list={val as string[]} />
        if (typeof val === 'string')      return <ResultSection key={s.key} title={s.title} content={val} />
        return null
      })}
    </div>
  )
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function FormField({ label, hint, value, onChange, rows = 3, required = false, placeholder = '' }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
  rows?: number; required?: boolean; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <label className="text-xs font-semibold text-gray-300">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-gray-600">{hint}</span>}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100
          placeholder-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2
          focus:ring-indigo-500 resize-none leading-relaxed" />
    </div>
  )
}

function FormInput({ label, hint, value, onChange, required = false, placeholder = '' }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
  required?: boolean; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <label className="text-xs font-semibold text-gray-300">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-gray-600">{hint}</span>}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100
          placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function CopyAgentPage() {
  const [view,            setView]            = useState<AppView>('generate')
  const [personas,        setPersonas]        = useState<PersonaSummary[]>([])
  const [selectedPersona, setSelectedPersona] = useState<PersonaSummary | null>(null)
  const [copyType,        setCopyType]        = useState<CopyType | null>(null)
  const [subtype,         setSubtype]         = useState('')
  const [brief,           setBrief]           = useState('')
  const [generating,      setGenerating]      = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [result,          setResult]          = useState<Record<string, unknown> | null>(null)
  const [loadingPersonas, setLoadingPersonas] = useState(true)

  // Persona form state
  const [editingPersona, setEditingPersona] = useState<PersonaFull | null>(null)
  const [formData,       setFormData]       = useState({ ...BLANK_PERSONA })
  const [savingPersona,  setSavingPersona]  = useState(false)
  const [deletingId,     setDeletingId]     = useState<string | null>(null)

  // ── Load personas ─────────────────────────────────────────────────────────
  const loadPersonas = useCallback(async () => {
    setLoadingPersonas(true)
    try {
      const res  = await fetch('/api/copy/personas')
      const json = await res.json()
      if (json.success) setPersonas(json.data)
    } catch { toast.error('Erro ao carregar personas') }
    finally   { setLoadingPersonas(false) }
  }, [])

  useEffect(() => { loadPersonas() }, [loadPersonas])

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!selectedPersona) return toast.error('Selecione uma persona.')
    if (!copyType)        return toast.error('Selecione o tipo de copy.')
    const typeConfig = COPY_TYPES.find(t => t.id === copyType)
    if (typeConfig?.subtypes && !subtype) return toast.error('Selecione o subtipo.')

    setGenerating(true)
    setResult(null)
    try {
      const res  = await fetch('/api/copy/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ personaId: selectedPersona.id, copyType, subtype, brief }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      toast.success('Copy gerado! 🔥')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na geração')
    } finally {
      setGenerating(false)
    }
  }

  // ── Update single ad variation after refine ───────────────────────────────
  const updateAdVariation = (
    section: keyof AdResult,
    index:   number,
    refined: AdVariation,
  ) => {
    setResult(prev => {
      if (!prev) return prev
      const adData = prev as AdResult
      const updated = [...(adData[section] ?? [])]
      updated[index] = refined
      return { ...prev, [section]: updated }
    })
  }

  // ── Export DOCX ───────────────────────────────────────────────────────────
  const exportDocx = async () => {
    if (!result || !selectedPersona || !copyType) return
    setExporting(true)
    try {
      const res = await fetch('/api/copy/export', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          personaName: selectedPersona.name,
          expertName:  selectedPersona.expertName,
          copyType,
          subtype,
          brief,
          result,
        }),
      })
      if (!res.ok) throw new Error('Erro ao gerar DOCX')
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `copy-${selectedPersona.expertName.toLowerCase().replace(/\s+/g, '-')}-${copyType}.docx`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('DOCX exportado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setExporting(false)
    }
  }

  // ── Save persona ──────────────────────────────────────────────────────────
  const savePersona = async () => {
    setSavingPersona(true)
    try {
      const url    = editingPersona ? `/api/copy/personas/${editingPersona.id}` : '/api/copy/personas'
      const method = editingPersona ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(editingPersona ? 'Persona atualizada!' : 'Persona criada!')
      await loadPersonas()
      setView('personas')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSavingPersona(false)
    }
  }

  // ── Delete persona ────────────────────────────────────────────────────────
  const deletePersona = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/copy/personas/${id}`, { method: 'DELETE' })
      toast.success('Persona removida.')
      if (selectedPersona?.id === id) setSelectedPersona(null)
      await loadPersonas()
    } catch { toast.error('Erro ao remover') }
    finally  { setDeletingId(null) }
  }

  const openNewPersona  = () => { setEditingPersona(null); setFormData({ ...BLANK_PERSONA }); setView('persona-form') }
  const openEditPersona = async (p: PersonaSummary) => {
    try {
      const res  = await fetch(`/api/copy/personas/${p.id}`)
      const json = await res.json()
      if (!json.success) throw new Error()
      setEditingPersona(json.data)
      setFormData(json.data)
      setView('persona-form')
    } catch { toast.error('Erro ao carregar persona') }
  }

  const field = (key: keyof typeof formData) => ({
    value: formData[key], onChange: (v: string) => setFormData(prev => ({ ...prev, [key]: v })),
  })

  const resetGenerate = () => { setResult(null); setBrief(''); setSubtype('') }

  // ════════════════════════════════════════════════════════════════════════════
  // ── VIEW: Persona Form ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'persona-form') return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('personas')}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {editingPersona ? `Editar: ${editingPersona.name}` : 'Nova Persona'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure o perfil completo do expert para copy preciso.</p>
        </div>
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Identidade do Expert
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Nome desta persona" required placeholder="Ex: João - Marketing Digital" {...field('name')} />
          <FormInput label="Nome completo do expert" required placeholder="Ex: João Silva" {...field('expertName')} />
        </div>
        <FormInput label="Nicho de mercado" required placeholder="Ex: Marketing Digital para donos de negócio local" {...field('niche')} />
        <FormField label="Produtos e ofertas" hint="nome + preço + o que inclui"
          placeholder="Ex: Método VSL Magnética — R$997 (curso online + comunidade + mentoria em grupo)"
          rows={2} {...field('products')} />
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" /> Audiência e Transformação
        </h2>
        <FormField label="Avatar ideal" required
          hint="quem é, quantos anos tem, qual a dor central, o que já tentou, o que sonha"
          placeholder="Ex: Homens de 28-45 anos, donos de negócio que faturam entre R$10k-R$50k/mês..."
          rows={4} {...field('targetAvatar')} />
        <FormField label="Promessa central / transformação" required hint="resultado tangível"
          placeholder="Ex: Criar uma VSL em 48h que converte acima de 3% sem precisar aparecer na câmera"
          rows={2} {...field('corePromise')} />
        <FormField label="Dores principais da audiência" required hint="liste as 3-5 maiores dores"
          placeholder="1. Gasta em tráfego mas a VSL não converte&#10;2. Trava na câmera ou não sabe escrever copy&#10;3. Já tentou cursos genéricos"
          rows={4} {...field('painPoints')} />
        <FormField label="Objeções e como o expert responde" required
          hint="objeções + resposta do expert"
          placeholder="'Não tenho tempo' → O método leva 48h, não 6 meses.&#10;'Já tentei e não funcionou' → Você tentou com método genérico..."
          rows={4} {...field('objections')} />
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
          <PenLine className="w-3.5 h-3.5" /> Tom e Estilo de Escrita
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tom de voz" required rows={2}
            placeholder="Ex: direto, provocativo, sem rodeios, às vezes irônico mas empático com a dor"
            {...field('toneOfVoice')} />
          <FormField label="Estilo de escrita" required rows={2}
            placeholder="Ex: storytelling pessoal + dados concretos + urgência real sem pressão falsa"
            {...field('writingStyle')} />
        </div>
        <FormField label="Vocabulário característico (USE SEMPRE)" required
          hint="expressões, gírias, palavras marca registrada do expert"
          placeholder="Ex: 'olha só', 'deixa eu te mostrar', 'VSL magnética', 'método de 48h', 'sem aparecer'"
          rows={3} {...field('vocabulary')} />
        <FormField label="Vocabulário a EVITAR"
          hint="clichês ou expressões que o expert nunca usaria"
          placeholder="Ex: 'você merece', 'segredo revelado', 'fórmula mágica'"
          rows={2} {...field('avoidVocabulary')} />
        <FormField label="Estilo de CTA" hint="como o expert fecha e convida à ação"
          placeholder="Ex: Usa CTA direto e imperativo. 'Clica no botão agora.' Nunca pede, ordena com contexto de valor."
          rows={2} {...field('ctaStyle')} />
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" /> Mecanismo Único e Diferenciação
        </h2>
        <FormField label="Mecanismo único / método proprietário" required hint="nome + lógica do método"
          placeholder="Ex: Método VSL Magnética — 4 blocos de copy (Gancho, Dor, Mecanismo, Oferta) montados em sequência com IA..."
          rows={4} {...field('uniqueMechanism')} />
        <FormField label="Valores e posicionamento de marca"
          placeholder="Ex: Anti-guru. Mostra os bastidores. Não vende sonho, vende método. Transparente com números reais."
          rows={2} {...field('brandValues')} />
        <FormField label="Diferenciação dos concorrentes" hint="quem são e por que o expert é diferente"
          placeholder="Ex: Diferente do concorrente X que vende template genérico, aqui o método é calibrado por nicho..."
          rows={3} {...field('competitors')} />
        <FormField label="Posicionamento de preço / ancoragem"
          placeholder="Ex: Ancora em R$5.000 de consultoria antes de revelar o preço. Usa 'menos que um jantar por semana'."
          rows={2} {...field('pricePositioning')} />
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> Prova Social e Referências de Copy
        </h2>
        <FormField label="Prova social (resultados, números, depoimentos)" required
          hint="resultados reais, nomes, métricas, conquistas"
          placeholder="Ex: +340 alunos. Média de 2,8% de conversão. Aluno Carlos saiu de R$0 para R$47k em 90 dias..."
          rows={4} {...field('socialProof')} />
        <FormField label="Referências de copy existentes"
          hint="cole trechos de copies, scripts ou posts do expert"
          placeholder="Cole aqui trechos de copies já escritos, scripts de vídeo, posts de redes sociais..."
          rows={6} {...field('copyReferences')} />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => setView('personas')}
          className="flex-1 py-3 rounded-xl border border-surface-600 text-sm text-gray-400 hover:text-gray-200 hover:border-surface-500 transition-colors">
          Cancelar
        </button>
        <Button onClick={savePersona} loading={savingPersona} size="lg" className="flex-2 flex-1">
          <Check className="w-4 h-4" />
          {editingPersona ? 'Salvar alterações' : 'Criar persona'}
        </Button>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // ── VIEW: Personas Manager ────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'personas') return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('generate')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Personas</h1>
            <p className="text-sm text-gray-500 mt-0.5">Perfis de expert para geração de copy.</p>
          </div>
        </div>
        <button onClick={openNewPersona}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">
          <Plus className="w-4 h-4" /> Nova persona
        </button>
      </div>

      {loadingPersonas ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : personas.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mx-auto">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-sm text-gray-400">Nenhuma persona criada ainda.</p>
          <button onClick={openNewPersona} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Criar a primeira persona →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {personas.map(p => (
            <div key={p.id} className="bg-surface-800 border border-surface-700 rounded-2xl p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-100">{p.name}</p>
                  <span className="text-[11px] text-gray-500 bg-surface-700 px-2 py-0.5 rounded-full">
                    {p._count.jobs} cop{p._count.jobs !== 1 ? 'ies' : 'y'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{p.expertName} · {p.niche}</p>
                <p className="text-xs text-gray-600 mt-1 italic">{p.toneOfVoice}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEditPersona(p)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-surface-700 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deletePersona(p.id)} disabled={deletingId === p.id}
                  className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-surface-700 transition-colors disabled:opacity-40">
                  {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // ── VIEW: Generate ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  const selectedType = COPY_TYPES.find(t => t.id === copyType)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PenLine className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Copy Agent</h1>
            <p className="text-sm text-gray-500 mt-0.5">VSL, e-mail, anúncio e páginas no tom do expert.</p>
          </div>
        </div>
        <button onClick={() => setView('personas')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-800">
          <User className="w-3.5 h-3.5" /> Personas
        </button>
      </div>

      {/* ── Result view ── */}
      {result && copyType ? (
        <div className="space-y-4">
          {/* Result header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedType && <selectedType.icon className="w-4 h-4 text-indigo-400" />}
              <span className="text-sm font-semibold text-gray-200">
                {selectedType?.label}{subtype ? ` · ${selectedType?.subtypes?.find(s => s.id === subtype)?.label}` : ''}
              </span>
              {selectedPersona && (
                <span className="text-xs text-gray-500 bg-surface-800 border border-surface-700 px-2 py-0.5 rounded-full">
                  {selectedPersona.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportDocx} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/40
                  bg-indigo-600/10 text-xs font-medium text-indigo-300 hover:bg-indigo-600/20
                  hover:border-indigo-500/60 transition-colors disabled:opacity-50">
                {exporting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                  : <><FileDown className="w-3.5 h-3.5" /> Exportar DOCX</>}
              </button>
              <button onClick={resetGenerate}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Gerar novamente
              </button>
            </div>
          </div>

          {/* Hint for ad type */}
          {copyType === 'ad' && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-300/80 leading-relaxed">
                Cada variação tem 5 ângulos distintos. Clique no <span className="font-semibold">ℹ</span> para ver a estratégia por trás, no <span className="font-semibold">💬</span> para comentar e pedir refinamento.
              </p>
            </div>
          )}

          {/* Render result */}
          {copyType === 'ad' && selectedPersona ? (
            <AdResultPanel
              data={result as AdResult}
              personaId={selectedPersona.id}
              subtype={subtype}
              onUpdate={updateAdVariation}
            />
          ) : (
            <RenderResult type={copyType} data={result} />
          )}
        </div>
      ) : (
        <>
          {/* Persona selector */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-300">
                Persona do expert <span className="text-red-400">*</span>
              </span>
              {personas.length > 0 && (
                <button onClick={openNewPersona}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Nova
                </button>
              )}
            </div>

            {loadingPersonas ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-sm text-gray-500">Carregando personas...</span>
              </div>
            ) : personas.length === 0 ? (
              <button onClick={openNewPersona}
                className="w-full py-4 rounded-xl border-2 border-dashed border-surface-600
                  hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-sm text-gray-500
                  hover:text-indigo-300 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Criar primeira persona
              </button>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {personas.map(p => (
                  <button key={p.id} onClick={() => setSelectedPersona(p)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selectedPersona?.id === p.id
                        ? 'border-indigo-500/50 bg-indigo-500/8'
                        : 'border-surface-700 hover:border-surface-600 hover:bg-surface-750'
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedPersona?.id === p.id
                        ? 'bg-indigo-500/20 border border-indigo-500/40'
                        : 'bg-surface-700 border border-surface-600'
                    }`}>
                      <User className={`w-4 h-4 ${selectedPersona?.id === p.id ? 'text-indigo-400' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate">{p.expertName} · {p.niche}</p>
                    </div>
                    {selectedPersona?.id === p.id && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy type selector */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
            <span className="text-sm font-semibold text-gray-300 block">
              Tipo de copy <span className="text-red-400">*</span>
            </span>
            <div className="grid grid-cols-5 gap-2">
              {COPY_TYPES.map(t => (
                <button key={t.id} onClick={() => { setCopyType(t.id); setSubtype('') }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    copyType === t.id
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'border-surface-700 hover:border-surface-600 hover:bg-surface-750'
                  }`}>
                  <t.icon className={`w-4 h-4 ${copyType === t.id ? 'text-indigo-400' : 'text-gray-500'}`} />
                  <span className={`text-[11px] font-semibold text-center leading-tight ${
                    copyType === t.id ? 'text-indigo-300' : 'text-gray-400'
                  }`}>{t.label}</span>
                </button>
              ))}
            </div>

            {selectedType?.subtypes && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {selectedType.subtypes.map(s => (
                  <button key={s.id} onClick={() => setSubtype(s.id)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      subtype === s.id
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                        : 'border-surface-700 text-gray-400 hover:border-surface-600 hover:text-gray-200'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Brief */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
            <div>
              <span className="text-sm font-semibold text-gray-300 block mb-0.5">Briefing</span>
              <span className="text-xs text-gray-600">Contexto específico desta geração — produto, oferta, data, objetivo...</span>
            </div>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              rows={4}
              placeholder="Ex: Anúncio de Facebook para o Método VSL Magnética com foco na dor de quem gasta em tráfego mas não converte. Objetivo: clique no link. Produto: R$997."
              className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100
                placeholder-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2
                focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>

          <Button
            onClick={generate}
            loading={generating}
            disabled={!selectedPersona || !copyType || (!!selectedType?.subtypes && !subtype)}
            size="lg"
            className="w-full">
            <Sparkles className="w-4 h-4" />
            {generating ? 'Gerando copy...' : 'Gerar copy'}
          </Button>
        </>
      )}
    </div>
  )
}
