import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nohau Ads Manager',
  description: 'Painel interno de criação e envio de campanhas para o Meta Ads',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  )
}
