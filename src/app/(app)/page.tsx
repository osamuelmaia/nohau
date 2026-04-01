'use client'

import { useCallback, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { useDropzone } from 'react-dropzone'
import { parseFile, groupCreatives, CreativeFile, CreativeGroup } from '@/lib/group-files'
import { cn, formatFileSize } from '@/lib/utils'
import Button from '@/components/ui/Button'
import {
  Upload, X, Image, Film, Plus, Trash2,
  ChevronRight, Loader2, CheckCircle2, AlertCircle,
  Send, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  storedName: string
  url: string
  originalName: string
  mimeType: string
  type: 'IMAGE' | 'VIDEO'
  group: string
  placement: string
}

type Step = 'upload' | 'form' | 'sending' | 'done'

interface FormData {
  campaignName: string
  adSetName: string
  campaignType: 'CBO' | 'ABO'
  objective: string
  budget: string
  pageId: string
  pixelId: string
  bodyTexts: string[]
  titles: string[]
  descriptions: string[]
  destinationUrl: string
  callToAction: string
  geoLocations: string
}

const OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
  { value: 'OUTCOME_SALES', label: 'Vendas' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
]

const CTAS = [
  { value: 'LEARN_MORE', label: 'Saiba mais' },
  { value: 'SHOP_NOW', label: 'Comprar agora' },
  { value: 'SIGN_UP', label: 'Cadastrar' },
  { value: 'CONTACT_US', label: 'Falar conosco' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'GET_QUOTE', label: 'Orçamento' },
  { value: 'APPLY_NOW', label: 'Inscrever-se' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'NO_BUTTON', label: 'Sem botão' },
]

// ── StringList component ──────────────────────────────────────────────────────
function StringList({ label, placeholder, values, onChange, max = 5 }: {
  label: string; placeholder: string; values: string[]; onChange: (v: string[]) => void; max?: number
}) {
  const items = values.length ? values : ['']
  const update = (i: number, val: string) => {
    const next = [...items]; next[i] = val; onChange(next)
  }
  const add = () => onChange([...items, ''])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-gray-500">{label}</label>
        {items.length < max && (
          <button onClick={add} type="button" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {items.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={v}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg bg-surface-800 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {items.length > 1 && (
              <button onClick={() => remove(i)} type="button" className="text-gray-600 hover:text-red-400 p-2">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">
        {items.length > 1 ? 'Textos aplicados em rotação pelos anúncios' : 'Aplicado em todos os anúncios'}
      </p>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep] = useState<Step>('upload')
  const [pendingFiles, setPendingFiles] = useState<CreativeFile[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [groups, setGroups] = useState<CreativeGroup[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ metaCampaignId: string; adsCreated: number; errors: string[] } | null>(null)
  const counterRef = useRef(0)

  const [form, setForm] = useState<FormData>({
    campaignName: '',
    adSetName: '',
    campaignType: 'CBO',
    objective: 'OUTCOME_TRAFFIC',
    budget: '10',
    pageId: '',
    pixelId: '',
    bodyTexts: [''],
    titles: [''],
    descriptions: [''],
    destinationUrl: '',
    callToAction: 'LEARN_MORE',
    geoLocations: 'BR',
  })

  // ── Dropzone ────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    const parsed = accepted.map((f) => {
      counterRef.current++
      return parseFile(f, String(counterRef.current))
    })
    setPendingFiles((prev) => {
      const next = [...prev, ...parsed]
      setGroups(groupCreatives(next))
      return next
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    multiple: true,
  })

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const next = prev.filter((f) => f.id !== id)
      setGroups(groupCreatives(next))
      return next
    })
  }

  // ── Upload all files via Vercel Blob (client-side, bypasses 4.5MB limit) ─
  const uploadAll = async () => {
    if (!pendingFiles.length) return
    setUploading(true)
    const results: UploadedFile[] = []

    for (const cf of pendingFiles) {
      try {
        const blob = await upload(cf.file.name, cf.file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        })
        results.push({
          storedName: blob.pathname,
          url: blob.url,
          originalName: cf.file.name,
          mimeType: cf.file.type,
          type: cf.file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
          group: cf.group,
          placement: cf.placement,
        })
      } catch {
        toast.error(`Erro ao enviar ${cf.file.name}`)
      }
    }

    setUploadedFiles(results)
    setUploading(false)
    if (results.length) {
      setStep('form')
      toast.success(`${results.length} arquivo(s) enviado(s)`)
    }
  }

  // ── Publish to Meta ──────────────────────────────────────────────────────
  const publish = async () => {
    if (!form.campaignName.trim()) return toast.error('Informe o nome da campanha')
    if (!form.pageId.trim()) return toast.error('Informe o Page ID')
    if (!form.destinationUrl.trim()) return toast.error('Informe a URL de destino')
    if ((form.objective === 'OUTCOME_SALES' || form.objective === 'OUTCOME_LEADS') && !form.pixelId.trim()) {
      return toast.error('Pixel ID é obrigatório para o objetivo ' + (form.objective === 'OUTCOME_SALES' ? 'Vendas' : 'Leads'))
    }

    setStep('sending')
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: form.campaignName,
          adSetName: form.adSetName || `${form.campaignName} - Conjunto 01`,
          campaignType: form.campaignType,
          objective: form.objective,
          budget: parseFloat(form.budget) || 10,
          pageId: form.pageId,
          pixelId: form.pixelId.trim() || undefined,
          bodyTexts: form.bodyTexts.filter(Boolean),
          titles: form.titles.filter(Boolean),
          descriptions: form.descriptions.filter(Boolean),
          destinationUrl: form.destinationUrl,
          callToAction: form.callToAction,
          geoLocations: form.geoLocations.split(',').map((s) => s.trim()).filter(Boolean),
          files: uploadedFiles,
        }),
      })
      const json = await res.json()
      if (json.success || json.data) {
        setResult(json.data)
        setStep('done')
      } else {
        toast.error(json.error ?? 'Erro ao publicar')
        setStep('form')
      }
    } catch {
      toast.error('Erro de conexão')
      setStep('form')
    }
  }

  const reset = () => {
    setPendingFiles([])
    setUploadedFiles([])
    setGroups([])
    setResult(null)
    setStep('upload')
    setForm({ ...form, campaignName: '', adSetName: '' })
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* ── STEP INDICATOR ── */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'form', 'done'] as const).map((s, i) => {
          const labels = { upload: '1. Upload', form: '2. Campanha', done: '3. Enviado' }
          const active = step === s || (step === 'sending' && s === 'form')
          const done = (i === 0 && step !== 'upload') || (i === 1 && (step === 'done' || step === 'sending'))
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                done ? 'bg-emerald-500/15 text-emerald-400' :
                active ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' :
                'bg-surface-800 text-gray-600'
              )}>
                {done ? '✓ ' : ''}{labels[s]}
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-gray-700" />}
            </div>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: UPLOAD                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 'upload' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-white">Upload de criativos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Arraste imagens e vídeos. O sistema agrupa automaticamente pares como <code>ad01_feed</code> + <code>ad01_stories</code>.
            </p>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
              isDragActive ? 'border-brand-500 bg-brand-500/5' : 'border-surface-600 hover:border-surface-500 hover:bg-surface-800/40'
            )}
          >
            <input {...getInputProps()} />
            <Upload className={cn('w-8 h-8 mx-auto mb-3', isDragActive ? 'text-brand-400' : 'text-gray-500')} />
            <p className="text-sm font-medium text-gray-300">
              {isDragActive ? 'Solte aqui' : 'Clique ou arraste os arquivos'}
            </p>
            <p className="text-xs text-gray-600 mt-1">JPG, PNG, MP4, MOV — sem limite de quantidade</p>
          </div>

          {/* File list with groups */}
          {groups.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {groups.length} grupo{groups.length !== 1 ? 's' : ''} detectado{groups.length !== 1 ? 's' : ''} · {pendingFiles.length} arquivo{pendingFiles.length !== 1 ? 's' : ''}
              </p>

              {groups.map((g) => (
                <div key={g.name} className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-700 bg-surface-750">
                    <span className="text-xs font-semibold text-gray-200">{g.name}</span>
                    <span className="text-[10px] text-gray-500 bg-surface-700 px-1.5 py-0.5 rounded">
                      {g.files.length} variação{g.files.length !== 1 ? 'ões' : ''}
                    </span>
                  </div>
                  {/* Files in group */}
                  <div className="divide-y divide-surface-700">
                    {g.files.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                        {/* Thumb */}
                        <div className="w-9 h-9 rounded-lg bg-surface-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {f.preview
                            ? <img src={f.preview} alt="" className="w-full h-full object-cover" />
                            : f.file.type.startsWith('video/')
                              ? <Film className="w-4 h-4 text-gray-400" />
                              : <Image className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-200 truncate">{f.file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-brand-400 bg-brand-600/10 px-1.5 py-0.5 rounded">
                              {f.placement}
                            </span>
                            <span className="text-[10px] text-gray-600">{formatFileSize(f.file.size)}</span>
                          </div>
                        </div>
                        <button onClick={() => removeFile(f.id)} className="text-gray-600 hover:text-red-400 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button onClick={uploadAll} loading={uploading} size="lg" className="w-full">
                <Upload className="w-4 h-4" />
                Confirmar e continuar ({pendingFiles.length} arquivo{pendingFiles.length !== 1 ? 's' : ''})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: FORM                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 'form' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Configurar campanha</h1>
              <p className="text-sm text-gray-500 mt-0.5">{uploadedFiles.length} criativo{uploadedFiles.length !== 1 ? 's' : ''} pronto{uploadedFiles.length !== 1 ? 's' : ''} para enviar</p>
            </div>
            <button onClick={() => setStep('upload')} className="text-xs text-gray-500 hover:text-gray-300">
              ← Voltar
            </button>
          </div>

          {/* Form grid */}
          <div className="space-y-5">

            {/* Campaign */}
            <section className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300">Campanha</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Nome da campanha <span className="text-red-400">*</span></label>
                  <input
                    value={form.campaignName}
                    onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
                    placeholder="Ex: BF24 - Conversões"
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Nome do conjunto</label>
                  <input
                    value={form.adSetName}
                    onChange={(e) => setForm({ ...form, adSetName: e.target.value })}
                    placeholder="Gerado automaticamente se vazio"
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Tipo</label>
                  <div className="flex gap-1 bg-surface-750 border border-surface-600 rounded-lg p-1">
                    {(['CBO', 'ABO'] as const).map((t) => (
                      <button
                        key={t} type="button"
                        onClick={() => setForm({ ...form, campaignType: t })}
                        className={cn('flex-1 py-1 rounded-md text-xs font-semibold transition-all',
                          form.campaignType === t ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200')}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Objetivo</label>
                  <select
                    value={form.objective}
                    onChange={(e) => setForm({ ...form, objective: e.target.value })}
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    {OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Orçamento diário (R$)
                    <span className="text-gray-600 font-normal ml-1">
                      {form.campaignType === 'CBO' ? '(campanha)' : '(conjunto)'}
                    </span>
                  </label>
                  <input
                    type="number" min="1" step="0.01"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

            {/* Destination */}
            <section className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300">Destino</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">URL de destino <span className="text-red-400">*</span></label>
                  <input
                    value={form.destinationUrl}
                    onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
                    placeholder="https://seusite.com.br"
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">CTA</label>
                  <select
                    value={form.callToAction}
                    onChange={(e) => setForm({ ...form, callToAction: e.target.value })}
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    {CTAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Page ID <span className="text-red-400">*</span></label>
                  <input
                    value={form.pageId}
                    onChange={(e) => setForm({ ...form, pageId: e.target.value })}
                    placeholder="ID numérico da página do Facebook"
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Países alvo</label>
                  <input
                    value={form.geoLocations}
                    onChange={(e) => setForm({ ...form, geoLocations: e.target.value })}
                    placeholder="BR,US,PT"
                    className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  Pixel ID
                  {(form.objective === 'OUTCOME_SALES' || form.objective === 'OUTCOME_LEADS') && (
                    <span className="ml-1.5 text-[10px] font-normal text-red-400">*obrigatório para {form.objective === 'OUTCOME_SALES' ? 'Vendas' : 'Leads'}</span>
                  )}
                </label>
                <input
                  value={form.pixelId}
                  onChange={(e) => setForm({ ...form, pixelId: e.target.value })}
                  placeholder="Ex: 1068066063393671"
                  className={cn(
                    'w-full rounded-lg bg-surface-750 border text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    (form.objective === 'OUTCOME_SALES' || form.objective === 'OUTCOME_LEADS') && !form.pixelId.trim()
                      ? 'border-red-500/50'
                      : 'border-surface-600',
                  )}
                />
                {(form.objective === 'OUTCOME_SALES' || form.objective === 'OUTCOME_LEADS') && !form.pixelId.trim() && (
                  <p className="text-[10px] text-red-400/80 mt-1">
                    A Meta exige Pixel ID para os objetivos Vendas e Leads. Sem ele o envio vai falhar.
                  </p>
                )}
              </div>
            </section>

            {/* Texts */}
            <section className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300">Textos do anúncio</h2>
              <StringList label="Texto principal" placeholder="Oferta imperdível por tempo limitado..." values={form.bodyTexts} onChange={(v) => setForm({ ...form, bodyTexts: v })} />
              <StringList label="Título" placeholder="Título chamativo" values={form.titles} onChange={(v) => setForm({ ...form, titles: v })} />
              <StringList label="Descrição (opcional)" placeholder="Descrição complementar" values={form.descriptions} onChange={(v) => setForm({ ...form, descriptions: v })} />
            </section>

            {/* Creative preview */}
            <section className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">
                Criativos ({uploadedFiles.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5">
                    {f.type === 'IMAGE'
                      ? <img src={f.url} alt="" className="w-6 h-6 rounded object-cover" />
                      : <Film className="w-4 h-4 text-gray-400" />
                    }
                    <span className="text-xs text-gray-300">{f.originalName.replace(/\.[^/.]+$/, '')}</span>
                    <span className="text-[10px] text-brand-400 bg-brand-600/10 px-1 py-0.5 rounded">{f.placement}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Submit */}
          <Button onClick={publish} size="lg" className="w-full">
            <Send className="w-4 h-4" />
            Enviar para Meta Ads como rascunho
          </Button>
          <p className="text-xs text-gray-600 text-center">
            Tudo será criado como <strong>PAUSADO</strong> — nenhum centavo gasto até você ativar no Meta Ads Manager
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP: SENDING                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 'sending' && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
          <p className="text-base font-medium text-gray-200">Enviando para Meta Ads...</p>
          <p className="text-sm text-gray-500">Criando campanha, conjunto e {uploadedFiles.length} anúncio{uploadedFiles.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP: DONE                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 'done' && result && (
        <div className="space-y-6">
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Campanha enviada!</h1>
              <p className="text-sm text-gray-400 mt-1">
                {result.adsCreated} anúncio{result.adsCreated !== 1 ? 's' : ''} criado{result.adsCreated !== 1 ? 's' : ''} como rascunho
              </p>
            </div>
          </div>

          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Campaign ID</span>
              <code className="text-xs text-brand-400 bg-brand-600/10 px-2 py-1 rounded font-mono">{result.metaCampaignId}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Anúncios criados</span>
              <span className="text-sm font-semibold text-emerald-400">{result.adsCreated}</span>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Erros parciais</span>
              </div>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-300 pl-6">{e}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 text-center">
            Acesse o Meta Ads Manager para revisar e ativar a campanha
          </p>

          <Button onClick={reset} variant="secondary" size="lg" className="w-full">
            <RefreshCw className="w-4 h-4" />
            Nova campanha
          </Button>
        </div>
      )}
    </div>
  )
}
