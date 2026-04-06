'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Youtube, Megaphone, ChartNoAxesCombined, Scissors, PenLine, LayoutDashboard, LogOut, Settings } from 'lucide-react'
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher'
import { useSettingsDrawer } from '@/stores/settings-drawer'
import type { DrawerSection } from '@/stores/settings-drawer'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard,     match: (p: string) => p.startsWith('/dashboard') || p === '/', section: 'meta' as DrawerSection },
  { href: '/youtube',   label: 'YouTube Ops', icon: Youtube,             match: (p: string) => p.startsWith('/youtube'),               section: 'youtube' as DrawerSection },
  { href: '/campaigns', label: 'Campanhas',   icon: Megaphone,           match: (p: string) => p.startsWith('/campaigns'),             section: 'meta' as DrawerSection },
  { href: '/audit',     label: 'Webanalisis', icon: ChartNoAxesCombined, match: (p: string) => p.startsWith('/audit'),                 section: 'meta' as DrawerSection },
  { href: '/cliper',    label: 'Cliper',       icon: Scissors,            match: (p: string) => p.startsWith('/cliper'),               section: 'youtube' as DrawerSection },
  { href: '/copy',      label: 'Copy Agent',  icon: PenLine,             match: (p: string) => p.startsWith('/copy'),                  section: 'youtube' as DrawerSection },
]

async function handleLogout() {
  await fetch('/api/auth', { method: 'DELETE' })
  window.location.href = '/login'
}

export default function NavHeader() {
  const path    = usePathname()
  const active  = NAV.find(n => n.match(path)) ?? NAV[0]
  const { openDrawer } = useSettingsDrawer()

  const workspaceMatch = path.match(/^\/dashboard\/([^/]+)/)
  const workspaceId    = workspaceMatch?.[1] ?? 'default'

  const handleSettings = () => {
    openDrawer(workspaceId, active.section)
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-surface-900 border-b border-surface-700 sticky top-0 z-40">
      {/* Logo + workspace switcher */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">Zima Ads</span>
        </Link>
        {/* Workspace switcher — only on dashboard routes */}
        {workspaceMatch && <WorkspaceSwitcher currentId={workspaceId} />}
      </div>

      {/* Feature nav */}
      <nav className="flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1">
        {NAV.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5 rounded-lg ${
              match(path) ? 'bg-surface-700 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Right side actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleSettings}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-700">
          <Settings className="w-3.5 h-3.5" />
          Config
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10">
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </header>
  )
}
