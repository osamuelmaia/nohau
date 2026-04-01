import { Toaster } from 'react-hot-toast'
import NavHeader from '@/components/NavHeader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-950 text-gray-100 flex flex-col">
      <NavHeader />

      <main className="flex-1">{children}</main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1c1c28', color: '#e2e8f0', border: '1px solid #2a2a3d', borderRadius: '10px', fontSize: '13px' },
          success: { iconTheme: { primary: '#4ade80', secondary: '#1c1c28' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#1c1c28' } },
        }}
      />
    </div>
  )
}
