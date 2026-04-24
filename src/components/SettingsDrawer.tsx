'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, Bot, Trash2, ChevronDown, ChevronUp, Building2, Zap, BarChart3, Youtube } from 'lucide-react'
import { useSettingsDrawer } from '@/stores/settings-drawer'
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

// ── Reusable field styles ─────────────────────────────────────────────────────
const inputCls = `
  w-full rounded-lg px-3 py-2 text-sm font-mono transition-colors
  focus:outline-none focus:ring-2 focus:ring-orange-500/30
`
const inputStyle = {
  background:   'var(--s-950)',
  border:       '1px solid var(--t-border)',
  color:        'var(--t-1)',
}
const btnCls = `
  flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0
`

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, description, open, onToggle }: {
  icon: React.ElementType; label: string; description: string; open: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start justify-between py-2 gap-3 group text-left">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: 'rgba(249,115,22,0.1)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--t-1)' }}>{label}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--t-3)' }}>{description}</p>
        </div>
      </div>
      {open
        ? <ChevronUp  className="w-3.5 h-3.5 mt-1.5 flex-shrink-0" style={{ color: 'var(--t-3)' }} />
        : <ChevronDown className="w-3.5 h-3.5 mt-1.5 flex-shrink-0" style={{ color: 'var(--t-3)' }} />}
    </button>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
      ok
        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
        : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
    }`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </div>
  )
}

// ── Label ─────────────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--t-2)' }}>
      {children}
    </label>
  )
}

// ── Meta Ads section ──────────────────────────────────────────────────────────
function MetaSection({ workspaceId }: { workspaceId: string }) {
  const [token,          setToken]          = useState('')
  const [hasToken,       setHasToken]       = useState(false)
  const [pageId,         setPageId]         = useState('')
  const [showToken,      setShowToken]      = useState(false)
  const [testing,        setTesting]        = useState(false)
  const [testResult,     setTestResult]     = useState<{ ok: boolean; name?: string } | null>(null)
  const [accounts,       setAccounts]       = useState<AdAccount[]>([])
  const [loadingAcc,     setLoadingAcc]     = useState(false)
  const [selAccount,     setSelAccount]     = useState('')
  const [selAccountName, setSelAccountName] = useState('')
  const [saving,         setSaving]         = useState(false)

  const load = useCallback(() => {
    fetch('/api/workspaces').then(r => r.json()).then(d => {
      if (!d.success) return
      const ws = d.data.find((w: { id: string; hasToken?: boolean; adAccountId?: string; adAccountName?: string; pageId?: string }) => w.id === workspaceId)
      if (!ws) return
      setHasToken(!!ws.hasToken)
      setSelAccount(ws.adAccountId ?? '')
      setSelAccountName(ws.adAccountName ?? '')
      setPageId(ws.pageId ?? '')
    })
  }, [workspaceId])

  useEffect(() => { load() }, [load])

  const testToken = async () => {
    if (!token.trim()) return toast.error('Cole o token primeiro')
    setTesting(true); setTestResult(null)
    try {
      const res  = await fetch('/api/meta/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const json = await res.json()
      setTestResult(json.success ? { ok: true, name: json.data.name } : { ok: false })
    } catch { setTestResult({ ok: false }) }
    setTesting(false)
  }

  const loadAccounts = async () => {
    if (!token.trim() && !hasToken) return toast.error('Cole o token primeiro')
    setLoadingAcc(true)
    try {
      if (token.trim()) {
        await fetch(`/api/workspaces/${workspaceId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metaToken: token }),
        })
        setHasToken(true)
      }
      const res  = await fetch(`/api/meta/accounts?workspaceId=${workspaceId}`)
      const json = await res.json()
      if (json.success) setAccounts(json.data)
      else toast.error(json.error)
    } catch { toast.error('Erro ao buscar contas') }
    setLoadingAcc(false)
  }

  const save = async () => {
    setSaving(true)
    const body: Record<string, string> = { pageId: pageId.trim() }
    if (token.trim()) body.metaToken = token.trim()
    if (selAccount)   body.adAccountId = selAccount

    const res  = await fetch(`/api/workspaces/${workspaceId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    setSaving(false)
    if (json.success) { toast.success('Salvo!'); load() }
    else toast.error(json.error ?? 'Erro ao salvar')
  }

  return (
    <div className="space-y-4">
      {/* Token */}
      <div>
        <FieldLabel>
          Token de Acesso Meta
          {hasToken && <span className="ml-2 text-emerald-500 text-[10px]">✓ configurado</span>}
        </FieldLabel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={hasToken ? '••••••••  (deixe vazio para manter)' : 'EAAxxxxxxx...'}
              className={inputCls + ' pr-9'}
              style={inputStyle}
            />
            <button
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--t-3)' }}>
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={testToken} disabled={testing} className={btnCls + ' disabled:opacity-50'}
            style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)', color: 'var(--t-1)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            Testar
          </button>
        </div>
        {testResult && <div className="mt-2"><StatusBadge ok={testResult.ok} label={testResult.ok ? `Conectado · ${testResult.name}` : 'Token inválido'} /></div>}
      </div>

      {/* Page ID */}
      <div>
        <FieldLabel>Page ID (Facebook)</FieldLabel>
        <input
          value={pageId}
          onChange={e => setPageId(e.target.value)}
          placeholder="Ex: 123456789"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {/* Ad Account */}
      <div>
        <FieldLabel>Conta de Anúncios</FieldLabel>
        {selAccountName && (
          <p className="text-xs mb-1.5" style={{ color: 'var(--t-2)' }}>Atual: <strong>{selAccountName}</strong></p>
        )}
        <div className="flex gap-2">
          {accounts.length > 0 ? (
            <select
              value={selAccount}
              onChange={e => {
                setSelAccount(e.target.value)
                setSelAccountName(accounts.find(a => a.id === e.target.value || `act_${a.account_id}` === e.target.value)?.name ?? '')
              }}
              className={inputCls + ' flex-1'}
              style={inputStyle}>
              <option value="">Selecionar conta</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
              ))}
            </select>
          ) : (
            <div className="flex-1 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)', color: 'var(--t-3)' }}>
              Clique em "Buscar" para listar as contas
            </div>
          )}
          <button onClick={loadAccounts} disabled={loadingAcc} className={btnCls + ' disabled:opacity-50'}
            style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)', color: 'var(--t-1)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAcc ? 'animate-spin' : ''}`} />
            Buscar
          </button>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 keep-white"
        style={{ background: '#0f0f0f', color: 'white' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#222222')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0f0f0f')}>
        {saving ? 'Salvando…' : 'Salvar Meta Ads'}
      </button>
    </div>
  )
}

// ── Google Analytics section ──────────────────────────────────────────────────
function AnalyticsSection({ workspaceId }: { workspaceId: string }) {
  const [propertyId,     setPropertyId]     = useState('')
  const [serviceAccount, setServiceAccount] = useState('')
  const [saving,         setSaving]         = useState(false)
  const [showJson,       setShowJson]       = useState(false)

  useEffect(() => {
    fetch('/api/workspaces').then(r => r.json()).then(d => {
      if (!d.success) return
      const ws = d.data.find((w: { id: string; ga4PropertyId?: string; ga4ServiceAccount?: string }) => w.id === workspaceId)
      if (ws?.ga4PropertyId)    setPropertyId(ws.ga4PropertyId)
      if (ws?.ga4ServiceAccount) setServiceAccount('••••• (configurado)')
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
    <div className="space-y-4">
      <div className="rounded-lg px-3.5 py-3 text-xs space-y-1" style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)', color: 'var(--t-2)' }}>
        <p className="font-medium" style={{ color: 'var(--t-1)' }}>Como configurar</p>
        <ol className="space-y-1 list-decimal list-inside" style={{ color: 'var(--t-2)' }}>
          <li>Google Cloud Console → crie um Service Account</li>
          <li>Ative a <em>Google Analytics Data API</em></li>
          <li>Gere uma chave JSON e cole abaixo</li>
          <li>No GA4 → Admin → adicione o e-mail do Service Account como Visualizador</li>
        </ol>
      </div>

      <div>
        <FieldLabel>Property ID</FieldLabel>
        <input value={propertyId} onChange={e => setPropertyId(e.target.value)}
          placeholder="123456789" className={inputCls} style={inputStyle} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel>Service Account JSON</FieldLabel>
          <button onClick={() => setShowJson(v => !v)} className="text-xs" style={{ color: 'var(--t-3)' }}>
            {showJson ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <textarea
          value={serviceAccount}
          onChange={e => setServiceAccount(e.target.value)}
          onFocus={() => { if (serviceAccount.startsWith('•')) setServiceAccount('') }}
          rows={showJson ? 8 : 2}
          placeholder={'{"type":"service_account","project_id":"..."}'}
          className={inputCls + ' resize-none text-xs'}
          style={inputStyle}
        />
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 keep-white"
        style={{ background: '#0f0f0f', color: 'white' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#222222')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0f0f0f')}>
        {saving ? 'Salvando…' : 'Salvar Analytics'}
      </button>
    </div>
  )
}

// ── YouTube section ───────────────────────────────────────────────────────────
function YoutubeSection() {
  const [openaiKey,      setOpenaiKey]      = useState('')
  const [youtubePrompt,  setYoutubePrompt]  = useState('')
  const [show,           setShow]           = useState(false)
  const [testing,        setTesting]        = useState(false)
  const [testResult,     setTestResult]     = useState<{ ok: boolean; model?: string } | null>(null)
  const [saving,         setSaving]         = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.data?.hasOpenaiKey)  setOpenaiKey('••••••••••••••••')
      setYoutubePrompt(d.data?.youtubePrompt || DEFAULT_PROMPT)
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
    setTesting(false)
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
    <div className="space-y-4">
      <div>
        <FieldLabel>OpenAI API Key</FieldLabel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={show ? 'text' : 'password'} value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-xxxxx" className={inputCls + ' pr-9'} style={inputStyle} />
            <button onClick={() => setShow(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-3)' }}>
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={testKey} disabled={testing} className={btnCls + ' disabled:opacity-50'}
            style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)', color: 'var(--t-1)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            Testar
          </button>
        </div>
        {testResult && <div className="mt-2"><StatusBadge ok={testResult.ok} label={testResult.ok ? `Conectado · ${testResult.model ?? 'gpt-4o'}` : 'Chave inválida'} /></div>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel><Bot className="w-3 h-3 inline mr-1" />Prompt do agente</FieldLabel>
          <button onClick={() => setYoutubePrompt(DEFAULT_PROMPT)} className="text-xs" style={{ color: 'var(--t-3)' }}>Restaurar padrão</button>
        </div>
        <textarea
          value={youtubePrompt}
          onChange={e => setYoutubePrompt(e.target.value)}
          rows={10}
          className={inputCls + ' resize-y text-xs leading-relaxed'}
          style={inputStyle}
        />
        <p className="text-right text-[10px] mt-1" style={{ color: 'var(--t-3)' }}>{youtubePrompt.length} chars</p>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 keep-white"
        style={{ background: '#0f0f0f', color: 'white' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#222222')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0f0f0f')}>
        {saving ? 'Salvando…' : 'Salvar YouTube'}
      </button>
    </div>
  )
}

// ── Workspace section ─────────────────────────────────────────────────────────
function WorkspaceSection({ workspaceId }: { workspaceId: string }) {
  const router      = useRouter()
  const closeDrawer = useSettingsDrawer(s => s.closeDrawer)
  const [name,      setName]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  useEffect(() => {
    fetch('/api/workspaces').then(r => r.json()).then(d => {
      if (!d.success) return
      const ws = d.data.find((w: { id: string; name: string }) => w.id === workspaceId)
      if (ws) setName(ws.name)
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
    if (json.success) { toast.success('Workspace deletado'); closeDrawer(); router.push('/dashboard') }
    else toast.error(json.error)
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Nome do workspace</FieldLabel>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName() }}
            className={inputCls + ' flex-1'}
            style={inputStyle}
          />
          <button onClick={saveName} disabled={saving} className={btnCls + ' disabled:opacity-50'}
            style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)', color: 'var(--t-1)' }}>
            {saving ? '...' : 'Salvar'}
          </button>
        </div>
      </div>

      {workspaceId !== 'default' && (
        <div className="rounded-lg p-3.5 space-y-2" style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
          <p className="text-xs font-semibold text-red-500">Zona de perigo</p>
          <p className="text-xs" style={{ color: 'var(--t-2)' }}>Ao deletar este workspace todas as configurações serão perdidas permanentemente.</p>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deletando…' : 'Deletar workspace'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main drawer ───────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'workspace', label: 'Workspace',          icon: Building2,  description: 'Nome e identidade deste cliente no sistema' },
  { id: 'meta',      label: 'Meta Ads',            icon: Zap,        description: 'Token de acesso, conta de anúncios e página do Facebook' },
  { id: 'analytics', label: 'Google Analytics',    icon: BarChart3,  description: 'Integração GA4 para dados de sessões e conversões do site' },
  { id: 'youtube',   label: 'YouTube',             icon: Youtube,    description: 'Chave OpenAI e prompt do agente de transcrição' },
] as const

export default function SettingsDrawer() {
  const { open, workspaceId, closeDrawer } = useSettingsDrawer()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  const toggle = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={closeDrawer} />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-full flex flex-col transform transition-transform duration-250 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width:      'min(420px, 100vw)',
          background: 'var(--s-900)',
          borderLeft: '1px solid var(--t-border)',
          boxShadow:  '0 0 40px rgba(0,0,0,0.15)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--t-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--t-1)' }}>Configurações</p>
          <button onClick={closeDrawer} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--t-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-3)')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content — all sections in one flow */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-0">
          {SECTIONS.map(({ id, label, icon, description }, i) => {
            const isOpen = !collapsed[id]
            return (
              <div key={id}>
                {/* Divider (not before first) */}
                {i > 0 && <div className="my-4" style={{ borderTop: '1px solid var(--t-border)' }} />}

                <SectionHeader icon={icon} label={label} description={description} open={isOpen} onToggle={() => toggle(id)} />

                {isOpen && (
                  <div className="mt-3 pb-1 animate-fade-in">
                    {id === 'meta'      && <MetaSection      key={workspaceId} workspaceId={workspaceId} />}
                    {id === 'analytics' && <AnalyticsSection key={workspaceId} workspaceId={workspaceId} />}
                    {id === 'youtube'   && <YoutubeSection />}
                    {id === 'workspace' && <WorkspaceSection key={workspaceId} workspaceId={workspaceId} />}
                  </div>
                )}
              </div>
            )
          })}

          <div className="h-8" />
        </div>
      </aside>
    </>
  )
}
