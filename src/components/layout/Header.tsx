'use client'

import { useState, useEffect } from 'react'
import { Bell, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setConnectionStatus(data.data?.hasToken ? 'connected' : 'disconnected')
      })
      .catch(() => setConnectionStatus('disconnected'))
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-surface-900 border-b border-surface-700 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* API Connection Status */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
            connectionStatus === 'connected'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : connectionStatus === 'disconnected'
              ? 'text-red-400 bg-red-500/10 border-red-500/20'
              : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
          )}
        >
          {connectionStatus === 'connected' ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {connectionStatus === 'connected' ? 'API conectada' : 'Sem token'}
        </div>

        {actions}
      </div>
    </header>
  )
}

export default Header
