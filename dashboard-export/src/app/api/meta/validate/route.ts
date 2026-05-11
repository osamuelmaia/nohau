import { NextRequest, NextResponse } from 'next/server'
import { validateToken }             from '@/services/meta/auth'
import { prisma }                    from '@/services/db/client'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  const start = Date.now()
  try {
    const result = await validateToken(token)
    await prisma.apiLog.create({ data: {
      operation: 'validate_token', method: 'GET',
      endpoint: 'https://graph.facebook.com/me',
      requestBody: '', responseBody: JSON.stringify(result),
      statusCode: 200, success: true, errorMessage: '',
      durationMs: Date.now() - start,
    }})
    return NextResponse.json({ success: true, data: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await prisma.apiLog.create({ data: {
      operation: 'validate_token', method: 'GET',
      endpoint: 'https://graph.facebook.com/me',
      requestBody: '', responseBody: '',
      statusCode: 400, success: false, errorMessage: msg,
      durationMs: Date.now() - start,
    }})
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
