'use client'

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react'
import { Send, Trash2, Loader2, Sparkles, ChevronDown } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role:        'user' | 'assistant'
  content:     string
  toolStatus?: string
}

interface Props { workspaceId: string }

// ── Tool labels ───────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  get_overview_metrics:    'Consultando métricas...',
  get_campaign_list:       'Buscando campanhas...',
  get_campaign_insights:   'Analisando campanhas...',
  get_creative_performance:'Analisando criativos...',
  get_daily_evolution:     'Buscando evolução diária...',
}

// ── Rotating placeholder texts ────────────────────────────────────────────────
const PLACEHOLDERS = [
  'O que você quer analisar?',
  'Qual campanha está com melhor ROAS?',
  'Me mostre os criativos que mais gastaram',
  'Como está o custo por lead esta semana?',
  'Qual dia da semana converte mais?',
  'Compare o spend das campanhas ativas',
  'Tem alguma campanha abaixo do esperado?',
  'Qual criativo está puxando mais receita?',
  'Me dê um resumo do mês',
]

// ── Welcome message ───────────────────────────────────────────────────────────
const WELCOME: ChatMessage = {
  role: 'assistant',
  content: `Olá. Sou seu analista de tráfego pago.

Tenho acesso direto às suas campanhas, criativos e métricas — sem dashboards, sem filtros manuais. Só perguntar.

**O que você pode descobrir:**
- Qual criativo está performando melhor (e qual está drenando budget)
- Comparativo de ROAS, CPL e CPA entre campanhas
- Tendências por dia da semana e horário do dia
- Evolução de métricas ao longo do período
- Gargalos no funil — onde você está perdendo conversões

Não precisa seguir template. Pode perguntar do jeito que você fala.`,
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  const col = isUser ? 'inherit' : 'var(--t-1)'
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ color: col, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
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

function MarkdownBlock({ text, isUser = false }: { text: string; isUser?: boolean }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Table
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++ }
      const dataRows = tableLines.filter(l => !/^\s*\|[-:| ]+\|\s*$/.test(l))
      if (dataRows.length > 0) {
        const parseRow = (l: string) => l.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        const [headerRow, ...bodyRows] = dataRows
        nodes.push(
          <div key={`t-${i}`} className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr>
                  {parseRow(headerRow).map((cell, ci) => (
                    <th key={ci} className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap"
                      style={{ color: 'var(--t-2)', borderBottom: '1px solid var(--t-border)' }}>
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} className="px-2.5 py-1.5 whitespace-nowrap"
                        style={{ color: 'var(--t-1)', borderBottom: '1px solid var(--t-border)' }}>
                        {renderInline(cell, isUser)}
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

    // Bullet list
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, '')); i++ }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 space-y-0.5 pl-4">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm list-disc list-outside" style={{ color: isUser ? 'inherit' : 'var(--t-1)' }}>
              {renderInline(item, isUser)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1 space-y-0.5 pl-4">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm list-decimal list-outside" style={{ color: isUser ? 'inherit' : 'var(--t-1)' }}>
              {renderInline(item, isUser)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Heading
    if (line.startsWith('### ') || line.startsWith('## ')) {
      const text = line.replace(/^#{2,3} /, '')
      nodes.push(<p key={`h-${i}`} className="text-sm font-semibold mt-2" style={{ color: isUser ? 'inherit' : 'var(--t-1)' }}>{renderInline(text, isUser)}</p>)
      i++; continue
    }

    // Empty
    if (!line.trim()) { nodes.push(<div key={`br-${i}`} className="h-2" />); i++; continue }

    // Paragraph
    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed" style={{ color: isUser ? 'inherit' : 'var(--t-1)' }}>
        {renderInline(line, isUser)}
      </p>
    )
    i++
  }

  return <div className="space-y-0.5">{nodes}</div>
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4">
        <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm"
          style={{ background: 'var(--s-750)', color: 'var(--t-1)', border: '1px solid var(--t-border)' }}>
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-1">
      {message.toolStatus ? (
        <div className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--t-3)' }}>
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#f97316' }} />
          {message.toolStatus}
        </div>
      ) : message.content ? (
        <MarkdownBlock text={message.content} />
      ) : (
        <div className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--t-3)' }}>
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#f97316' }} />
          Pensando...
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DashboardChat({ workspaceId }: Props) {
  const [open,            setOpen]            = useState(false)
  const [messages,        setMessages]        = useState<ChatMessage[]>([WELCOME])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [placeholderIdx,  setPlaceholderIdx]  = useState(0)
  const [placeholderFade, setPlaceholderFade] = useState(true)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const storageKey = `nohau_chat_${workspaceId}`

  // Rotate placeholder (always rotates)
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderFade(false)
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length)
        setPlaceholderFade(true)
      }, 300)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  }, [storageKey])

  // Save history
  useEffect(() => {
    if (messages.length > 1) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
    }
  }, [messages, storageKey])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const clearHistory = useCallback(() => {
    setMessages([WELCOME])
    try { localStorage.removeItem(storageKey) } catch {}
  }, [storageKey])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    const userMsg: ChatMessage      = { role: 'user',      content: text }
    const placeholder: ChatMessage  = { role: 'assistant', content: '', toolStatus: 'Iniciando...' }

    setMessages(prev => [...prev, userMsg, placeholder])

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
      let   buffer  = ''
      let   content = ''

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
            if (ev.type === 'tool_start') {
              setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: '', toolStatus: TOOL_LABELS[ev.name] ?? 'Buscando dados...' }])
            }
            if (ev.type === 'text') {
              content += ev.delta
              setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content }])
            }
            if (ev.type === 'error') {
              setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `Erro: ${ev.message}` }])
            }
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

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full shadow-xl transition-all duration-200"
        style={{
          background: open ? 'var(--s-750)' : '#0f0f0f',
          border:     '1px solid var(--t-border)',
          color:      open ? 'var(--t-2)' : '#ffffff',
        }}>
        {open
          ? <><ChevronDown className="w-4 h-4" /><span className="text-xs font-medium">Fechar</span></>
          : <><Sparkles className="w-4 h-4" style={{ color: '#f97316' }} /><span className="text-xs font-medium keep-white">Assistente IA</span></>
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
          style={{
            width:     'min(480px, calc(100vw - 24px))',
            height:    'min(620px, calc(100vh - 120px))',
            background: 'var(--s-900)',
            border:    '1px solid var(--t-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--t-border)',
          }}>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Clear button floating top-right */}
            <div className="flex justify-end px-4 -mt-1 mb-0">
              <button onClick={clearHistory} title="Nova conversa"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--t-3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-3)')}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {messages.map((m, i) => <Message key={i} message={m} />)}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--t-border)' }}>
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)' }}>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={loading}
                  placeholder=""
                  rows={1}
                  className="w-full px-4 pt-3 pb-2 text-sm resize-none focus:outline-none disabled:opacity-50 bg-transparent"
                  style={{
                    color:       'var(--t-1)',
                    maxHeight:   '120px',
                    overflowY:   'auto',
                    fieldSizing: 'content',
                  } as React.CSSProperties}
                />
                {/* Animated placeholder overlay */}
                {!input && (
                  <span
                    className="absolute top-3 left-4 text-sm pointer-events-none select-none"
                    style={{
                      color:      'var(--t-3)',
                      opacity:    placeholderFade ? 1 : 0,
                      transition: 'opacity 0.25s ease',
                    }}>
                    {PLACEHOLDERS[placeholderIdx]}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end px-3 pb-2.5">
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={{
                    background: input.trim() && !loading ? '#f97316' : 'var(--s-700)',
                    color:      'white',
                  }}>
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
