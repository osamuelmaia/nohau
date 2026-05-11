import { NavHeader }      from '@/components/NavHeader'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { Toaster }        from 'react-hot-toast'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <NavHeader />
      <SettingsDrawer />
      <main className="flex-1">{children}</main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--s-800)',
            color: 'var(--text-primary)',
            border: '1px solid var(--s-700)',
          },
        }}
      />
    </div>
  )
}
