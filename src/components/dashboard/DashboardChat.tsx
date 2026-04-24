'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { MessageCircle, X, Send, Trash2, Loader2, Bot } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role:       'user' | 'assistant'
  content:    string
  toolStatus?: string
}

interface Props {
  workspaceId: string
}

// ── Tool labels ───────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  get_overview_metrics:    'Consultando métricas gerais...',
  get_campaign_list:       'Buscando campanhas...',
  get_campaign_insights:   'Analisando campanhas...',
  get_creative_performance:'Analisando criativos...',
  get_daily_evolution:     'Buscando evolução diária...',
}

// ── Minimal markdown renderer ─────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="px-1 py-0.5 bg-surface-700 rounded text-indigo-300 text-xs font-mono">{p.slice(1, -1)}</code>
    return p
  })
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Table: collect consecutive pipe lines
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      // filter separator rows (|---|---|)
      const dataRows = tableLines.filter(l => !/^\s*\|[-:| ]+\|\s*$/.test(l))
      if (dataRows.length > 0) {
        const parseRow = (l: string) =>
          l.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        const [headerRow, ...bodyRows] = dataRows
        nodes.push(
          <div key={`table-${i}`} className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr>
                  {parseRow(headerRow).map((cell, ci) => (
                    <th key={ci} className="px-2 py-1 text-left text-gray-400 font-medium border-b border-surface-600 whitespace-nowrap">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-surface-800/50' : ''}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 text-gray-300 border-b border-surface-700/50 whitespace-nowrap">
                        {renderInline(cell)}
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
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''))
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 space-y-0.5 pl-4">
          {items.map((item, ii) => (
            <li key={ii} className="text-gray-300 list-disc list-outside text-sm">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1 space-y-0.5 pl-4">
          {items.map((item, ii) => (
            <li key={ii} className="text-gray-300 list-decimal list-outside text-sm">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Heading
    if (line.startsWith('### ')) {
      nodes.push(<p key={`h-${i}`} className="text-sm font-semibold text-white mt-2">{renderInline(line.slice(4))}</p>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      nodes.push(<p key={`h-${i}`} className="text-sm font-bold text-white mt-2">{renderInline(line.slice(3))}</p>)
      i++; continue
    }

    // Empty line = spacing
    if (!line.trim()) {
      nodes.push(<div key={`br-${i}`} className="h-1.5" />)
      i++; continue
    }

    // Regular paragraph
    nodes.push(
      <p key={`p-${i}`} className="text-sm text-gray-300 leading-relaxed">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div className="space-y-0.5">{nodes}</div>
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-sm">
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant
  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        {message.toolStatus ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span>{message.toolStatus}</span>
          </div>
        ) : message.content ? (
          <div className="bg-surface-800 border border-surface-700 rounded-2xl rounded-tl-sm px-3 py-2.5">
            <MarkdownBlock text={message.content} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span className="text-xs text-gray-500">Pensando...</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Welcome message ───────────────────────────────────────────────────────────
const WELCOME: ChatMessage = {
  role:    'assistant',
  content: 'Olá! Sou seu assistente de marketing. Posso analisar campanhas, criativos, evolução diária e muito mais.\n\nPor exemplo:\n- "Quais os melhores criativos dos últimos 7 dias?"\n- "Como estão as campanhas ODA este mês?"\n- "Qual dia da semana teve mais compras?"',
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DashboardChat({ workspaceId }: Props) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const storageKey = `nohau_chat_${workspaceId}`

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  }, [storageKey])

  // Save history to localStorage (skip welcome-only state)
  useEffect(() => {
    if (messages.length > 1) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
    }
  }, [messages, storageKey])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opening
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

    const userMsg:  ChatMessage = { role: 'user',      content: text }
    const placeholder: ChatMessage = { role: 'assistant', content: '', toolStatus: 'Iniciando...' }

    setMessages(prev => [...prev, userMsg, placeholder])

    // Build API messages (exclude welcome, exclude empty placeholders)
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
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: err.error ?? 'Erro ao conectar com o assistente.' },
        ])
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
            const event = JSON.parse(raw)

            if (event.type === 'tool_start') {
              const label = TOOL_LABELS[event.name] ?? 'Buscando dados...'
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: '', toolStatus: label },
              ])
            }

            if (event.type === 'text') {
              content += event.delta
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content },
              ])
            }

            if (event.type === 'error') {
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: `Erro: ${event.message}` },
              ])
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Falha ao conectar com o assistente. Tente novamente.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, workspaceId])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
          open
            ? 'bg-surface-700 border border-surface-600 text-gray-300'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}>
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[400px] h-[560px] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">Assistente IA</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Análise de campanhas Meta Ads</p>
              </div>
            </div>
            <button
              onClick={clearHistory}
              title="Limpar conversa"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (show only when idle and few messages) */}
          {!loading && messages.length <= 2 && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
              {[
                'Melhores criativos',
                'Resumo de hoje',
                'Campanhas ativas',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50) }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-800 border border-surface-700 text-gray-400 hover:border-indigo-500/40 hover:text-indigo-300 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0 border-t border-surface-700 pt-2.5">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
                placeholder="Pergunte sobre suas campanhas..."
                rows={1}
                className="flex-1 resize-none bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 transition-colors disabled:opacity-50 max-h-24 overflow-y-auto"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0">
                {loading
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />
                }
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha</p>
          </div>

        </div>
      )}
    </>
  )
}
