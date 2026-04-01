'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Settings, Youtube, Megaphone, ChartNoAxesCombined, Scissors, PenLine } from 'lucide-react'

const NAV = [
  { href: '/',        label: 'Campanhas',   icon: Megaphone,           match: (p: string) => p === '/' || p.startsWith('/settings') && !p.includes('youtube'), settings: '/settings' },
  { href: '/youtube', label: 'YouTube Ops', icon: Youtube,             match: (p: string) => p.startsWith('/youtube'),                                          settings: '/settings/youtube' },
  { href: '/audit',   label: 'Webanalisis', icon: ChartNoAxesCombined, match: (p: string) => p.startsWith('/audit'),                                            settings: '/settings' },
  { href: '/cliper',  label: 'Cliper',      icon: Scissors,            match: (p: string) => p.startsWith('/cliper'),                                           settings: '/settings' },
  { href: '/copy',    label: 'Copy Agent',  icon: PenLine,             match: (p: string) => p.startsWith('/copy'),                                             settings: '/settings' },
]

export default function NavHeader() {
  const path    = usePathname()
  const active  = NAV.find(n => n.match(path)) ?? NAV[0]

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-surface-900 border-b border-surface-700 sticky top-0 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm text-white tracking-tight">Zima Ads</span>
      </Link>

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

      {/* Configurações — aponta para a settings da feature ativa */}
      <Link href={active.settings}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-750 flex-shrink-0">
        <Settings className="w-3.5 h-3.5" />
        Configurações
      </Link>
    </header>
  )
}
