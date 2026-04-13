'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Lock, Eye, EyeOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.success) {
        router.push('/')
      } else {
        toast.error(json.error ?? 'Senha incorreta')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <Toaster position="bottom-center" toastOptions={{ style: { background: '#1c1c28', color: '#e2e8f0', border: '1px solid #2a2a3d' } }} />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center mb-4 shadow-lg shadow-brand-900/40">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nohau Ads Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Painel interno de campanhas Meta Ads</p>
        </div>

        {/* Form */}
        <div className="bg-surface-850 border border-surface-700 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Entrar</h2>
          <p className="text-sm text-gray-500 mb-6">Use a senha configurada no .env.local</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1.5">
                Senha de acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-surface-800 border border-surface-600 text-gray-100 placeholder-gray-600 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Acessar painel
            </Button>
          </form>

        </div>
      </div>
    </div>
  )
}
