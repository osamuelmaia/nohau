export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'
import { getGA4Insights } from '@/services/ga4/insights'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const startDate   = searchParams.get('startDate')
  const endDate     = searchParams.get('endDate')
  const workspaceId = searchParams.get('workspaceId') ?? 'default'

  if (!startDate || !endDate)
    return NextResponse.json({ success: false, error: 'startDate e endDate são obrigatórios' }, { status: 400 })

  try {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!ws?.ga4PropertyId)    throw new Error('Property ID do GA4 não configurado')
    if (!ws?.ga4ServiceAccount) throw new Error('Service Account do GA4 não configurado')

    const data = await getGA4Insights({
      propertyId:     ws.ga4PropertyId,
      serviceAccount: ws.ga4ServiceAccount,
      startDate,
      endDate,
    })
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar dados do GA4'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
