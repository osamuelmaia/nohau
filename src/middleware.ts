import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-token'

const SESSION_COOKIE = 'zima_session'
const SECRET         = process.env.NEXTAUTH_SECRET ?? 'change-me-in-production'
const PUBLIC         = ['/login', '/api/auth', '/_next', '/favicon', '/uploads']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token, SECRET))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
