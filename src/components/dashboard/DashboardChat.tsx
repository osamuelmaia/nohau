'use client'

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react'
import { Loader2, Sparkles, X, ArrowUp, RotateCcw } from 'lucide-react'

interface ChatMessage {
  role:        'user' | 'assistant'
  content:     string
  toolStatus?: string
}

interface Props { workspaceId: string }

const TOOL_LABELS: Record<string, string> = {
  get_overview_metrics:     'Consultando métricas...',
  get_campaign_list:        'Buscando campanhas...',
  get_campaign_insights:    'Analisando campanhas...',
  get_creative_performance: 'Analisando criativos...',
  get_daily_evolution:      'Buscando evolução diária...',
}

const PLACEHOLDERS = [
  'Pergunte sobre suas campanhas...',
  'Qual criativo está com melhor ROAS?',
  'Como está o custo por lead?',
  'Qual campanha está drenando budget?',
  'Qual dia da semana converte mais?',
  'Me mostre a evolução desta semana',
]

const QUICK_STARTS = [
  'Qual campanha está drenando budget?',
  'Me mostre os criativos com melhor ROAS',
  'Como está o ritmo de gastos hoje?',
  'Qual dia da semana converte mais?',
]

const WELCOME: ChatMessage = {
  role:    'assistant',
  content: 'Tenho acesso direto às suas campanhas — criativos, métricas, tendências, comparações.\n\nO que quer saber?',
}

