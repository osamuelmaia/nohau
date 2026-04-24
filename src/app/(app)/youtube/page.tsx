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
  const [hovered, setHovered] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-1.5 rounded flex-shrink-0 transition-colors"
      style={{ color: hovered ? 'var(--t-1)' : 'var(--t-3)', background: hovered ? 'var(--s-700)' : 'transparent' }}>
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
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
          <span className="text-sm font-semibold" style={{ color: 'var(--t-1)' }}>
            {title}{count !== undefined ? ` (${count})` : ''}
          </span>
          {open
            ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--t-3)' }} />
            : <ChevronUp   className="w-4 h-4" style={{ color: 'var(--t-3)' }} />}
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

  const hasTexto    = !!summary.resumo_texto
  const hasPontos   = (summary.pontos_chave        ?? []).length > 0
  const hasMencoes  = (summary.mencoes_importantes ?? []).length > 0
  const hasAcoes    = (summary.acoes_pendentes     ?? []).length > 0
  const hasAnything = hasTexto || hasPontos || hasMencoes || hasAcoes

  if (!hasAnything) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
          <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm font-semibold" style={{ color: 'var(--t-1)' }}>Resumo do vídeo</span>
          {hasAcoes && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              <Bell className="w-3 h-3" />
              {(summary.acoes_pendentes ?? []).length} ação{(summary.acoes_pendentes ?? []).length !== 1 ? 'ões' : ''}
            </span>
          )}
          {open
            ? <ChevronDown className="w-4 h-4 ml-auto" style={{ color: 'var(--t-3)' }} />
            : <ChevronUp   className="w-4 h-4 ml-auto" style={{ color: 'var(--t-3)' }} />}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {summary.resumo_texto && (
            <p className="text-sm leading-relaxed pb-4" style={{ color: 'var(--t-2)', borderBottom: '1px solid var(--t-border)' }}>
              {summary.resumo_texto}
            </p>
          )}

          {hasAcoes && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Ações pendentes para a descrição</span>
              </div>
              {(summary.acoes_pendentes ?? []).map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-xs text-amber-200/80 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          )}

          {hasPontos && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--t-3)' }}>Pontos-chave</span>
              <div className="space-y-1.5">
                {(summary.pontos_chave ?? []).map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#f97316' }} />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--t-2)' }}>{p}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasMencoes && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--t-3)' }}>
                <Link2 className="w-3 h-3" /> Ferramentas & referências citadas
              </span>
              <div className="space-y-1.5">
                {(summary.mencoes_importantes ?? []).map((m, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)' }}>
                    <Link2 className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--t-3)' }} />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--t-2)' }}>{m}</p>
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

