import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider, ThemeScript } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono  = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','500','700'] })

export const metadata: Metadata = {
  title: 'Nohau Ads Manager',
  description: 'Dashboard de gestão de anúncios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
