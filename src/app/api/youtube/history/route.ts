import { NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

export async function GET() {
  const jobs = await prisma.youtubeJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, profile: true, result: true, createdAt: true,
    },
  })
  return NextResponse.json({ success: true, data: jobs })
}
