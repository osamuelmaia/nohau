import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'
import { refineAdItem } from '@/services/openai/copy-agent'
import { z } from 'zod'

const schema = z.object({
  personaId:      z.string().min(1),
  subtype:        z.string().default(''),
  itemType:       z.enum(['headline', 'texto', 'titulo', 'descricao', 'cta']),
  originalText:   z.string().min(1),
  originalAngulo: z.string().default(''),
  comment:        z.string().min(1, 'Comentário não pode estar vazio'),
})

export async function POST(req: NextRequest) {
  const settings = await prisma.workspace.findUnique({ where: { id: 'default' } })
  if (!settings?.openaiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API Key não configurada.' },
      { status: 400 },
    )
  }

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    )
  }

  const { personaId, subtype, itemType, originalText, originalAngulo, comment } = parsed.data

  const persona = await prisma.copyPersona.findUnique({ where: { id: personaId } })
  if (!persona) {
    return NextResponse.json({ success: false, error: 'Persona não encontrada.' }, { status: 404 })
  }

  try {
    const result = await refineAdItem(
      settings.openaiKey,
      persona,
      subtype,
      itemType,
      originalText,
      originalAngulo,
      comment,
    )
    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro no refinamento'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
