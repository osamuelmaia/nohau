export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })

  try {
    const apiKey = process.env.PAGESPEED_API_KEY ?? ''
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}&strategy=mobile` +
      `&category=performance&category=seo&category=accessibility&category=best-practices` +
      (apiKey ? `&key=${apiKey}` : '')

    const res = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`PageSpeed respondeu com HTTP ${res.status}`)

    const json = await res.json()
    const cats   = json.lighthouseResult?.categories   ?? {}
    const audits = json.lighthouseResult?.audits       ?? {}

    return NextResponse.json({
      success: true,
      data: {
        performance:   Math.round((cats.performance?.score          ?? 0) * 100),
        seo:           Math.round((cats.seo?.score                  ?? 0) * 100),
        accessibility: Math.round((cats.accessibility?.score        ?? 0) * 100),
        bestPractices: Math.round((cats['best-practices']?.score    ?? 0) * 100),
        lcp: audits['largest-contentful-paint']?.displayValue  ?? null,
        tbt: audits['total-blocking-time']?.displayValue       ?? null,
        cls: audits['cumulative-layout-shift']?.displayValue   ?? null,
        fcp: audits['first-contentful-paint']?.displayValue    ?? null,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro ao consultar PageSpeed' },
      { status: 500 },
    )
  }
}
