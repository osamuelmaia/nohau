export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

// GET /api/copy/personas/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const persona = await prisma.copyPersona.findUnique({ where: { id: params.id } })
  if (!persona) return NextResponse.json({ success: false, error: 'Persona não encontrada.' }, { status: 404 })
  return NextResponse.json({ success: true, data: persona })
}

// PUT /api/copy/personas/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  const persona = await prisma.copyPersona.update({
    where: { id: params.id },
    data: {
      name:             body.name?.trim(),
      expertName:       body.expertName?.trim(),
      niche:            body.niche?.trim(),
      targetAvatar:     body.targetAvatar?.trim(),
      corePromise:      body.corePromise?.trim(),
      toneOfVoice:      body.toneOfVoice?.trim(),
      writingStyle:     body.writingStyle?.trim(),
      painPoints:       body.painPoints?.trim(),
      objections:       body.objections?.trim(),
      uniqueMechanism:  body.uniqueMechanism?.trim(),
      socialProof:      body.socialProof?.trim(),
      vocabulary:       body.vocabulary?.trim(),
      avoidVocabulary:  body.avoidVocabulary?.trim()  ?? '',
      copyReferences:   body.copyReferences?.trim()   ?? '',
      products:         body.products?.trim()         ?? '',
      pricePositioning: body.pricePositioning?.trim() ?? '',
      ctaStyle:         body.ctaStyle?.trim()         ?? '',
      brandValues:      body.brandValues?.trim()      ?? '',
      competitors:      body.competitors?.trim()      ?? '',
    },
  })

  return NextResponse.json({ success: true, data: persona })
}

// DELETE /api/copy/personas/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.copyPersona.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
