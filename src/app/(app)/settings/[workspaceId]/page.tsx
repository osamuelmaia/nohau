'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface AdAccount { id: string; name: string; account_id: string; account_status: number; currency: string }

export default function WorkspaceSettingsPage({ params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params
  const router = useRouter()

  const [workspaceName, setWorkspaceName] = useState('')
  const [savingName, setSavingName]       = useState(false)

  const [token, setToken]               = useState('')
  const [pageId, setPageId]             = useState('')
  const [showToken, setShowToken]       = useState(false)
  const [testing, setTesting]           = useState(false)
  const [testResult, setTestResult]     = useState<{ ok: boolean; name?: string } | null>(null)
  const [accounts, setAccounts]         = useState<AdAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [selectedAccount, setSelectedAccount]         = useState('')
  const [selectedAccountName, setSelectedAccountName] = useState('')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // Load workspace info
    fetch('/api/workspaces').then(r => r.json()).then(d => {
      if (d.success) {
        const ws = d.data.find((w: { id: string; name: string }) => w.id === workspaceId)
        if (ws) setWorkspaceName(ws.name)
      }
    })

    // Load settings for this workspace via PATCH-able endpoint
    // We reuse /api/settings but scoped via the workspaces endpoint
    fetch(`/api/workspaces`).then(r => r.json()).then(d => {
      if (d.success) {
        const ws = d.data.find((w: { id: string; adAccountId?: string; adAccountName?: string }) => w.id === workspaceId)
        if (ws) {
          setSelectedAccount(ws.adAccountId ?? '')
          setSelectedAccountName(ws.adAccountName ?? '')
        }
      }
    })
  }, [workspaceId])

  const saveWorkspaceName = async () => {
    if (!workspaceName.trim()) return toast.error('Nome obrigatório')
    setSavingName(true)
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workspaceName.trim() }),
    })
    const json = await res.json()
    setSavingName(false)
    if (json.success) toast.success('Nome salvo!')
    else toast.error(json.error)
  }

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
    if (!token.trim()) return toast.error('Cole o token primeiro')
    // Save token first so the accounts API can use it
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaToken: token, adAccountId: selectedAccount, adAccountName: selectedAccountName, pageId }),
    })
    setLoadingAccounts(true)
    const res = await fetch(`/api/meta/accounts?workspaceId=${workspaceId}`)
    const json = await res.json()
    if (json.success) setAccounts(json.data)
    else toast.error(json.error)
    setLoadingAccounts(false)
  }

  const save = async () => {
    if (!token.trim() && !selectedAccount) return toast.error('Preencha ao menos o token ou a conta')
    setSaving(true)
    const body: Record<string, string> = {
      adAccountId: selectedAccount,
      adAccountName: selectedAccountName,
      pageId,
    }
    if (token.trim()) body.metaToken = token
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (json.success) toast.success('Salvo!')
    else toast.error(json.error)
  }

  const handleDelete = async () => {
    if (workspaceId === 'default') return toast.error('Não é possível remover o workspace padrão')
    if (!confirm(`Deletar o workspace "${workspaceName}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    const res = await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (json.success) {
      toast.success('Workspace deletado')
      router.push('/settings')
    } else {
      toast.error(json.error)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações do Workspace</h1>
        <p className="text-sm text-gray-500 mt-1">Token Meta + conta de anúncios</p>
      </div>

      {/* Workspace name */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Nome do Workspace</h2>
        <div className="flex gap-2">
          <input
            value={workspaceName}
            onChange={e => setWorkspaceName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveWorkspaceName() }}
            placeholder="Nome do workspace"
            className="flex-1 rounded-lg bg-surface-750 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button variant="secondary" onClick={saveWorkspaceName} loading={savingName} size="sm">
            Salvar
          </Button>
        </div>
      </div>

      {/* Token */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Access Token</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
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

      {/* Page ID */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Page ID padrão</h2>
        <input
          value={pageId}
          onChange={e => setPageId(e.target.value)}
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
            {accounts.map(a => (
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

      {/* Delete workspace */}
      {workspaceId !== 'default' && (
        <div className="bg-surface-800 border border-red-500/20 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-red-400">Zona de perigo</h2>
          <p className="text-xs text-gray-500">Ao deletar este workspace, todas as suas configurações serão perdidas permanentemente.</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deletando...' : 'Deletar workspace'}
          </button>
        </div>
      )}
    </div>
  )
}
