'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Plus, Check, LayoutDashboard, Settings } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  adAccountName: string | null
  hasToken: boolean
}

export default function WorkspaceSwitcher({ currentId }: { currentId: string }) {
  const [open, setOpen]           = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const ref                       = useRef<HTMLDivElement>(null)
  const router                    = useRouter()

  useEffect(() => {
    fetch('/api/workspaces').then(r => r.json()).then(j => {
      if (j.success) setWorkspaces(j.data)
    })
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = workspaces.find(w => w.id === currentId)

  const handleCreate = async () => {
    if (!newName.trim()) return
    const res  = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const json = await res.json()
    if (json.success) {
      setWorkspaces(prev => [...prev, json.data])
      setNewName('')
      setCreating(false)
      router.push(`/dashboard/${json.data.id}`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800 border border-surface-700
          text-sm text-gray-200 hover:border-surface-600 transition-colors max-w-[200px]">
        <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        <span className="truncate flex-1 text-left font-medium">{current?.name ?? '...'}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 w-64 bg-surface-800 border border-surface-700
          rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="py-1.5">
            {workspaces.map(w => (
              <div key={w.id} className="flex items-center gap-1 px-2">
                <button
                  onClick={() => { router.push(`/dashboard/${w.id}`); setOpen(false) }}
                  className="flex-1 flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-surface-700 transition-colors text-left">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    w.id === currentId ? 'bg-indigo-500/20 text-indigo-400' : 'bg-surface-700 text-gray-400'
                  }`}>
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate font-medium">{w.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {w.hasToken ? (w.adAccountName ?? 'Conta configurada') : 'Sem token configurado'}
                    </p>
                  </div>
                  {w.id === currentId && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                </button>
                <Link
                  href={`/settings/${w.id}`}
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-700 transition-colors flex-shrink-0"
                  title="Configurar workspace">
                  <Settings className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>

          <div className="border-t border-surface-700 p-2">
            {creating ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nome do workspace..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                  className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-500/60"
                />
                <button
                  onClick={handleCreate}
                  className="px-2.5 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium">
                  Criar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-700 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Novo workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
