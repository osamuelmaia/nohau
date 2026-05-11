export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma }         from '@/services/db/client'
import { getGA4Insights } from '@/services/ga4/insights'

export async function GET(req: NextRequest) {
  const p  = req.nextUrl.searchParams
  const ws = p.get('workspace') ?? 'default'
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: ws },
      select: { ga4PropertyId: true, ga4ServiceAccount: true },
    })
    if (!workspace?.ga4PropertyId || !workspace.ga4ServiceAccount) {
      return NextResponse.json({ success: false, error: 'GA4 não configurado' }, { status: 400 })
    }
    const data = await getGA4Insights({
      propertyId:     workspace.ga4PropertyId,
      serviceAccount: JSON.parse(workspace.ga4ServiceAccount),
      since:          p.get('since') ?? '',
      until:          p.get('until') ?? '',
    })
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
