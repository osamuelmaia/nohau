import { NextRequest, NextResponse } from 'next/server'
import { quickPublish, PublishPayload } from '@/services/meta/quick-publish'

export async function POST(req: NextRequest) {
  let payload: PublishPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido' }, { status: 400 })
  }

  if (!payload.campaignName?.trim())
    return NextResponse.json({ success: false, error: 'Nome da campanha é obrigatório' }, { status: 400 })
  if (!payload.pageId?.trim())
    return NextResponse.json({ success: false, error: 'Page ID é obrigatório' }, { status: 400 })
  if (!payload.destinationUrl?.trim())
    return NextResponse.json({ success: false, error: 'URL de destino é obrigatória' }, { status: 400 })
  if (!payload.files?.length)
    return NextResponse.json({ success: false, error: 'Nenhum criativo enviado' }, { status: 400 })

  try {
    const result = await quickPublish(payload)
    return NextResponse.json({ success: result.success, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao publicar'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
