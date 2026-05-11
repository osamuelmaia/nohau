import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Auto-migrate GA4 columns (safe – no-op if already exist)
prisma.$connect().then(async () => {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "ga4PropertyId" TEXT`
  ).catch(() => {})
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "ga4ServiceAccount" TEXT`
  ).catch(() => {})
}).catch(() => {})
