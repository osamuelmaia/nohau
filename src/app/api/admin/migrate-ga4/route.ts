export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

// One-time migration endpoint — hit once after deploy to add GA4 columns.
// Safe to call multiple times (IF NOT EXISTS).
export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Workspace"
        ADD COLUMN IF NOT EXISTS "ga4PropertyId"    TEXT,
        ADD COLUMN IF NOT EXISTS "ga4ServiceAccount" TEXT
    `)
    return NextResponse.json({ success: true, message: 'Colunas GA4 adicionadas (ou já existiam).' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
