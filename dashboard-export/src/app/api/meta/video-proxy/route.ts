import { NextRequest, NextResponse } from 'next/server'

const ALLOWED = ['fbcdn.net', 'facebook.com']

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let parsed: URL
  try { parsed = new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const allowed = ALLOWED.some(d => parsed.hostname.endsWith(d))
  if (!allowed) return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })

  const range = req.headers.get('range')
  const headers: Record<string, string> = {}
  if (range) headers['Range'] = range

  const upstream = await fetch(url, { headers })
  return new NextResponse(upstream.body, {
    status:  upstream.status,
    headers: {
      'Content-Type':  upstream.headers.get('Content-Type')  ?? 'video/mp4',
      'Content-Length': upstream.headers.get('Content-Length') ?? '',
      'Accept-Ranges': 'bytes',
      ...(upstream.headers.get('Content-Range') ? { 'Content-Range': upstream.headers.get('Content-Range')! } : {}),
    },
  })
}
