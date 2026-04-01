'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, CheckCircle2, XCircle, Bot } from 'lucide-react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const DEFAULT_PROMPT = `<ESTILO>
Direto
Estratégico
SEO-friendly
Frases curtas
Clareza máxima
Criativo sem firula
Foco em clique, retenção e conversão
</ESTILO>

<ARQUITETURA_DA_DESCRICAO>
1. Gancho inicial
2. Descrição
3. 3 versões alternativas
4. SEO otimizado
5. Palavras-chave
6. CTA principal
7. Estrutura de links
8. Hashtags finais (formato: "hashtag1, hashtag2, hashtag3" — sem # e sem lista vertical)
</ARQUITETURA_DA_DESCRICAO>`

export default function YoutubeSettingsPage() {
  const [openaiKey, setOpenaiKey]       = useState('')
  const [youtubePrompt, setYoutubePrompt] = useState('')
  const [show, setShow]                 = useState(false)
  const [testing, setTesting]           = useState(false)
  const [testResult, setTestResult]     = useState<{ ok: boolean; model?: string } | null>(null)
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.data?.hasOpenaiKey)  setOpenaiKey('••••••••••••••••')
      if (d.data?.youtubePrompt) setYoutubePrompt(d.data.youtubePrompt)
      else setYoutubePrompt(DEFAULT_PROMPT)
    })
  }, [])

  const testKey = async () => {
    if (!openaiKey.trim() || openaiKey.startsWith('•')) return toast.error('Cole a chave primeiro')
    setTesting(true); setTestResult(null)
    try {
      const res  = await fetch('/api/youtube/test-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openaiKey }) })
      const json = await res.json()
      setTestResult(json.success ? { ok: true, model: json.model } : { ok: false })
    } catch { setTestResult({ ok: false }) }
    finally  { setTesting(false) }
  }

  const save = async () => {
    setSaving(true)
    const body: Record<string, string> = { youtubePrompt }
    if (openaiKey.trim() && !openaiKey.startsWith('•')) body.openaiKey = openaiKey
    const res  = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    setSaving(false)
    if (json.success) toast.success('Configurações salvas!')
    else toast.error(json.error ?? 'Erro ao salvar')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações — YouTube Ops</h1>
        <p className="text-sm text-gray-500 mt-1">Chave OpenAI e prompt personalizado para geração de conteúdo</p>
      </div>

      {/* OpenAI Key */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">OpenAI API Key</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={show ? 'text' : 'password'} value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-xxxxxxxxxxxxx"
              className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10" />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button variant="secondary" onClick={testKey} loading={testing} size="sm">Testar</Button>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${testResult.ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testResult.ok ? `Conectado · ${testResult.model ?? 'gpt-4o'}` : 'Chave inválida ou sem permissão'}
          </div>
        )}
        <p className="text-xs text-gray-600">Obtenha sua chave em <span className="text-gray-400">platform.openai.com/api-keys</span></p>
      </div>

      {/* Custom Prompt */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Bot className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-gray-300">Prompt do agente</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cole aqui as instruções do seu agente. Quando preenchido, substitui os perfis padrão e a IA segue exatamente esse estilo e arquitetura.
            </p>
          </div>
        </div>

        <textarea
          value={youtubePrompt}
          onChange={e => setYoutubePrompt(e.target.value)}
          rows={16}
          className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-200 placeholder-gray-600 px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y leading-relaxed"
        />

        <div className="flex justify-between items-center">
          <button onClick={() => setYoutubePrompt(DEFAULT_PROMPT)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Restaurar padrão
          </button>
          <span className="text-xs text-gray-600">{youtubePrompt.length} caracteres</span>
        </div>
      </div>

      <Button onClick={save} loading={saving} size="lg" className="w-full">Salvar configurações</Button>
    </div>
  )
}
