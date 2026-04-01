'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Eye, EyeOff, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface AdAccount { id: string; name: string; account_id: string; account_status: number; currency: string }

export default function SettingsPage() {
  const [token, setToken] = useState('')
  const [pageId, setPageId] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; name?: string } | null>(null)
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedAccountName, setSelectedAccountName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      if (d.data) {
        setSelectedAccount(d.data.adAccountId ?? '')
        setSelectedAccountName(d.data.adAccountName ?? '')
        setPageId(d.data.pageId ?? '')
      }
    })
  }, [])

  const testToken = async () => {
    if (!token.trim()) return toast.error('Cole o token primeiro')
    setTesting(true)
    setTestResult(null)
    const res = await fetch('/api/meta/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const json = await res.json()
    setTestResult(json.success ? { ok: true, name: json.data.name } : { ok: false })
    setTesting(false)
  }

  const loadAccounts = async () => {
    if (!token.trim()) return toast.error('Salve o token primeiro')
    // Save token first so the API can use it
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaToken: token, adAccountId: selectedAccount, adAccountName: selectedAccountName, pageId }),
    })
    setLoadingAccounts(true)
    const res = await fetch('/api/meta/accounts')
    const json = await res.json()
    if (json.success) setAccounts(json.data)
    else toast.error(json.error)
    setLoadingAccounts(false)
  }

  const save = async () => {
    if (!token.trim()) return toast.error('Token é obrigatório')
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaToken: token, adAccountId: selectedAccount, adAccountName: selectedAccountName, pageId, openaiKey }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.success) toast.success('Salvo!')
    else toast.error(json.error)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Token Meta + conta de anúncios</p>
      </div>

      {/* Token */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Access Token</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAAxxxxxxxxxxxxx..."
              className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
            />
            <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button variant="secondary" onClick={testToken} loading={testing} size="sm">
            <RefreshCw className="w-3.5 h-3.5" /> Testar
          </Button>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${testResult.ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testResult.ok ? `Conectado como: ${testResult.name}` : 'Token inválido'}
          </div>
        )}
      </div>

      {/* OpenAI Key */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">OpenAI API Key <span className="text-gray-600 font-normal">(YouTube Ops)</span></h2>
        <div className="relative">
          <input
            type={showOpenaiKey ? 'text' : 'password'}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-proj-xxxxxxxxxxxxx"
            className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
          />
          <button onClick={() => setShowOpenaiKey(!showOpenaiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-600">Usada para transcrição (Whisper) e geração de conteúdo (GPT-4o)</p>
      </div>

      {/* Page ID */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Page ID padrão</h2>
        <input
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          placeholder="ID numérico da página do Facebook"
          className="w-full rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-gray-600">Encontre em: facebook.com/pg/suapagina/about → ID da Página</p>
      </div>

      {/* Ad Account */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">Conta de anúncios</h2>
          <Button variant="secondary" size="sm" onClick={loadAccounts} loading={loadingAccounts}>
            <RefreshCw className="w-3.5 h-3.5" /> Buscar
          </Button>
        </div>

        {selectedAccountName && (
          <div className="text-xs text-gray-400">
            Selecionada: <strong className="text-gray-200">{selectedAccountName}</strong>
          </div>
        )}

        {accounts.length > 0 && (
          <div className="space-y-1.5">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => { setSelectedAccount(a.id); setSelectedAccountName(a.name) }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedAccount === a.id ? 'border-brand-500/50 bg-brand-600/5' : 'border-surface-700 hover:border-surface-600'}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-200">{a.name}</p>
                  <p className="text-xs text-gray-500">{a.account_id} · {a.currency}</p>
                </div>
                {a.account_status === 1
                  ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Ativa</span>
                  : <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Inativa</span>
                }
              </button>
            ))}
          </div>
        )}
      </div>

      <Button onClick={save} loading={saving} size="lg" className="w-full">
        Salvar configurações
      </Button>
    </div>
  )
}