// ── Inline markdown ───────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ color: 'var(--t-1)', fontWeight: 600 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`'))
      return (
        <code key={i} className="px-1 py-0.5 rounded text-xs font-mono"
          style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
          {p.slice(1, -1)}
        </code>
      )
    return p
  })
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim().startsWith('|')) {
      const tl: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tl.push(lines[i]); i++ }
      const rows = tl.filter(l => !/^\s*\|[-:| ]+\|\s*$/.test(l))
      if (rows.length > 0) {
        const parse = (l: string) => l.split('|').map(c => c.trim()).filter((_, idx, a) => idx > 0 && idx < a.length - 1)
        const [hdr, ...body] = rows
        nodes.push(
          <div key={`t-${i}`} className="overflow-x-auto my-3 rounded-lg" style={{ border: '1px solid var(--t-border)' }}>
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: 'var(--s-850)' }}>
                  {parse(hdr).map((c, ci) => (
                    <th key={ci} className="px-3 py-2 text-left font-medium whitespace-nowrap"
                      style={{ color: 'var(--t-2)', borderBottom: '1px solid var(--t-border)' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--s-900)' }}>
                    {parse(row).map((c, ci) => (
                      <td key={ci} className="px-3 py-2 whitespace-nowrap"
                        style={{ color: 'var(--t-1)', borderBottom: ri < body.length - 1 ? '1px solid var(--t-border)' : 'none' }}>
                        {renderInline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, '')); i++ }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1.5 space-y-1 pl-4">
          {items.map((it, ii) => (
            <li key={ii} className="text-sm list-disc list-outside" style={{ color: 'var(--t-1)' }}>{renderInline(it)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1.5 space-y-1 pl-4">
          {items.map((it, ii) => (
            <li key={ii} className="text-sm list-decimal list-outside" style={{ color: 'var(--t-1)' }}>{renderInline(it)}</li>
          ))}
        </ol>
      )
      continue
    }

    if (line.startsWith('## ') || line.startsWith('### ')) {
      nodes.push(<p key={`h-${i}`} className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--t-1)' }}>{renderInline(line.replace(/^#{2,3} /, ''))}</p>)
      i++; continue
    }

    if (!line.trim()) { nodes.push(<div key={`br-${i}`} className="h-2" />); i++; continue }

    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed" style={{ color: 'var(--t-1)' }}>
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <>{nodes}</>
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4">
        <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-br-sm text-sm text-white keep-white"
          style={{ background: '#f97316', lineHeight: '1.5' }}>
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="px-5">
      {message.toolStatus ? (
        <div className="flex items-center gap-2 text-xs py-0.5" style={{ color: 'var(--t-3)' }}>
          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: '#f97316' }} />
          {message.toolStatus}
        </div>
      ) : message.content ? (
        <div className="space-y-0.5">
          <MarkdownBlock text={message.content} />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs py-0.5" style={{ color: 'var(--t-3)' }}>
          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: '#f97316' }} />
          Pensando...
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardChat({ workspaceId }: Props) {
  const [open,            setOpen]            = useState(false)
  const [messages,        setMessages]        = useState<ChatMessage[]>([WELCOME])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [placeholderIdx,  setPlaceholderIdx]  = useState(0)
  const [placeholderFade, setPlaceholderFade] = useState(true)
  const [workspaceName,   setWorkspaceName]   = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Fetch workspace name
  useEffect(() => {
    fetch('/api/workspaces')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const ws = d.data.find((w: { id: string; name: string }) => w.id === workspaceId)
        if (ws) setWorkspaceName(ws.name)
      })
      .catch(() => {})
  }, [workspaceId])

  // Rotate placeholder
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderFade(false)
      setTimeout(() => { setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length); setPlaceholderFade(true) }, 280)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])

  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    const userMsg:  ChatMessage = { role: 'user',      content: text }
    const pending:  ChatMessage = { role: 'assistant', content: '', toolStatus: 'Iniciando...' }

    setMessages(prev => [...prev, userMsg, pending])

    const apiMessages = [...messages, userMsg]
      .filter(m => m.content)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ workspaceId, messages: apiMessages }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: err.error ?? 'Erro ao conectar.' }])
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'tool_start') setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: '', toolStatus: TOOL_LABELS[ev.name] ?? 'Buscando dados...' }])
            if (ev.type === 'text')       { content += ev.delta; setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content }]) }
            if (ev.type === 'error')      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `Erro: ${ev.message}` }])
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Falha de conexão. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, workspaceId])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const isAtStart = messages.length <= 1

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          background: '#f97316',
          boxShadow:  open ? '0 2px 12px rgba(249,115,22,0.3)' : '0 4px 24px rgba(249,115,22,0.45)',
          transform:  open ? 'scale(0.95)' : 'scale(1)',
        }}>
        {open
          ? <X        className="w-5 h-5 text-white keep-white" />
          : <Sparkles className="w-5 h-5 text-white keep-white" />
        }
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-[88px] right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width:      'min(460px, calc(100vw - 24px))',
            height:     'min(580px, calc(100vh - 120px))',
            background: 'var(--s-900)',
            border:     '1px solid var(--t-border)',
            boxShadow:  '0 24px 64px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.08)',
            animation:  'chatSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--t-border)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              <span className="text-xs font-medium truncate" style={{ color: 'var(--t-1)' }}>
                {workspaceName || workspaceId}
              </span>
            </div>
            <button
              onClick={() => setMessages([WELCOME])}
              title="Nova conversa"
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: 'var(--t-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-3)')}>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto pt-4 pb-2 space-y-5">
            {messages.map((m, i) => <Message key={i} message={m} />)}

            {/* Quick starts */}
            {isAtStart && !loading && (
              <div className="px-5 pt-1 flex flex-col gap-2">
                {QUICK_STARTS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left px-3.5 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      border:     '1px solid var(--t-border)',
                      color:      'var(--t-2)',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'
                      e.currentTarget.style.color       = 'var(--t-1)'
                      e.currentTarget.style.background  = 'rgba(249,115,22,0.04)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--t-border)'
                      e.currentTarget.style.color       = 'var(--t-2)'
                      e.currentTarget.style.background  = 'transparent'
                    }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid var(--t-border)' }}>
            <div
              className="flex items-end gap-2 rounded-xl px-3.5 py-2.5"
              style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
              <div className="relative flex-1 min-w-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={loading}
                  placeholder=""
                  rows={1}
                  className="w-full bg-transparent text-sm resize-none focus:outline-none disabled:opacity-50 leading-relaxed"
                  style={{
                    color:       'var(--t-1)',
                    maxHeight:   '100px',
                    overflowY:   'auto',
                    fieldSizing: 'content',
                  } as React.CSSProperties}
                />
                {!input && (
                  <span
                    className="absolute inset-0 text-sm pointer-events-none select-none leading-relaxed"
                    style={{
                      color:      'var(--t-3)',
                      opacity:    placeholderFade ? 1 : 0,
                      transition: 'opacity 0.25s ease',
                    }}>
                    {PLACEHOLDERS[placeholderIdx]}
                  </span>
                )}
              </div>

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && !loading ? '#f97316' : 'transparent',
                  border:     `1px solid ${input.trim() && !loading ? '#f97316' : 'var(--t-border)'}`,
                  opacity:    !input.trim() && !loading ? 0.4 : 1,
                }}>
                {loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#f97316' }} />
                  : <ArrowUp  className="w-3.5 h-3.5" style={{ color: input.trim() ? '#ffffff' : 'var(--t-2)' }} />
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </>
  )
}
