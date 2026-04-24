import type { Metadata } from 'next'
import './globals.css'
import { ThemeScript } from '@/components/ThemeProvider'
import ThemeProvider   from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Nohau Ads Manager',
  description: 'Painel interno de criação e envio de campanhas para o Meta Ads',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
