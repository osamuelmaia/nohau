import { NextRequest, NextResponse } from 'next/server'
import { makeToken } from '@/lib/auth-token'
import { timingSafeEqual } from 'crypto'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 15 * 60 * 1000
const attempts     = new Map<string, { count: number; until: number }>()

function getIP(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function POST(req: NextRequest) {
  const ip  = getIP(req)
  const now = Date.now()
  const rec = attempts.get(ip)

  if (rec && now < rec.until) {
    const secs = Math.ceil((rec.until - now) / 1000)
    return NextResponse.json({ error: `Muitas tentativas. Tente em ${secs}s.` }, { status: 429 })
  }

  const { password } = await req.json()

  const expected = process.env.APP_PASSWORD ?? ''
  let match = false
  try {
    const a = Buffer.from(password ?? '')
    const b = Buffer.from(expected)
    match = a.length === b.length && timingSafeEqual(a, b)
  } catch { match = false }

  if (!match) {
    const prev  = rec?.count ?? 0
    const count = prev + 1
    attempts.set(ip, { count, until: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0 })
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  attempts.delete(ip)
  const token = await makeToken()
  const res   = NextResponse.json({ success: true })
  res.cookies.set('zima_session', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('zima_session')
  return res
}
