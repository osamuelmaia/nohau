import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Auto-migrate: add new columns that may not exist yet in the DB.
// Safe to run on every cold start (IF NOT EXISTS is idempotent).
;(async () => {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Workspace"
        ADD COLUMN IF NOT EXISTS "ga4PropertyId"     TEXT,
        ADD COLUMN IF NOT EXISTS "ga4ServiceAccount" TEXT
    `)
  } catch { /* ignore — columns already exist or unsupported */ }
})()
