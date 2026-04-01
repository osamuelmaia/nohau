import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const APP_PASSWORD = process.env.APP_PASSWORD ?? 'admin123'
const SESSION_COOKIE = 'zima_session'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { password } = body

  if (password !== APP_PASSWORD) {
    return NextResponse.json({ success: false, error: 'Senha incorreta' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  return NextResponse.json({ success: true })
}
