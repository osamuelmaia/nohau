export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const { openaiKey } = await req.json()
  if (!openaiKey?.trim()) return NextResponse.json({ success: false, error: 'Chave vazia' }, { status: 400 })

  try {
    const openai = new OpenAI({ apiKey: openaiKey })
    const models = await openai.models.list()
    const hasGpt4o = models.data.some(m => m.id.includes('gpt-4o'))
    return NextResponse.json({ success: true, model: hasGpt4o ? 'gpt-4o disponível' : 'conectado' })
  } catch {
    return NextResponse.json({ success: false, error: 'Chave inválida' }, { status: 401 })
  }
}
