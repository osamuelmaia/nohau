'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Youtube, Megaphone, ChartNoAxesCombined, PenLine, LayoutDashboard, LogOut, Settings, Sun, Moon } from 'lucide-react'
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher'
import { useSettingsDrawer } from '@/stores/settings-drawer'
import type { DrawerSection } from '@/stores/settings-drawer'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard,     match: (p: string) => p.startsWith('/dashboard') || p === '/', section: 'meta' as DrawerSection },
  { href: '/youtube',   label: 'YouTube',      icon: Youtube,             match: (p: string) => p.startsWith('/youtube'),               section: 'youtube' as DrawerSection },
  { href: '/campaigns', label: 'Campanhas',    icon: Megaphone,           match: (p: string) => p.startsWith('/campaigns'),             section: 'meta' as DrawerSection },
  { href: '/audit',     label: 'Analytics',    icon: ChartNoAxesCombined, match: (p: string) => p.startsWith('/audit'),                 section: 'meta' as DrawerSection },
  { href: '/copy',      label: 'Copy',         icon: PenLine,             match: (p: string) => p.startsWith('/copy'),                  section: 'youtube' as DrawerSection },
]

async function handleLogout() {
  await fetch('/api/auth', { method: 'DELETE' })
  window.location.href = '/login'
}

export default function NavHeader() {
  const path    = usePathname()
  const active  = NAV.find(n => n.match(path)) ?? NAV[0]
  const { openDrawer } = useSettingsDrawer()
  const [isDark, setIsDark] = useState(false)

  const workspaceMatch = path.match(/^\/dashboard\/([^/]+)/)
  const workspaceId    = workspaceMatch?.[1] ?? 'default'

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('nohau-theme', next ? 'dark' : 'light')
    setIsDark(next)
  }

  return (
    <header
      className="relative sticky top-0 z-40 flex items-center px-5 h-12 border-b"
      style={{ backgroundColor: 'var(--s-900)', borderColor: 'var(--t-border)' }}>

      {/* Left — logo + workspace */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white keep-white text-[10px] font-black leading-none">N</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--t-1)' }}>Nohau</span>
        </Link>

        {workspaceMatch && (
          <>
            <span className="text-xs" style={{ color: 'var(--t-3)' }}>/</span>
            <WorkspaceSwitcher currentId={workspaceId} />
          </>
        )}
      </div>

      {/* Center — nav (absolutely centered so left/right width changes don't shift it) */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const isActive = match(path)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                color:           isActive ? '#f97316' : 'var(--t-2)',
                backgroundColor: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
              }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Right — actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Modo claro' : 'Modo escuro'}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--t-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-3)')}>
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => openDrawer(workspaceId, active.section)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--t-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-3)')}>
          <Settings className="w-3.5 h-3.5" />
          Config
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--t-3)' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#ef4444'
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--t-3)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}>
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </header>
  )
}
