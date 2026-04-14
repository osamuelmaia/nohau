export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'

// Allowed CDN hostnames from Meta/Facebook
const ALLOWED = ['fbcdn.net', 'facebook.com', 'facebookdata.com']

function isAllowed(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr)
    return ALLOWED.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch { return false }
}

export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get('url')
  if (!encoded) return new Response('Missing url', { status: 400 })

  const videoUrl = decodeURIComponent(encoded)
  if (!isAllowed(videoUrl)) return new Response('Invalid URL', { status: 403 })

  try {
    // Forward Range header so browser seeking works
    const upstream = await fetch(videoUrl, {
      headers: {
        ...(req.headers.get('range') ? { range: req.headers.get('range')! } : {}),
      },
      cache: 'no-store',
    })

    const resHeaders: Record<string, string> = {
      'Content-Type':  upstream.headers.get('content-type')  ?? 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }
    const cl = upstream.headers.get('content-length')
    const cr = upstream.headers.get('content-range')
    if (cl) resHeaders['Content-Length'] = cl
    if (cr) resHeaders['Content-Range']  = cr

    return new Response(upstream.body, { status: upstream.status, headers: resHeaders })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upstream error'
    return new Response(msg, { status: 502 })
  }
}
