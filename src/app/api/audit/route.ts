export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'
import { auditPage } from '@/services/openai/audit'
import { z } from 'zod'

const schema = z.object({
  url:       z.string().url('URL inválida'),
  pageType:  z.string().min(1),
  goal:      z.string().min(1, 'Informe o objetivo da página'),
  audience:  z.string().min(1, 'Informe o público-alvo'),
  offer:     z.string().min(1, 'Informe a oferta/produto'),
  notes:     z.string().optional(),
})

export async function POST(req: NextRequest) {
  const settings = await prisma.workspace.findUnique({ where: { id: 'default' }, select: { openaiKey: true } })
  if (!settings?.openaiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API Key não configurada. Vá em Configurações → YouTube Ops.' },
      { status: 400 },
    )
  }

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const result = await auditPage(settings.openaiKey, parsed.data)

    await prisma.auditJob.create({
      data: {
        url:      parsed.data.url,
        pageType: parsed.data.pageType,
        goal:     parsed.data.goal,
        audience: parsed.data.audience,
        offer:    parsed.data.offer,
        notes:    parsed.data.notes ?? '',
        result,
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro na auditoria'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
