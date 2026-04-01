import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'zima_session'
const PUBLIC = ['/login', '/api/auth', '/_next', '/favicon', '/uploads']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const session = req.cookies.get(SESSION_COOKIE)
  if (!session?.value) return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
