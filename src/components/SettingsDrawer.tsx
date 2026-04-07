'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, Bot, Settings, Zap, Trash2, BarChart3 } from 'lucide-react'
import { useSettingsDrawer, DrawerSection } from '@/stores/settings-drawer'
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

interface AdAccount { id: string; name: string; account_id: string; account_status: number; currency: string }

// ─── Meta section ─────────────────────────────────────────────────────────────
function MetaSection({ workspaceId }: { workspaceId: string }) {
  const [token, setToken]             = useState('')
  const [pageId, setPageId]           = useState('')
  const [showToken, setShowToken]     = useState(false)
  const [testing, setTesting]         = useState(false)
  const [testResult, setTestResult]   = useState<{ ok: boolean; name?: string } | null>(null)
  const [accounts, setAccounts]       = useState<AdAccount[]>([])
  const [loadingAcc, setLoadingAcc]   = useState(false)
  const [selAccount, setSelAccount]   = useState('')
  const [selAccountName, setSelAccountName] = useState('')
  const [saving, setSaving]           = useState(false)

  const load = useCallback(() => {
    fetch('/api/workspaces').then(r => r.json()).then(d => {
      if (d.success) {
        const ws = d.data.find((w: { id: string; adAccountId?: string; adAccountName?: string; pageId?: string }) => w.id === workspaceId)
        if (ws) {
          setSelAccount(ws.adAccountId ?? '')
          setSelAccountName(ws.adAccountName ?? '')
          setPageId(ws.pageId ?? '')
        }
      }
    })
  }, [workspaceId])

  useEffect(() => { load() }, [load])

  const testToken = async () => {
    if (!token.trim()) return toast.error('Cole o token primeiro')
    setTesting(true); setTestResult(null)
    const res  = await fetch('/api/meta/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const json = await res.json()
    setTestResult(json.success ? { ok: true, name: json.data.name } : { ok: false })
    setTesting(false)
  }

  const loadAccounts = async () => {
    if (!token.trim()) return toast.error('Cole o token primeiro')
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaToken: token, adAccountId: selAccount, adAccountName: selAccountName, pageId }),
    })
    setLoadingAcc(true)
    const res  = await fetch(`/api/meta/accounts?workspaceId=${workspaceId}`)
    const json = await res.json()
    if (json.success) setAccounts(json.data)
    else toast.error(json.error)
    setLoadingAcc(false)
  }

  const save = async () => {
    setSaving(true)
    const body: Record<string, string> = { adAccountId: selAccount, adAccountName: selAccountName, pageId }
    if (token.trim()) body.metaToken = token
    const res  = await fetch(`/api/workspaces/${workspaceId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    setSaving(false)
    if (json.success) toast.success('Salvo!')
    else toast.error(json.error)
  }

  return (
    <div className="space-y-5">
      {/* Token */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Access Token</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="EAAxxxxxxxxxxxxx..."
              className="w-full rounded-lg bg-surface-900 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10"
            />
            <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={testToken}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-700 border border-surface-600 text-xs text-gray-300 hover:bg-surface-600 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            Testar
          </button>
        </div>
        {testResult && (
          <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border ${testResult.ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
            {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {testResult.ok ? `Conectado como: ${testResult.name}` : 'Token inválido'}
          </div>
        )}
      </div>

      {/* Page ID */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Page ID padrão</label>
        <input
          value={pageId}
          onChange={e => setPageId(e.target.value)}
          placeholder="ID numérico da página"
          className="w-full rounded-lg bg-surface-900 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Ad Account */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conta de anúncios</label>
          <button
            onClick={loadAccounts}
            disabled={loadingAcc}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loadingAcc ? 'animate-spin' : ''}`} />
            Buscar
          </button>
        </div>
        {selAccountName && (
          <p className="text-xs text-gray-500">Selecionada: <span className="text-gray-300 font-medium">{selAccountName}</span></p>
        )}
        {accounts.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {accounts.map(a => (
              <button
                key={a.id}
                onClick={() => { setSelAccount(a.id); setSelAccountName(a.name) }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all text-xs ${selAccount === a.id ? 'border-indigo-500/50 bg-indigo-600/5' : 'border-surface-700 hover:border-surface-600'}`}>
                <div>
                  <p className="text-sm font-medium text-gray-200">{a.name}</p>
                  <p className="text-gray-500">{a.account_id} · {a.currency}</p>
                </div>
                {a.account_status === 1
                  ? <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Ativa</span>
                  : <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Inativa</span>
                }
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}

// ─── YouTube section ───────────────────────────────────────────────────────────
function YoutubeSection() {
  const [openaiKey, setOpenaiKey]         = useState('')
  const [youtubePrompt, setYoutubePrompt] = useState('')
  const [show, setShow]                   = useState(false)
  const [testing, setTesting]             = useState(false)
  const [testResult, setTestResult]       = useState<{ ok: boolean; model?: string } | null>(null)
  const [saving, setSaving]               = useState(false)

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
    if (json.success) toast.success('Salvo!')
    else toast.error(json.error ?? 'Erro ao salvar')
  }

  return (
    <div className="space-y-5">
      {/* OpenAI Key */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">OpenAI API Key</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={show ? 'text' : 'password'} value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-xxxxxxxxxxxxx"
              className="w-full rounded-lg bg-surface-900 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10" />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={testKey}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-700 border border-surface-600 text-xs text-gray-300 hover:bg-surface-600 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            Testar
          </button>
        </div>
        {testResult && (
          <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border ${testResult.ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
            {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {testResult.ok ? `Conectado · ${testResult.model ?? 'gpt-4o'}` : 'Chave inválida'}
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prompt do agente</label>
        </div>
        <textarea
          value={youtubePrompt}
          onChange={e => setYoutubePrompt(e.target.value)}
          rows={12}
          className="w-full rounded-lg bg-surface-900 border border-surface-600 text-gray-200 placeholder-gray-600 px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed"
        />
        <div className="flex justify-between items-center">
          <button onClick={() => setYoutubePrompt(DEFAULT_PROMPT)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Restaurar padrão
          </button>
          <span className="text-xs text-gray-600">{youtubePrompt.length} chars</span>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}

// ─── Workspace section ─────────────────────────────────────────────────────────
function WorkspaceSection({ workspaceId }: { workspaceId: string }) {
  const router    = useRouter()
  const closeDrawer = useSettingsDrawer(s => s.closeDrawer)
  const [name, setName]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/workspaces').then(r => r.json()).then(d => {
      if (d.success) {
        const ws = d.data.find((w: { id: string; name: string }) => w.id === workspaceId)
        if (ws) setName(ws.name)
      }
    })
  }, [workspaceId])

  const saveName = async () => {
    if (!name.trim()) return toast.error('Nome obrigatório')
    setSaving(true)
    const res  = await fetch(`/api/workspaces/${workspaceId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
    const json = await res.json()
    setSaving(false)
    if (json.success) toast.success('Nome salvo!')
    else toast.error(json.error)
  }

  const handleDelete = async () => {
    if (!confirm(`Deletar o workspace "${name}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    const res  = await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (json.success) {
      toast.success('Workspace deletado')
      closeDrawer()
      router.push('/dashboard')
    } else {
      toast.error(json.error)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome do Workspace</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName() }}
            placeholder="Nome do workspace"
            className="flex-1 rounded-lg bg-surface-900 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={saveName}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-surface-700 border border-surface-600 text-xs text-gray-300 hover:bg-surface-600 transition-colors disabled:opacity-50">
            {saving ? '...' : 'Salvar'}
          </button>
        </div>
      </div>

      {workspaceId !== 'default' && (
        <div className="border border-red-500/20 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-red-400">Zona de perigo</p>
          <p className="text-xs text-gray-500">Ao deletar este workspace, todas as configurações serão perdidas permanentemente.</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deletando...' : 'Deletar workspace'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Analytics section ─────────────────────────────────────────────────────────
function AnalyticsSection({ workspaceId }: { workspaceId: string }) {
  const [propertyId,     setPropertyId]     = useState('')
  const [serviceAccount, setServiceAccount] = useState('')
  const [saving,         setSaving]         = useState(false)
  const [showJson,       setShowJson]       = useState(false)

  useEffect(() => {
    fetch('/api/workspaces').then(r => r.json()).then(d => {
      if (d.success) {
        const ws = d.data.find((w: { id: string; ga4PropertyId?: string; ga4ServiceAccount?: string }) => w.id === workspaceId)
        if (ws?.ga4PropertyId)    setPropertyId(ws.ga4PropertyId)
        if (ws?.ga4ServiceAccount) setServiceAccount('••••• (configurado)')
      }
    })
  }, [workspaceId])

  const save = async () => {
    if (!propertyId.trim()) return toast.error('Property ID obrigatório')
    setSaving(true)
    const body: Record<string, string> = { ga4PropertyId: propertyId.trim() }
    if (serviceAccount.trim() && !serviceAccount.startsWith('•')) body.ga4ServiceAccount = serviceAccount.trim()
    const res  = await fetch(`/api/workspaces/${workspaceId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    setSaving(false)
    if (json.success) toast.success('Salvo!')
    else toast.error(json.error)
  }

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="rounded-xl bg-indigo-500/8 border border-indigo-500/20 p-3.5 space-y-1.5 text-xs text-gray-400">
        <p className="font-medium text-indigo-300">Como configurar</p>
        <ol className="space-y-1 list-decimal list-inside">
          <li>Acesse <span className="text-gray-300">console.cloud.google.com</span> → crie um Service Account</li>
          <li>Ative a API <span className="text-gray-300">Google Analytics Data API</span></li>
          <li>Gere uma chave JSON e cole abaixo</li>
          <li>No GA4, vá em Admin → Acesso à propriedade → adicione o e-mail do Service Account como Visualizador</li>
          <li>Cole o Property ID (só os números, ex: <span className="text-gray-300">123456789</span>)</li>
        </ol>
      </div>

      {/* Property ID */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Property ID</label>
        <input
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
          placeholder="123456789"
          className="w-full rounded-lg bg-surface-900 border border-surface-600 text-gray-100 placeholder-gray-600 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-600">GA4 Admin → Detalhes da propriedade → Property ID</p>
      </div>

      {/* Service Account JSON */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Service Account (JSON)</label>
          <button onClick={() => setShowJson(v => !v)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            {showJson ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <textarea
          value={serviceAccount}
          onChange={e => setServiceAccount(e.target.value)}
          onFocus={() => { if (serviceAccount.startsWith('•')) setServiceAccount('') }}
          rows={showJson ? 8 : 3}
          placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
          className="w-full rounded-lg bg-surface-900 border border-surface-600 text-gray-200 placeholder-gray-600 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}

// ─── Main drawer ───────────────────────────────────────────────────────────────
const TABS: { id: DrawerSection; label: string; icon: React.ElementType }[] = [
  { id: 'meta',      label: 'Meta Ads',  icon: Zap },
  { id: 'youtube',   label: 'YouTube',   icon: Bot },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'workspace', label: 'Workspace', icon: Settings },
]

export default function SettingsDrawer() {
  const { open, workspaceId, section, setSection, closeDrawer } = useSettingsDrawer()
  const pathname = usePathname()

  // Auto-switch section based on active nav tab
  useEffect(() => {
    if (!open) return
    if (pathname.startsWith('/youtube')) setSection('youtube')
    else if (section === 'youtube') setSection('meta')
  }, [pathname, open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[380px] bg-surface-800 border-l border-surface-700 shadow-2xl shadow-black/60 flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-200">Configurações</p>
          <button onClick={closeDrawer} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-3 border-b border-surface-700 flex-shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                section === id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-surface-700'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {section === 'meta'      && <MetaSection       key={workspaceId} workspaceId={workspaceId} />}
          {section === 'youtube'   && <YoutubeSection   />}
          {section === 'analytics' && <AnalyticsSection key={workspaceId} workspaceId={workspaceId} />}
          {section === 'workspace' && <WorkspaceSection key={workspaceId} workspaceId={workspaceId} />}
        </div>
      </aside>
    </>
  )
}
