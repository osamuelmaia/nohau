export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/db/client'

// GET /api/copy/personas — list all personas
export async function GET() {
  const personas = await prisma.copyPersona.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, expertName: true, niche: true,
      toneOfVoice: true, createdAt: true,
      _count: { select: { jobs: true } },
    },
  })
  return NextResponse.json({ success: true, data: personas })
}

// POST /api/copy/personas — create new persona
export async function POST(req: NextRequest) {
  const body = await req.json()

  const required = ['name', 'expertName', 'niche', 'targetAvatar', 'corePromise',
    'toneOfVoice', 'writingStyle', 'painPoints', 'objections', 'uniqueMechanism',
    'socialProof', 'vocabulary']

  for (const field of required) {
    if (!body[field]?.trim()) {
      return NextResponse.json({ success: false, error: `Campo obrigatório: ${field}` }, { status: 400 })
    }
  }

  const persona = await prisma.copyPersona.create({
    data: {
      name:             body.name.trim(),
      expertName:       body.expertName.trim(),
      niche:            body.niche.trim(),
      targetAvatar:     body.targetAvatar.trim(),
      corePromise:      body.corePromise.trim(),
      toneOfVoice:      body.toneOfVoice.trim(),
      writingStyle:     body.writingStyle.trim(),
      painPoints:       body.painPoints.trim(),
      objections:       body.objections.trim(),
      uniqueMechanism:  body.uniqueMechanism.trim(),
      socialProof:      body.socialProof.trim(),
      vocabulary:       body.vocabulary.trim(),
      avoidVocabulary:  body.avoidVocabulary?.trim()  ?? '',
      copyReferences:   body.copyReferences?.trim()   ?? '',
      products:         body.products?.trim()         ?? '',
      pricePositioning: body.pricePositioning?.trim() ?? '',
      ctaStyle:         body.ctaStyle?.trim()         ?? '',
      brandValues:      body.brandValues?.trim()      ?? '',
      competitors:      body.competitors?.trim()      ?? '',
    },
  })

  return NextResponse.json({ success: true, data: persona }, { status: 201 })
}
