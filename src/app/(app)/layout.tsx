import { Toaster } from 'react-hot-toast'
import NavHeader from '@/components/NavHeader'
import SettingsDrawer from '@/components/SettingsDrawer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--s-950)', color: 'var(--t-1)' }}>
      <NavHeader />
      <main className="flex-1">{children}</main>
      <SettingsDrawer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background:   'var(--s-800)',
            color:        'var(--t-1)',
            border:       '1px solid var(--t-border)',
            borderRadius: '10px',
            fontSize:     '13px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: 'var(--s-800)' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: 'var(--s-800)' } },
        }}
      />
    </div>
  )
}
