import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-token'

const PUBLIC_PATHS = ['/login', '/api/auth', '/_next', '/favicon', '/uploads']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('zima_session')?.value
  if (!token || !(await verifyToken(token))) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
