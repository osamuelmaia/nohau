export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'
import { generateCopy, CopyType } from '@/services/openai/copy-agent'
import { z } from 'zod'

const schema = z.object({
  personaId: z.string().min(1),
  copyType:  z.enum(['vsl', 'email', 'ad', 'salespage', 'capturepage']),
  subtype:   z.string().default(''),
  brief:     z.string().default(''),
})

export async function POST(req: NextRequest) {
  const settings = await prisma.workspace.findUnique({ where: { id: 'default' } })
  if (!settings?.openaiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API Key não configurada. Vá em Configurações.' },
      { status: 400 },
    )
  }

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { personaId, copyType, subtype, brief } = parsed.data

  const persona = await prisma.copyPersona.findUnique({ where: { id: personaId } })
  if (!persona) {
    return NextResponse.json({ success: false, error: 'Persona não encontrada.' }, { status: 404 })
  }

  try {
    const result = await generateCopy(settings.openaiKey, persona, copyType as CopyType, subtype, brief)

    await prisma.copyJob.create({
      data: {
        personaId,
        copyType,
        subtype,
        brief:  brief.slice(0, 2000),
        result: JSON.stringify(result),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro na geração'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
