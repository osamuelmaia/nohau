export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMetaClientFromSettings } from '@/services/meta/client'

export interface CreativeDetail {
  adId:      string
  isVideo:   boolean
  title?:    string
  body?:     string
  imageUrl?: string
  videoUrl?: string
  thumbUrl?: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const adId        = searchParams.get('adId')
  const workspaceId = searchParams.get('workspaceId') ?? 'default'

  if (!adId) {
    return NextResponse.json({ success: false, error: 'adId é obrigatório' }, { status: 400 })
  }

  try {
    const client = await getMetaClientFromSettings(workspaceId)

    // ── 1. Fetch ad creative ──────────────────────────────────────────────────
    // Explicitly request video_data inside object_story_spec, and videos inside
    // asset_feed_spec — otherwise Meta omits those sub-fields entirely.
    type AdResp = {
      id: string
      creative?: {
        id:             string
        title?:         string
        body?:          string
        image_url?:     string
        thumbnail_url?: string
        video_id?:      string
        call_to_action_type?: string
        asset_feed_spec?: {
          titles?:  Array<{ text: string }>
          bodies?:  Array<{ text: string }>
          images?:  Array<{ url?: string }>
          videos?:  Array<{ video_id?: string; thumbnail_url?: string }>
        }
        object_story_spec?: {
          link_data?: {
            message?:   string
            name?:      string
            picture?:   string
            image_url?: string
          }
          video_data?: {
            video_id?:      string
            title?:         string
            message?:       string
            image_url?:     string
            thumbnail_url?: string
          }
        }
      }
    }

    const adResp = await client.get<AdResp>(adId, {
      fields: [
        'id',
        'creative{',
          'id,title,body,image_url,thumbnail_url,video_id,call_to_action_type,',
          'asset_feed_spec{titles,bodies,images,videos{video_id,thumbnail_url}},',
          'object_story_spec{',
            'link_data{message,name,picture,image_url},',
            'video_data{video_id,title,message,image_url,thumbnail_url}',
          '}',
        '}',
      ].join(''),
    })

    const c = adResp.creative
    if (!c) {
      return NextResponse.json({ success: true, data: { adId, isVideo: false } as CreativeDetail })
    }

    // ── 2. Collect text fields ────────────────────────────────────────────────
    const title =
      c.title ??
      c.asset_feed_spec?.titles?.[0]?.text ??
      c.object_story_spec?.link_data?.name ??
      c.object_story_spec?.video_data?.title

    const body =
      c.body ??
      c.asset_feed_spec?.bodies?.[0]?.text ??
      c.object_story_spec?.link_data?.message ??
      c.object_story_spec?.video_data?.message

    const imageUrl =
      c.image_url ??
      c.asset_feed_spec?.images?.[0]?.url ??
      c.object_story_spec?.link_data?.image_url ??
      c.object_story_spec?.link_data?.picture

    let thumbUrl =
      c.thumbnail_url ??
      c.object_story_spec?.video_data?.thumbnail_url ??
      c.object_story_spec?.video_data?.image_url ??
      c.asset_feed_spec?.videos?.[0]?.thumbnail_url

    // ── 3. Resolve video_id from every possible location ─────────────────────
    const videoId =
      c.video_id ??
      c.object_story_spec?.video_data?.video_id ??
      c.asset_feed_spec?.videos?.[0]?.video_id ??
      null

    // ── 4. Fetch video source URL (lowest available quality) ─────────────────
    let videoUrl: string | undefined

    if (videoId) {
      try {
        type VideoResp = {
          id: string
          source?: string
          picture?: string
          format?: Array<{ source?: string; picture?: string; width: number; height: number }>
        }
        const vr = await client.get<VideoResp>(String(videoId), {
          fields: 'source,picture,format',
        })

        // Prefer the lowest-quality format (smallest area) to reduce bandwidth
        const formats = (vr.format ?? []).filter(f => f.source)
        if (formats.length > 0) {
          formats.sort((a, b) => a.width * a.height - b.width * b.height)
          videoUrl = formats[0].source
          if (!thumbUrl) thumbUrl = formats[0].picture ?? vr.picture
        } else {
          videoUrl = vr.source
          if (!thumbUrl) thumbUrl = vr.picture
        }
      } catch (err) {
        // Return what we have; let the frontend show the thumbnail instead
        console.error('[creative-detail] video fetch failed:', err)
      }
    }

    const detail: CreativeDetail = {
      adId,
      isVideo:  !!videoId,
      title:    title    || undefined,
      body:     body     || undefined,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      thumbUrl: thumbUrl || undefined,
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar criativo'
    console.error('[creative-detail]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
