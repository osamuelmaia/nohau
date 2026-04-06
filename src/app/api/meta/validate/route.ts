export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/services/meta/auth'
import { prisma } from '@/services/db/client'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ success: false, error: 'Token é obrigatório' }, { status: 400 })

  const start = Date.now()
  try {
    const user = await validateToken(token)
    await prisma.apiLog.create({
      data: { operation: 'VALIDATE_TOKEN', method: 'GET', endpoint: '/me', responseBody: JSON.stringify(user), statusCode: 200, success: true, durationMs: Date.now() - start },
    }).catch(() => {})
    return NextResponse.json({ success: true, data: user })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token inválido'
    await prisma.apiLog.create({
      data: { operation: 'VALIDATE_TOKEN', method: 'GET', endpoint: '/me', statusCode: 401, success: false, errorMessage: msg },
    }).catch(() => {})
    return NextResponse.json({ success: false, error: msg }, { status: 401 })
  }
}
