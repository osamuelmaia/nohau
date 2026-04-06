import { NextRequest, NextResponse } from 'next/server'
import { makeToken } from '@/lib/auth-token'
import crypto from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET ?? 'change-me-in-production'
const PASS   = process.env.APP_PASSWORD    ?? 'admin123'
const COOKIE = 'zima_session'

// ── Rate limiting (in-memory, per IP) ────────────────────────────────────────
const attempts = new Map<string, { count: number; until: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 15 * 60 * 1000 // 15 minutes

// ── POST — login ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip  = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const now = Date.now()
  const rec = attempts.get(ip)

  // Check lockout
  if (rec && rec.until > now) {
    const mins = Math.ceil((rec.until - now) / 60_000)
    return NextResponse.json(
      { success: false, error: `Muitas tentativas incorretas. Tente novamente em ${mins} min.` },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const password: string = body?.password ?? ''

  // Timing-safe comparison (prevents timing attacks)
  const a = Buffer.from(password)
  const b = Buffer.from(PASS)
  const match = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!match) {
    const count = (rec?.count ?? 0) + 1
    attempts.set(ip, {
      count,
      until: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
    })
    return NextResponse.json({ success: false, error: 'Senha incorreta' }, { status: 401 })
  }

  // Successful login — clear failed attempts
  attempts.delete(ip)

  // Generate signed token
  const token = await makeToken(SECRET)

  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    // No maxAge → session cookie, expires when browser closes
  })
  return res
}

// ── DELETE — logout ───────────────────────────────────────────────────────────
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   0,
  })
  return res
}
