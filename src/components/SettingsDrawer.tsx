'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, Bot, Trash2, ChevronDown, ChevronUp, Building2, Zap, BarChart3, Youtube, Plus, PlusCircle } from 'lucide-react'
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

// ── Linked account card ───────────────────────────────────────────────────────
interface LinkedAccount { id: string; adAccountId: string; adAccountName?: string | null; label?: string | null; pageId?: string | null }

function LinkedAccountCard({ account, onRemove }: { account: LinkedAccount; onRemove: () => void }) {
  const display = account.label ?? account.adAccountName ?? account.adAccountId
  const sub     = account.label ? (account.adAccountName ?? account.adAccountId) : account.adAccountId
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--t-1)' }}>{display}</p>
        {sub !== display && <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--t-3)' }}>{sub}</p>}
      </div>
      <button onClick={onRemove} className="flex-shrink-0 p-1 rounded transition-colors"
        title="Remover conta"
        style={{ color: 'var(--t-3)' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-3)')}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Add-account form ──────────────────────────────────────────────────────────
function AddAccountForm({ workspaceId, onAdded }: { workspaceId: string; onAdded: () => void }) {
  const [token,          setToken]          = useState('')
  const [showToken,      setShowToken]      = useState(false)
  const [testing,        setTesting]        = useState(false)
  const [testResult,     setTestResult]     = useState<{ ok: boolean; name?: string } | null>(null)
  const [label,          setLabel]          = useState('')
  const [pageId,         setPageId]         = useState('')
  const [accounts,       setAccounts]       = useState<AdAccount[]>([])
  const [loadingAcc,     setLoadingAcc]     = useState(false)
  const [accountsError,  setAccountsError]  = useState<string | null>(null)
  const [selAccount,     setSelAccount]     = useState('')
  const [selAccountName, setSelAccountName] = useState('')
  const [manualId,       setManualId]       = useState('')
  const [manualLoading,  setManualLoading]  = useState(false)
  const [manualError,    setManualError]    = useState<string | null>(null)
  const [saving,         setSaving]         = useState(false)

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
    if (!token.trim()) { setAccountsError('Cole o token de acesso acima.'); return }
    setLoadingAcc(true); setAccountsError(null)
    try {
      // Temporarily save the token so the accounts endpoint can use it
      const patchRes = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metaToken: token }),
      })
      if (!patchRes.ok) throw new Error('Erro ao validar o token.')
      const res  = await fetch(`/api/meta/accounts?workspaceId=${workspaceId}`)
      const json = await res.json()
      if (json.success) {
        setAccounts(json.data)
        if (json.data.length === 0) setAccountsError('Nenhuma conta encontrada para este token.')
      } else {
        setAccountsError(json.error ?? 'Erro ao buscar contas.')
      }
    } catch (e) {
      setAccountsError(e instanceof Error ? e.message : 'Erro ao buscar contas.')
    } finally { setLoadingAcc(false) }
  }

  const useManualId = async () => {
    if (!manualId.trim()) return
    setManualLoading(true); setManualError(null)
    try {
      const id  = manualId.trim().replace(/^act_/, '')
      const res  = await fetch(`/api/meta/accounts?workspaceId=${workspaceId}&adAccountId=${id}`)
      const json = await res.json()
      if (json.success && json.data?.[0]) {
        const acc = json.data[0] as AdAccount
        setSelAccount(acc.id)
        setSelAccountName(acc.name)
        setAccounts(prev => prev.find(a => a.id === acc.id) ? prev : [...prev, acc])
        setManualId('')
      } else {
        setManualError(json.error ?? 'ID inválido ou não encontrado')
      }
    } catch { setManualError('Erro ao validar ID') }
    setManualLoading(false)
  }

  const save = async () => {
    if (!selAccount && !manualId.trim()) return toast.error('Selecione ou informe uma conta de anúncios')
    if (!token.trim()) return toast.error('Token obrigatório')
    setSaving(true)
    const adAccountId   = selAccount || (manualId.trim().replace(/^act_/, ''))
    const adAccountName = selAccountName || selAccount || manualId
    try {
      const res  = await fetch(`/api/workspaces/${workspaceId}/meta-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId, adAccountName, metaToken: token.trim(), pageId: pageId.trim() || undefined, label: label.trim() || undefined }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Conta vinculada!')
        onAdded()
        // Reset form
        setToken(''); setLabel(''); setPageId(''); setAccounts([]); setSelAccount(''); setSelAccountName(''); setTestResult(null)
      } else {
        toast.error(json.error ?? 'Erro ao vincular conta')
      }
    } catch { toast.error('Erro ao vincular conta') }
    setSaving(false)
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Token */}
      <div>
        <FieldLabel>Token de Acesso Meta</FieldLabel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={showToken ? 'text' : 'password'} value={token}
              onChange={e => { setToken(e.target.value); setAccountsError(null) }}
              placeholder="EAAxxxxxxx..."
              className={inputCls + ' pr-9'} style={inputStyle} />
            <button onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-3)' }}>
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

      {/* Label */}
      <div>
        <FieldLabel>Apelido da conta <span className="font-normal opacity-60">(opcional)</span></FieldLabel>
        <input value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Ex: BM Principal, BM Clientes…"
          className={inputCls} style={inputStyle} />
      </div>

      {/* Page ID */}
      <div>
        <FieldLabel>Page ID <span className="font-normal opacity-60">(opcional)</span></FieldLabel>
        <input value={pageId} onChange={e => setPageId(e.target.value)}
          placeholder="Ex: 123456789"
          className={inputCls} style={inputStyle} />
      </div>

      {/* Account select */}
      <div>
        <FieldLabel>Conta de Anúncios</FieldLabel>
        <div className="flex gap-2">
          {accounts.length > 0 ? (
            <select value={selAccount}
              onChange={e => {
                setSelAccount(e.target.value)
                setSelAccountName(accounts.find(a => a.id === e.target.value || `act_${a.account_id}` === e.target.value)?.name ?? '')
              }}
              className={inputCls + ' flex-1'} style={inputStyle}>
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
          <button onClick={loadAccounts} disabled={loadingAcc || !token.trim()}
            className={btnCls + ' disabled:opacity-40 disabled:cursor-not-allowed'}
            title={!token.trim() ? 'Insira o token acima primeiro' : 'Buscar contas de anúncios'}
            style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)', color: 'var(--t-1)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAcc ? 'animate-spin' : ''}`} />
            Buscar
          </button>
        </div>
        {accountsError && <p className="mt-1.5 text-xs" style={{ color: '#ef4444' }}>{accountsError}</p>}

        {/* Manual ID fallback */}
        <div className="mt-2 rounded-lg px-3 py-2.5 space-y-2" style={{ background: 'var(--s-850)', border: '1px solid var(--t-border)' }}>
          <p className="text-[11px]" style={{ color: 'var(--t-3)' }}>
            Não encontrou a conta? Cole o ID (<code className="font-mono">act_XXXXXXXX</code>)
          </p>
          <div className="flex gap-2">
            <input value={manualId} onChange={e => { setManualId(e.target.value); setManualError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') useManualId() }}
              placeholder="act_123456789 ou 123456789"
              className={inputCls + ' flex-1 text-xs'} style={inputStyle} />
            <button onClick={useManualId} disabled={manualLoading || !manualId.trim()}
              className={btnCls + ' disabled:opacity-40'}
              style={{ background: 'var(--s-800)', border: '1px solid var(--t-border)', color: 'var(--t-1)' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${manualLoading ? 'animate-spin' : ''}`} />
              Usar
            </button>
          </div>
          {manualError && <p className="text-xs" style={{ color: '#ef4444' }}>{manualError}</p>}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 keep-white flex items-center justify-center gap-2"
        style={{ background: '#0f0f0f', color: 'white' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#222222')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0f0f0f')}>
        {saving ? 'Vinculando…' : <><Plus className="w-3.5 h-3.5" />Vincular conta</>}
      </button>
    </div>
  )
}

// ── Meta Ads section ──────────────────────────────────────────────────────────
function MetaSection({ workspaceId }: { workspaceId: string }) {
  const [linked,     setLinked]     = useState<LinkedAccount[]>([])
  const [showForm,   setShowForm]   = useState(false)
  const [removing,   setRemoving]   = useState<string | null>(null)

  const loadLinked = useCallback(() => {
    fetch(`/api/workspaces/${workspaceId}/meta-accounts`)
      .then(r => r.json())
      .then(d => { if (d.success) setLinked(d.data) })
  }, [workspaceId])

  useEffect(() => { loadLinked() }, [loadLinked])

  const removeAccount = async (id: string) => {
    if (!confirm('Remover esta conta de anúncios do dashboard?')) return
    setRemoving(id)
    try {
      const res  = await fetch(`/api/workspaces/${workspaceId}/meta-accounts/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) { toast.success('Conta removida'); loadLinked() }
      else toast.error(json.error ?? 'Erro ao remover')
    } catch { toast.error('Erro ao remover') }
    setRemoving(null)
  }

  return (
    <div className="space-y-3">
      {/* Linked accounts list */}
      {linked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium" style={{ color: 'var(--t-3)' }}>
            {linked.length === 1 ? '1 conta vinculada' : `${linked.length} contas vinculadas`}
          </p>
          {linked.map(acc => (
            <div key={acc.id} style={{ opacity: removing === acc.id ? 0.5 : 1 }}>
              <LinkedAccountCard account={acc} onRemove={() => removeAccount(acc.id)} />
            </div>
          ))}
        </div>
      )}

      {linked.length === 0 && !showForm && (
        <div className="rounded-lg px-3 py-4 text-center" style={{ border: '1px dashed var(--t-border)' }}>
          <p className="text-xs" style={{ color: 'var(--t-3)' }}>Nenhuma conta vinculada ainda.</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--t-3)' }}>Adicione uma ou mais contas de anúncios abaixo.</p>
        </div>
      )}

      {/* Toggle add form */}
      <button
        onClick={() => setShowForm(v => !v)}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${showForm ? '' : ''}`}
        style={{
          background: showForm ? 'var(--s-850)' : 'rgba(249,115,22,0.08)',
          border:     `1px solid ${showForm ? 'var(--t-border)' : 'rgba(249,115,22,0.25)'}`,
          color:      showForm ? 'var(--t-2)' : '#f97316',
        }}>
        {showForm
          ? <><ChevronUp className="w-3.5 h-3.5" />Cancelar</>
          : <><PlusCircle className="w-3.5 h-3.5" />Adicionar conta de anúncios</>
        }
      </button>

      {showForm && (
        <div className="rounded-lg p-3" style={{ border: '1px solid var(--t-border)', background: 'var(--s-950)' }}>
          <AddAccountForm workspaceId={workspaceId} onAdded={() => { loadLinked(); setShowForm(false) }} />
        </div>
      )}
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
