'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LayoutDashboard, LogOut, Settings, Sun, Moon } from 'lucide-react'
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher'
import { useSettingsDrawer } from '@/stores/settings-drawer'

async function handleLogout() {
  await fetch('/api/auth', { method: 'DELETE' })
  window.location.href = '/login'
}

export default function NavHeader() {
  const path    = usePathname()
  const { openDrawer } = useSettingsDrawer()
  const [isDark, setIsDark] = useState(false)
  const workspaceMatch = path.match(/^\/dashboard\/([^/]+)/)
  const workspaceId    = workspaceMatch?.[1] ?? 'default'
  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')) }, [])
  const toggleTheme = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('nohau-theme', next ? 'dark' : 'light')
    setIsDark(next)
  }
  return (
    <header className="relative sticky top-0 z-40 flex items-center px-5 h-12 border-b" style={{ backgroundColor: 'var(--s-900)', borderColor: 'var(--t-border)' }}>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white keep-white text-[10px] font-black leading-none">N</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--t-1)' }}>Nohau</span>
        </Link>
        {workspaceMatch && (<><span className="text-xs" style={{ color: 'var(--t-3)' }}>/</span><WorkspaceSwitcher currentId={workspaceId} /></>)}
      </div>
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
        <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ color: path.startsWith('/dashboard')||path==='/' ? '#f97316' : 'var(--t-2)', backgroundColor: path.startsWith('/dashboard')||path==='/' ? 'rgba(249,115,22,0.08)' : 'transparent' }}>
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </nav>
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
        <button onClick={toggleTheme} title={isDark?'Modo claro':'Modo escuro'} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--t-3)' }} onMouseEnter={e=>(e.currentTarget.style.color='var(--t-1)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--t-3)')}>{isDark?<Sun className="w-3.5 h-3.5" />:<Moon className="w-3.5 h-3.5" />}</button>
        <button onClick={()=>openDrawer(workspaceId,'meta')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors" style={{ color: 'var(--t-3)' }} onMouseEnter={e=>(e.currentTarget.style.color='var(--t-1)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--t-3)')}><Settings className="w-3.5 h-3.5" />Config</button>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors" style={{ color: 'var(--t-3)' }} onMouseEnter={e=>{e.currentTarget.style.color='#ef4444';e.currentTarget.style.backgroundColor='rgba(239,68,68,0.08)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--t-3)';e.currentTarget.style.backgroundColor='transparent'}}><LogOut className="w-3.5 h-3.5" />Sair</button>
      </div>
    </header>
  )
}
