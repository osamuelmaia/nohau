export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getMetaClientFromSettings } from '@/services/meta/client'

export interface CreativeDetail {
  adId:         string
  title?:       string
  body?:        string
  imageUrl?:    string
  videoUrl?:    string
  thumbUrl?:    string
  callToAction?: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const adId       = searchParams.get('adId')
  const workspaceId = searchParams.get('workspaceId') ?? 'default'

  if (!adId) {
    return NextResponse.json({ success: false, error: 'adId é obrigatório' }, { status: 400 })
  }

  try {
    const client = await getMetaClientFromSettings(workspaceId)

    // 1. Fetch ad creative fields
    type AdResp = {
      id: string
      creative?: {
        id:              string
        title?:          string
        body?:           string
        image_url?:      string
        thumbnail_url?:  string
        video_id?:       string
        call_to_action_type?: string
        // dynamic creative may have asset_feed_spec
        asset_feed_spec?: {
          titles?:       Array<{ text: string }>
          bodies?:       Array<{ text: string }>
          images?:       Array<{ url?: string; hash?: string }>
        }
        // object_story_spec for page post ads
        object_story_spec?: {
          link_data?: { message?: string; name?: string; picture?: string; image_url?: string }
          video_data?: {
            video_id?: string
            title?:    string
            message?:  string
            image_url?: string
          }
        }
      }
    }

    const adResp = await client.get<AdResp>(adId, {
      fields: 'id,creative{id,title,body,image_url,thumbnail_url,video_id,call_to_action_type,asset_feed_spec{titles,bodies,images},object_story_spec}',
    })

    const creative = adResp.creative
    if (!creative) {
      return NextResponse.json({ success: true, data: { adId } as CreativeDetail })
    }

    // Pull text from multiple possible locations
    const title =
      creative.title ??
      creative.asset_feed_spec?.titles?.[0]?.text ??
      creative.object_story_spec?.link_data?.name ??
      creative.object_story_spec?.video_data?.title

    const body =
      creative.body ??
      creative.asset_feed_spec?.bodies?.[0]?.text ??
      creative.object_story_spec?.link_data?.message ??
      creative.object_story_spec?.video_data?.message

    const imageUrl =
      creative.image_url ??
      creative.asset_feed_spec?.images?.[0]?.url ??
      creative.object_story_spec?.link_data?.image_url ??
      creative.object_story_spec?.link_data?.picture

    let videoUrl: string | undefined
    let thumbUrl = creative.thumbnail_url ?? creative.object_story_spec?.video_data?.image_url

    // 2. If video ad, fetch the playback URL
    const videoId = creative.video_id ?? creative.object_story_spec?.video_data?.video_id
    if (videoId) {
      try {
        type VideoResp = { id: string; source?: string; picture?: string }
        const videoResp = await client.get<VideoResp>(videoId, { fields: 'source,picture' })
        videoUrl = videoResp.source
        if (!thumbUrl) thumbUrl = videoResp.picture
      } catch {
        // non-fatal — video URL is best-effort
      }
    }

    const detail: CreativeDetail = {
      adId,
      title:         title        || undefined,
      body:          body         || undefined,
      imageUrl:      imageUrl     || undefined,
      videoUrl:      videoUrl     || undefined,
      thumbUrl:      thumbUrl     || undefined,
      callToAction:  creative.call_to_action_type || undefined,
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar criativo'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
