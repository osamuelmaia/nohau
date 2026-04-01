'use client'

import { useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import { useDropzone } from 'react-dropzone'
import {
  Scissors, Upload, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp,
  X, Download, RotateCcw, AlertCircle, Play, Clock, Zap, FileVideo,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClipSuggestion {
  id:        string
  startTime: number
  endTime:   number
  title:     string
  hook:      string
  score:     number
}

type Phase = 'idle' | 'uploading' | 'analyzing' | 'review' | 'cutting' | 'done' | 'error'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtDuration(start: number, end: number): string {
  const d = Math.round(end - start)
  return d >= 60 ? `${Math.floor(d / 60)}m${d % 60 > 0 ? `${d % 60}s` : ''}` : `${d}s`
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  if (score >= 6) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
  return 'text-gray-400 bg-surface-700 border-surface-600'
}

function scoreLabel(score: number): string {
  if (score >= 9) return 'Viral'
  if (score >= 7) return 'Forte'
  if (score >= 5) return 'Médio'
  return 'Fraco'
}

// ── Processing step indicator ─────────────────────────────────────────────────
function ProcessingStep({ label, state }: { label: string; state: 'done' | 'active' | 'waiting' }) {
  return (
    <div className="flex items-center gap-3">
      {state === 'done'    && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
      {state === 'active'  && <Loader2      className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />}
      {state === 'waiting' && <Circle       className="w-4 h-4 text-gray-700 flex-shrink-0" />}
      <span className={`text-sm ${
        state === 'done'    ? 'text-gray-400 line-through' :
        state === 'active'  ? 'text-gray-200' :
        'text-gray-600'
      }`}>{label}</span>
    </div>
  )
}

// ── Clip card ─────────────────────────────────────────────────────────────────
function ClipCard({
  clip, onToggle, onEditTitle,
}: {
  clip: ClipSuggestion & { selected: boolean }
  onToggle:    () => void
  onEditTitle: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title,   setTitle]   = useState(clip.title)
  const duration              = clip.endTime - clip.startTime

  const saveTitle = () => {
    if (title.trim()) onEditTitle(title.trim())
    setEditing(false)
  }

  return (
    <div className={`rounded-2xl border transition-all ${
      clip.selected
        ? 'border-indigo-500/40 bg-surface-800'
        : 'border-surface-700 bg-surface-800/50 opacity-60'
    }`}>
      <div className="flex items-start gap-3 p-4">
        {/* Toggle */}
        <button onClick={onToggle}
          className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
            hover:border-indigo-400"
          style={{
            borderColor: clip.selected ? '#6366f1' : '#334155',
            backgroundColor: clip.selected ? '#6366f1' : 'transparent',
          }}>
          {clip.selected && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title + score */}
          <div className="flex items-start gap-2">
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                className="flex-1 text-sm font-semibold bg-surface-700 text-gray-100 rounded-lg px-2 py-1
                  border border-indigo-500/60 focus:outline-none"
              />
            ) : (
              <button onClick={() => setEditing(true)}
                className="flex-1 text-sm font-semibold text-gray-200 text-left hover:text-indigo-300
                  transition-colors leading-snug truncate" title="Clique para editar">
                {clip.title}
              </button>
            )}
            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreColor(clip.score)}`}>
              {scoreLabel(clip.score)} {clip.score}/10
            </span>
          </div>

          {/* Time + duration */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Play  className="w-3 h-3" />
              {fmtTime(clip.startTime)} → {fmtTime(clip.endTime)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtDuration(clip.startTime, clip.endTime)}
            </span>
          </div>

          {/* Hook */}
          <p className="text-xs text-gray-400 leading-relaxed italic border-l-2 border-indigo-500/30 pl-2.5">
            "{clip.hook}"
          </p>
        </div>
      </div>

      {/* Duration bar */}
      <div className="px-4 pb-3">
        <div className="h-1 rounded-full bg-surface-700 overflow-hidden">
          <div className="h-1 rounded-full bg-indigo-500/60"
            style={{ width: `${Math.min(100, (duration / 120) * 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CliperPage() {
  const [phase,          setPhase]          = useState<Phase>('idle')
  const [file,           setFile]           = useState<File | null>(null)
  const [uploadPct,      setUploadPct]      = useState(0)
  const [analysisStep,   setAnalysisStep]   = useState<0 | 1 | 2>(0) // 0=audio 1=whisper 2=gpt
  const [jobId,          setJobId]          = useState('')
  const [duration,       setDuration]       = useState(0)
  const [transcript,     setTranscript]     = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [clips,          setClips]          = useState<(ClipSuggestion & { selected: boolean })[]>([])
  const [cutting,        setCutting]        = useState(false)
  const [errorMsg,       setErrorMsg]       = useState('')

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4':        ['.mp4'],
      'video/quicktime':  ['.mov'],
      'video/x-msvideo':  ['.avi'],
      'video/webm':       ['.webm'],
      'video/x-matroska': ['.mkv'],
    },
    maxFiles: 1,
    disabled: phase !== 'idle',
    onDropRejected: () => toast.error('Formato não suportado. Use MP4, MOV, MKV ou WEBM.'),
  })

  // ── Analisar vídeo ──────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!file) return toast.error('Selecione um vídeo primeiro.')

    setPhase('uploading')
    setUploadPct(0)

    try {
      // ── 1. Upload para Vercel Blob (sem limite de tamanho) ──────────────────
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      setUploadPct(100)

      // ── 2. Inicia análise enviando apenas a URL ─────────────────────────────
      setPhase('analyzing')
      setAnalysisStep(0)
      setTimeout(() => setAnalysisStep(1), 5_000)
      setTimeout(() => setAnalysisStep(2), 30_000)

      const res = await fetch('/api/cliper/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ blobUrl: blob.url, filename: file.name, mimetype: file.type }),
      })

      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error ?? 'Erro desconhecido')
        setPhase('error')
        return
      }

      setJobId(json.jobId)
      setDuration(json.duration)
      setTranscript(json.transcript)
      setClips(json.clips.map((c: ClipSuggestion) => ({ ...c, selected: c.score >= 7 })))
      setPhase('review')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao processar.')
      setPhase('error')
    }
  }

  // ── Cortar clips ─────────────────────────────────────────────────────────────
  const cut = async () => {
    const selected = clips.filter(c => c.selected)
    if (!selected.length) return toast.error('Selecione pelo menos 1 clip.')

    setCutting(true)
    setPhase('cutting')

    try {
      const res = await fetch('/api/cliper/cut', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          jobId,
          clips: selected.map(c => ({
            id:        c.id,
            startTime: c.startTime,
            endTime:   c.endTime,
            title:     c.title,
          })),
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Erro ao cortar vídeo' }))
        throw new Error(json.error)
      }

      // Download do ZIP
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `cliper-${selected.length}-clips.zip`
      a.click()
      URL.revokeObjectURL(url)

      setPhase('done')
      toast.success(`${selected.length} clip${selected.length > 1 ? 's' : ''} prontos!`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao cortar vídeo')
      setPhase('error')
    } finally {
      setCutting(false)
    }
  }

  const reset = () => {
    setPhase('idle')
    setFile(null)
    setUploadPct(0)
    setAnalysisStep(0)
    setJobId('')
    setDuration(0)
    setTranscript('')
    setClips([])
    setErrorMsg('')
    setShowTranscript(false)
  }

  const toggleClip    = (id: string)           => setClips(cs => cs.map(c => c.id === id ? { ...c, selected: !c.selected } : c))
  const editTitle     = (id: string, t: string) => setClips(cs => cs.map(c => c.id === id ? { ...c, title: t } : c))
  const toggleAll     = (val: boolean)          => setClips(cs => cs.map(c => ({ ...c, selected: val })))
  const selectedCount = clips.filter(c => c.selected).length

  // ══════════════════════════════════════════════════════════════════════════════
  // ── VIEWS ────────────────────────────────────────────────────────────────────

  // ── Upload ───────────────────────────────────────────────────────────────────
  if (phase === 'idle') return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-2">
        <Scissors className="w-5 h-5 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Cliper</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sobe o vídeo longo → IA encontra os melhores momentos → você baixa os clips prontos.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()}
        className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-indigo-400 bg-indigo-500/5'
            : file
              ? 'border-indigo-500/40 bg-indigo-500/5'
              : 'border-surface-600 hover:border-surface-500 bg-surface-800 hover:bg-surface-750'
        }`}>
        <input {...getInputProps()} />

        {file ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <FileVideo className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200 truncate">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {file.size >= 1024 ** 3
                  ? `${(file.size / 1024 ** 3).toFixed(2)} GB`
                  : `${(file.size / 1024 ** 2).toFixed(1)} MB`}
                {' · '}
                <button onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="text-gray-600 hover:text-gray-400 underline transition-colors">
                  remover
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-surface-700 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300">
                {isDragActive ? 'Solte o vídeo aqui' : 'Arraste o vídeo ou clique para selecionar'}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">MP4, MOV, MKV, WEBM — qualquer tamanho</p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
        <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-300/80 leading-relaxed">
          O vídeo é processado localmente — o áudio extraído é transcrito pelo Whisper e o GPT-4o
          seleciona os melhores trechos. Suporta até ~90 min de vídeo por vez.
        </p>
      </div>

      <button
        onClick={analyze}
        disabled={!file}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
          disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors
          flex items-center justify-center gap-2">
        <Scissors className="w-4 h-4" />
        Analisar vídeo
      </button>
    </div>
  )

  // ── Upload progress ───────────────────────────────────────────────────────────
  if (phase === 'uploading') return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-200">Enviando vídeo...</p>
        <p className="text-xs text-gray-500">
          {uploadPct < 100
            ? `${uploadPct}% carregado — arquivos grandes podem demorar alguns instantes`
            : 'Upload concluído, iniciando análise...'}
        </p>
      </div>
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
          <div className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${uploadPct}%` }} />
        </div>
        <p className="text-xs text-gray-600 text-right">{uploadPct}%</p>
      </div>
      <button onClick={reset} className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors py-2">
        Cancelar
      </button>
    </div>
  )

  // ── Analyzing ─────────────────────────────────────────────────────────────────
  if (phase === 'analyzing') return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
          <Scissors className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-sm font-semibold text-gray-200">Analisando vídeo</p>
        <p className="text-xs text-gray-500">Isso pode levar 30–120 segundos dependendo da duração.</p>
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <ProcessingStep label="Extraindo áudio (FFmpeg)"   state={analysisStep > 0 ? 'done' : 'active'} />
        <ProcessingStep label="Transcrevendo (Whisper)"    state={analysisStep > 1 ? 'done' : analysisStep === 1 ? 'active' : 'waiting'} />
        <ProcessingStep label="Encontrando melhores clips (GPT-4o)" state={analysisStep === 2 ? 'active' : 'waiting'} />
      </div>
    </div>
  )

  // ── Review clips ──────────────────────────────────────────────────────────────
  if (phase === 'review' || (phase === 'cutting' && clips.length)) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Scissors className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-lg font-bold text-white">
              {clips.length} clip{clips.length > 1 ? 's' : ''} encontrado{clips.length > 1 ? 's' : ''}
            </h1>
            <p className="text-xs text-gray-500">{fmtTime(duration)} de vídeo analisado</p>
          </div>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Novo vídeo
        </button>
      </div>

      {/* Select all / stats */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-xl">
        <span className="text-xs text-gray-400">
          <span className="text-gray-200 font-semibold">{selectedCount}</span> de {clips.length} clips selecionados
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => toggleAll(true)}  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Todos</button>
          <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Nenhum</button>
        </div>
      </div>

      {/* Clip cards */}
      <div className="space-y-3">
        {clips.map(clip => (
          <ClipCard
            key={clip.id}
            clip={clip}
            onToggle={() => toggleClip(clip.id)}
            onEditTitle={t => editTitle(clip.id, t)}
          />
        ))}
      </div>

      {/* Transcript accordion */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowTranscript(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-750 transition-colors text-left">
          <span className="text-xs font-semibold text-gray-400">Transcrição completa</span>
          {showTranscript
            ? <ChevronUp   className="w-4 h-4 text-gray-600" />
            : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </button>
        {showTranscript && (
          <div className="px-5 pb-5 pt-1 border-t border-surface-700/60">
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={cut}
        disabled={cutting || selectedCount === 0}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
          disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors
          flex items-center justify-center gap-2">
        {cutting
          ? <><Loader2   className="w-4 h-4 animate-spin" /> Cortando clips...</>
          : <><Download  className="w-4 h-4" /> Cortar e baixar {selectedCount} clip{selectedCount !== 1 ? 's' : ''} (ZIP)</>}
      </button>
    </div>
  )

  // ── Cutting ───────────────────────────────────────────────────────────────────
  if (phase === 'cutting') return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
      <p className="text-sm font-semibold text-gray-200">Cortando e comprimindo clips...</p>
      <p className="text-xs text-gray-500">Aguarde enquanto o FFmpeg processa cada clip.</p>
    </div>
  )

  // ── Done ──────────────────────────────────────────────────────────────────────
  if (phase === 'done') return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-white">Clips prontos!</h2>
        <p className="text-sm text-gray-400">O ZIP foi baixado automaticamente com seus clips.</p>
      </div>
      <button onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600
          text-sm font-medium text-gray-200 transition-colors">
        <Scissors className="w-4 h-4" /> Clipar outro vídeo
      </button>
    </div>
  )

  // ── Error ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-6">
      <div className="bg-surface-800 border border-red-500/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-red-300">Algo deu errado</span>
        </div>
        <p className="text-sm text-gray-400">{errorMsg}</p>
      </div>
      <button onClick={reset}
        className="w-full py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-sm font-medium
          text-gray-200 transition-colors flex items-center justify-center gap-2">
        <RotateCcw className="w-4 h-4" /> Tentar novamente
      </button>
    </div>
  )
}
