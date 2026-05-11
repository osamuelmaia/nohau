'use client'

import { useEffect } from 'react'

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var t=localStorage.getItem('nohau-theme')||'light';document.documentElement.classList.toggle('dark',t==='dark');})()`,
      }}
    />
  )
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('nohau-theme', isDark ? 'dark' : 'light')
}

export function useTheme() {
  const isDark = typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : false
  return { isDark, toggle: toggleTheme }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem('nohau-theme') || 'light'
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])
  return <>{children}</>
}