// ── Dropzone ──────────────────────────────────────────────────────────────────
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
      'audio/mpeg':  ['.mp3'],
      'audio/mp4':   ['.m4a'],
      'audio/wav':   ['.wav'],
      'audio/webm':  ['.webm'],
      'audio/x-m4a': ['.m4a'],
      'audio/ogg':   ['.ogg'],
    },
    maxFiles: 1,
    disabled: processing,
    onDropRejected: () => toast.error('Formato não suportado. Use MP3, M4A ou WAV.'),
  })

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
  }

  if (selectedFile) {
    return (
      <div className="rounded-xl px-4 py-5 space-y-3"
        style={{ border: '1px solid var(--t-border)', background: 'var(--s-850)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <FileAudio className="w-4 h-4" style={{ color: '#f97316' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--t-1)' }}>{selectedFile.name}</p>
            <p className="text-xs" style={{ color: 'var(--t-3)' }}>
              {selectedFile.size >= 1024 * 1024 * 1024
                ? `${(selectedFile.size / 1024 / 1024 / 1024).toFixed(2)} GB`
                : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`}
            </p>
          </div>
          {processing ? (
            <div className="flex items-center gap-2 text-xs flex-shrink-0" style={{ color: '#f97316' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {status}
            </div>
          ) : (
            <button
              onClick={clearFile}
              className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
              style={{ color: 'var(--t-3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--s-700)'; e.currentTarget.style.color = 'var(--t-1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t-3)' }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {processing && (
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--s-700)' }}>
            <div className="h-1 rounded-full animate-pulse" style={{ width: '65%', background: '#f97316' }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className="rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all"
      style={{
        borderColor: isDragActive ? '#f97316' : 'var(--t-border)',
        background:  isDragActive ? 'rgba(249,115,22,0.04)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!isDragActive) {
          (e.currentTarget as HTMLElement).style.background = 'var(--s-850)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--s-600)'
        }
      }}
      onMouseLeave={e => {
        if (!isDragActive) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--t-border)'
        }
      }}>
      <input {...getInputProps()} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
        style={{ background: 'var(--s-700)' }}>
        <Upload className="w-5 h-5" style={{ color: 'var(--t-2)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--t-1)' }}>
        {isDragActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
      </p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--t-3)' }}>MP3, M4A, WAV, OGG — até 25 MB</p>
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
  const [generating,   setGenerating]   = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeStatus, setTranscribeStatus] = useState('Processando...')
  const [exporting,    setExporting]    = useState(false)
  const [result,       setResult]       = useState<GenerateResult | null>(null)

  // ── Upload + transcribe audio ───────────────────────────────────────────────
  const handleMediaFile = async (file: File) => {
    setTranscribing(true)
    setTranscribeStatus('Enviando para nuvem...')

    try {
      const fileToUpload = file.type
        ? file
        : new File([file], file.name, { type: 'application/octet-stream' })
      const ext        = file.name.includes('.') ? file.name.split('.').pop() : 'mp3'
      const uniqueName = `${crypto.randomUUID()}.${ext}`
      const blob       = await upload(uniqueName, fileToUpload, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

      setTranscribeStatus('Transcrevendo com Whisper...')

      const res = await fetch('/api/youtube/transcribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ blobUrl: blob.url, filename: file.name, mimetype: file.type }),
      })

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
    if (!transcript.trim()) return toast.error('Transcrição vazia. Cole ou faça upload de um áudio.')
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

  // ── Shared input field style ─────────────────────────────────────────────────
  const inputCls = "w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
  const inputStyle = {
    background: 'var(--s-850)',
    border:     '1px solid var(--t-border)',
    color:      'var(--t-1)',
    padding:    '8px 12px',
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (result) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-400" />
          <h1 className="text-xl font-bold" style={{ color: 'var(--t-1)' }}>Resultado</h1>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'var(--t-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-3)')}>
          <RotateCcw className="w-3.5 h-3.5" /> Nova geração
        </button>
      </div>

      <Section title="Títulos" count={result.titles.length} copyText={result.titles.join('\n')}>
        <div className="space-y-2">
          {result.titles.map((t, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)' }}>
              <span className="text-xs w-4 flex-shrink-0 mt-0.5 font-mono" style={{ color: 'var(--t-3)' }}>{i + 1}</span>
              <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--t-1)' }}>{t}</p>
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
              <div key={i} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--t-border)' }}>
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--t-border)', background: 'var(--s-800)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center"
                      style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>{i + 1}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--t-3)' }}>{labels[i] ?? `Descrição ${i + 1}`}</span>
                  </div>
                  <CopyBtn text={d} />
                </div>
                <div className="p-4" style={{ background: 'var(--s-850)' }}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--t-2)' }}>{d}</p>
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
              <span key={i} className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'var(--s-700)', color: '#f97316' }}>{h}</span>
            ))}
          </div>
        </Section>
        <Section title="Tags" count={result.tags.length} copyText={result.tags.join(', ')}>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {result.tags.map((t, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'var(--s-700)', color: 'var(--t-2)' }}>{t}</span>
            ))}
          </div>
        </Section>
      </div>

      {result.summary && <SummaryCard summary={result.summary} />}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={copyAll}
          className="py-2.5 rounded-xl text-sm transition-colors"
          style={{ border: '1px solid var(--t-border)', color: 'var(--t-3)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--t-1)'; e.currentTarget.style.borderColor = 'var(--s-500)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--t-3)'; e.currentTarget.style.borderColor = 'var(--t-border)' }}>
          Copiar tudo
        </button>
        <button
          onClick={exportDocx}
          disabled={exporting}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          style={{
            border:     '1px solid rgba(249,115,22,0.35)',
            background: 'rgba(249,115,22,0.08)',
            color:      '#f97316',
          }}
          onMouseEnter={e => { if (!exporting) (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.08)' }}>
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
          <h1 className="text-xl font-bold" style={{ color: 'var(--t-1)' }}>YouTube Ops</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t-3)' }}>Transcrição ou MP3 → IA gera tudo automaticamente.</p>
        </div>
      </div>

      {/* Transcript / Audio input */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
        {/* Tab toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--t-1)' }}>
            Conteúdo do vídeo <span className="text-red-400">*</span>
          </span>
          <div className="flex rounded-lg p-0.5 gap-0.5"
            style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)' }}>
            <button
              onClick={() => setInputMode('text')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: inputMode === 'text' ? 'var(--s-700)' : 'transparent',
                color:      inputMode === 'text' ? 'var(--t-1)' : 'var(--t-3)',
              }}>
              <Copy className="w-3 h-3" />
              Colar transcrição
            </button>
            <button
              onClick={() => setInputMode('audio')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: inputMode === 'audio' ? 'var(--s-700)' : 'transparent',
                color:      inputMode === 'audio' ? 'var(--t-1)' : 'var(--t-3)',
              }}>
              <Mic className="w-3 h-3" />
              Upload MP3 / M4A
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
              className={inputCls}
              style={{ ...inputStyle, lineHeight: '1.6' }}
            />
            {transcript && (
              <p className="text-xs -mt-1" style={{ color: 'var(--t-3)' }}>
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
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f97316' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--t-2)' }}>
                Envie um arquivo de áudio (MP3, M4A, WAV) até 25 MB (~90 min de MP3 64kbps).
                O áudio é transcrito pelo Whisper da OpenAI.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dados do canal */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
        <label className="text-sm font-semibold block" style={{ color: 'var(--t-1)' }}>Dados do canal</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-3)' }}>Nome do YouTuber</label>
            <input
              value={youtuberName}
              onChange={e => setYoutuberName(e.target.value)}
              placeholder="Ex: João Silva"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-3)' }}>
              Instagram <span style={{ color: 'var(--t-3)', opacity: 0.6 }}>(na descrição)</span>
            </label>
            <input
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="@seuinstagram"
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-3)' }}>
            Anotações importantes <span style={{ color: 'var(--t-3)', opacity: 0.6 }}>(opcional)</span>
          </label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Destacar o ponto sobre investimento, mencionar o produto X..."
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Perfil de geração */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
        <label className="text-sm font-semibold block" style={{ color: 'var(--t-1)' }}>Perfil de geração</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PROFILES).map(([key, p]) => (
            <ProfileCard
              key={key}
              profileKey={key}
              profile={p}
              active={profile === key}
              onClick={() => setProfile(key)}
            />
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

// ── Profile card (extracted to avoid inline onMouse handlers in grid) ─────────
function ProfileCard({
  profileKey, profile, active, onClick,
}: {
  profileKey: string
  profile: { name: string; desc: string }
  active: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      key={profileKey}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-3 rounded-xl text-left transition-all"
      style={{
        background:   active ? 'rgba(249,115,22,0.08)' : hovered ? 'var(--s-850)' : 'transparent',
        border:       `1px solid ${active ? 'rgba(249,115,22,0.4)' : hovered ? 'var(--s-600)' : 'var(--t-border)'}`,
      }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--t-1)' }}>{profile.name}</p>
      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--t-3)' }}>{profile.desc}</p>
    </button>
  )
}
