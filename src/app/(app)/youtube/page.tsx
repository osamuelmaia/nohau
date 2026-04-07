'use client'

import { useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import { useDropzone } from 'react-dropzone'
import {
  Copy, Check, ChevronDown, ChevronUp, Youtube, RotateCcw, Sparkles, FileDown,
  Mic, FileAudio, X, Loader2, Upload, AlertCircle, BookOpen, Link2, Bell,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { PROFILES } from '@/services/openai/profiles'

interface VideoSummary {
  resumo_texto:        string
  pontos_chave:        string[]
  mencoes_importantes: string[]
  acoes_pendentes:     string[]
}

interface GenerateResult {
  titles:       string[]
  descriptions: string[]
  hashtags:     string[]
  tags:         string[]
  summary:      VideoSummary
}

type InputMode = 'text' | 'audio'

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handle}
      className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors flex-shrink-0">
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy  className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, count, children, copyText }: {
  title: string; count?: number; children: React.ReactNode; copyText?: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
          <span className="text-sm font-semibold text-gray-200">
            {title}{count !== undefined ? ` (${count})` : ''}
          </span>
          {open
            ? <ChevronDown className="w-4 h-4 text-gray-500" />
            : <ChevronUp   className="w-4 h-4 text-gray-500" />}
        </button>
        {copyText && <CopyBtn text={copyText} />}
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ summary }: { summary: VideoSummary }) {
  const [open, setOpen] = useState(true)

  const hasTexto     = !!summary.resumo_texto
  const hasPontos    = summary.pontos_chave.length        > 0
  const hasMencoes   = summary.mencoes_importantes.length > 0
  const hasAcoes     = summary.acoes_pendentes.length     > 0
  const hasAnything  = hasTexto || hasPontos || hasMencoes || hasAcoes

  if (!hasAnything) return null

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
          <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-200">Resumo do vídeo</span>
          {hasAcoes && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              <Bell className="w-3 h-3" />
              {summary.acoes_pendentes.length} ação{summary.acoes_pendentes.length !== 1 ? 'ões' : ''}
            </span>
          )}
          {open
            ? <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
            : <ChevronUp   className="w-4 h-4 text-gray-500 ml-auto" />}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Resumo em texto */}
          {summary.resumo_texto && (
            <p className="text-sm text-gray-300 leading-relaxed border-b border-surface-700 pb-4">
              {summary.resumo_texto}
            </p>
          )}

          {/* Ações pendentes — destaque se houver */}
          {hasAcoes && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Ações pendentes para a descrição</span>
              </div>
              {summary.acoes_pendentes.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-xs text-amber-200/80 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pontos-chave */}
          {hasPontos && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Pontos-chave</span>
              <div className="space-y-1.5">
                {summary.pontos_chave.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                    <p className="text-xs text-gray-300 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menções importantes */}
          {hasMencoes && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Link2 className="w-3 h-3" /> Ferramentas & referências citadas
              </span>
              <div className="space-y-1.5">
                {summary.mencoes_importantes.map((m, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-surface-750 border border-surface-600">
                    <Link2 className="w-3 h-3 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-300 leading-relaxed">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Dropzone (MP4 e MP3, sem limite de tamanho) ───────────────────────────────
function MediaDropzone({
  onFile,
  processing,
  status,
}: {
  onFile:     (file: File) => void
  processing: boolean
  status:     string
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setSelectedFile(file)
    onFile(file)
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4':       ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/webm':      ['.webm'],
      'video/x-matroska':['.mkv'],
      'audio/mpeg':      ['.mp3'],
      'audio/mp4':       ['.m4a'],
      'audio/wav':       ['.wav'],
      'audio/webm':      ['.webm'],
      'audio/x-m4a':     ['.m4a'],
    },
    maxFiles: 1,
    // Sem maxSize — FFmpeg converte localmente
    disabled: processing,
    onDropRejected: () => toast.error('Formato não suportado. Use MP4, MOV, MKV, MP3 ou WAV.'),
  })

  const isVideoFile = selectedFile
    ? selectedFile.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(selectedFile.name)
    : false

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
  }

  if (selectedFile) {
    return (
      <div className="rounded-xl border border-surface-600 bg-surface-750 px-4 py-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isVideoFile
              ? 'bg-rose-500/10 border border-rose-500/20'
              : 'bg-indigo-500/10 border border-indigo-500/20'
          }`}>
            {isVideoFile
              ? <Mic    className="w-4 h-4 text-rose-400" />
              : <FileAudio className="w-4 h-4 text-indigo-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">
              {selectedFile.size >= 1024 * 1024 * 1024
                ? `${(selectedFile.size / 1024 / 1024 / 1024).toFixed(2)} GB`
                : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`}
              {isVideoFile && ' · MP4 → será convertido para MP3'}
            </p>
          </div>
          {processing ? (
            <div className="flex items-center gap-2 text-xs text-indigo-300 flex-shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {status}
            </div>
          ) : (
            <button onClick={clearFile}
              className="p-1.5 rounded-lg hover:bg-surface-700 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {processing && (
          <div className="h-1 rounded-full bg-surface-700 overflow-hidden">
            <div className="h-1 bg-indigo-500 rounded-full animate-pulse" style={{ width: '65%' }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div {...getRootProps()}
      className={`rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-indigo-400 bg-indigo-500/5'
          : 'border-surface-600 hover:border-surface-500 hover:bg-surface-750'
      }`}>
      <input {...getInputProps()} />
      <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center mx-auto mb-3">
        <Upload className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-300 font-medium">
        {isDragActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
      </p>
      <p className="text-xs text-gray-600 mt-1.5">MP4, MOV, MKV — qualquer tamanho · MP3, M4A, WAV</p>
      <p className="text-[11px] text-gray-700 mt-1">Vídeos são convertidos localmente antes de transcrever</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function YoutubeOpsPage() {
  const [inputMode,    setInputMode]    = useState<InputMode>('text')
  const [transcript,   setTranscript]   = useState('')
  const [youtuberName, setYoutuberName] = useState('')
  const [instagram,    setInstagram]    = useState('')
  const [notes,        setNotes]        = useState('')
  const [profile,      setProfile]      = useState('youtube-seo')
  const [generating,    setGenerating]    = useState(false)
  const [transcribing,  setTranscribing]  = useState(false)
  const [transcribeStatus, setTranscribeStatus] = useState('Processando...')
  const [exporting,     setExporting]     = useState(false)
  const [result,       setResult]       = useState<GenerateResult | null>(null)

  // ── Processar arquivo (MP4 ou MP3) ──────────────────────────────────────────
  const handleMediaFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(file.name)

    setTranscribing(true)
    setTranscribeStatus('Enviando para nuvem...')

    try {
      // ── 1. Upload para Vercel Blob (sem limite de tamanho) ──────────────────
      // Garante content-type válido (alguns browsers retornam string vazia)
      const fileToUpload = file.type
        ? file
        : new File([file], file.name, { type: 'application/octet-stream' })
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const uniqueName = `${crypto.randomUUID()}.${ext}`
      const blob = await upload(uniqueName, fileToUpload, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

      // ── 2. Enviar só a URL para a API de transcrição ────────────────────────
      setTranscribeStatus(isVideo ? 'Convertendo MP4 para MP3...' : 'Transcrevendo...')

      let statusTimer: ReturnType<typeof setTimeout> | null = null
      if (isVideo) {
        statusTimer = setTimeout(() => setTranscribeStatus('Transcrevendo com Whisper...'), 15_000)
      }

      const res = await fetch('/api/youtube/transcribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ blobUrl: blob.url, filename: file.name, mimetype: file.type }),
      })
      if (statusTimer) clearTimeout(statusTimer)

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      setTranscript(json.transcript)
      setInputMode('text')
      toast.success('Transcrição concluída! Revise e clique em gerar.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro no processamento')
    } finally {
      setTranscribing(false)
      setTranscribeStatus('Processando...')
    }
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!transcript.trim()) return toast.error('Transcrição vazia. Cole ou faça upload de um MP3.')
    setGenerating(true)
    try {
      const res  = await fetch('/api/youtube/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transcript, profile, youtuberName, instagram, notes }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na geração')
    } finally {
      setGenerating(false)
    }
  }

  const reset = () => {
    setResult(null)
    setTranscript('')
    setYoutuberName('')
    setInstagram('')
    setNotes('')
    setInputMode('text')
  }

  // ── Export DOCX ─────────────────────────────────────────────────────────────
  const exportDocx = async () => {
    if (!result) return
    setExporting(true)
    try {
      const res = await fetch('/api/youtube/export', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ youtuberName, instagram, profile, ...result }),
      })
      if (!res.ok) throw new Error('Erro ao gerar DOCX')
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = youtuberName
        ? `youtube-ops-${youtuberName.toLowerCase().replace(/\s+/g, '-')}.docx`
        : 'youtube-ops.docx'
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('DOCX exportado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setExporting(false)
    }
  }

  const copyAll = () => {
    if (!result) return
    const text = [
      '── TÍTULOS ──',      result.titles.join('\n'),
      '\n── DESCRIÇÕES ──', result.descriptions.join('\n\n---\n\n'),
      '\n── HASHTAGS ──',   result.hashtags.join(', '),
      '\n── TAGS ──',       result.tags.join(', '),
    ].join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Tudo copiado!')
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (result) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-400" />
          <h1 className="text-xl font-bold text-white">Resultado</h1>
        </div>
        <button onClick={reset}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Nova geração
        </button>
      </div>

      <Section title="Títulos" count={result.titles.length} copyText={result.titles.join('\n')}>
        <div className="space-y-2">
          {result.titles.map((t, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-surface-750 border border-surface-600">
              <span className="text-xs text-gray-600 w-4 flex-shrink-0 mt-0.5 font-mono">{i + 1}</span>
              <p className="text-sm text-gray-200 flex-1 leading-snug">{t}</p>
              <CopyBtn text={t} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Descrições" count={result.descriptions.length}
        copyText={result.descriptions.join('\n\n---\n\n')}>
        <div className="space-y-3">
          {result.descriptions.map((d, i) => {
            const labels = ['O Jornalista', 'O Especialista', 'O Criador']
            return (
              <div key={i} className="rounded-xl bg-surface-750 border border-surface-600 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-600 bg-surface-800">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-xs font-medium text-gray-400">{labels[i] ?? `Descrição ${i + 1}`}</span>
                  </div>
                  <CopyBtn text={d} />
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{d}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Hashtags" count={result.hashtags.length} copyText={result.hashtags.join(', ')}>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {result.hashtags.map((h, i) => (
              <span key={i} className="text-xs bg-surface-700 text-brand-300 px-2 py-1 rounded-lg">{h}</span>
            ))}
          </div>
        </Section>
        <Section title="Tags" count={result.tags.length} copyText={result.tags.join(', ')}>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {result.tags.map((t, i) => (
              <span key={i} className="text-xs bg-surface-700 text-gray-300 px-2 py-1 rounded-lg">{t}</span>
            ))}
          </div>
        </Section>
      </div>

      {result.summary && <SummaryCard summary={result.summary} />}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={copyAll}
          className="py-2.5 rounded-xl border border-surface-600 text-sm text-gray-400 hover:text-gray-200 hover:border-surface-500 transition-colors">
          Copiar tudo
        </button>
        <button onClick={exportDocx} disabled={exporting}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-600/10 text-sm text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-500/60 transition-colors disabled:opacity-50">
          <FileDown className="w-4 h-4" />
          {exporting ? 'Gerando DOCX...' : 'Exportar DOCX'}
        </button>
      </div>
    </div>
  )

  // ── Input form ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-2.5">
        <Youtube className="w-5 h-5 text-red-400" />
        <div>
          <h1 className="text-xl font-bold text-white">YouTube Ops</h1>
          <p className="text-sm text-gray-500 mt-0.5">Transcrição ou MP3 → IA gera tudo automaticamente.</p>
        </div>
      </div>

      {/* Transcript / Audio input */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        {/* Tab toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">
            Conteúdo do vídeo <span className="text-red-400">*</span>
          </span>
          <div className="flex rounded-lg bg-surface-750 border border-surface-600 p-0.5 gap-0.5">
            <button onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-surface-600 text-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              <Copy className="w-3 h-3" />
              Colar transcrição
            </button>
            <button onClick={() => setInputMode('audio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                inputMode === 'audio'
                  ? 'bg-surface-600 text-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              <Mic className="w-3 h-3" />
              Upload MP4 / MP3
            </button>
          </div>
        </div>

        {/* Text mode */}
        {inputMode === 'text' && (
          <>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Cole aqui a transcrição. No YouTube clique em ··· → Mostrar transcrição para copiar a legenda automática."
              rows={7}
              className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
            />
            {transcript && (
              <p className="text-xs text-gray-600 -mt-1">
                {transcript.trim().split(/\s+/).length} palavras
              </p>
            )}
          </>
        )}

        {/* Upload mode */}
        {inputMode === 'audio' && (
          <div className="space-y-3">
            <MediaDropzone
              onFile={handleMediaFile}
              processing={transcribing}
              status={transcribeStatus}
            />
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-300/80 leading-relaxed">
                MP4 é convertido localmente para MP3 antes de enviar ao Whisper — sem limite de tamanho.
                Suporta até ~90 min de vídeo por vez.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dados do canal */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <label className="text-sm font-semibold text-gray-300 block">Dados do canal</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Nome do YouTuber</label>
            <input value={youtuberName} onChange={e => setYoutuberName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Instagram <span className="text-gray-600">(na descrição)</span>
            </label>
            <input value={instagram} onChange={e => setInstagram(e.target.value)}
              placeholder="@seuinstagram"
              className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Anotações importantes <span className="text-gray-600">(opcional)</span>
          </label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Destacar o ponto sobre investimento, mencionar o produto X..."
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Perfil */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
        <label className="text-sm font-semibold text-gray-300 block">Perfil de geração</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PROFILES).map(([key, p]) => (
            <button key={key} onClick={() => setProfile(key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                profile === key
                  ? 'border-brand-500/60 bg-brand-600/8'
                  : 'border-surface-700 hover:border-surface-600'
              }`}>
              <p className="text-xs font-semibold text-gray-200">{p.name}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={generate}
        loading={generating}
        disabled={transcribing || !transcript.trim()}
        size="lg"
        className="w-full">
        <Sparkles className="w-4 h-4" />
        {generating ? 'Gerando conteúdo...' : 'Gerar conteúdo para YouTube'}
      </Button>
    </div>
  )
}
