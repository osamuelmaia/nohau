// ============================================================
// Meta Graph API Types
// ============================================================

export const META_API_VERSION = 'v21.0'
export const META_BASE_URL = 'https://graph.facebook.com'

// ---- Token / Account ----
export interface MetaTokenValidation {
  id: string
  name: string
  email?: string
}

export interface MetaAdAccount {
  id: string
  name: string
  account_id: string
  account_status: number
  currency: string
  timezone_name: string
  business?: {
    id: string
    name: string
  }
}

export interface MetaAdAccountsResponse {
  data: MetaAdAccount[]
  paging?: {
    cursors: { before: string; after: string }
    next?: string
  }
}

// ---- Campaign ----
export type MetaCampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_APP_PROMOTION'
  | 'OUTCOME_SALES'

export type MetaStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'

export interface MetaCreateCampaignPayload {
  name: string
  objective: MetaCampaignObjective
  status: MetaStatus
  special_ad_categories: string[]
  daily_budget?: number
  lifetime_budget?: number
  spend_cap?: number
  start_time?: string
  stop_time?: string
}

export interface MetaCreateCampaignResponse {
  id: string
}

// ---- Ad Set ----
export type MetaBidStrategy =
  | 'LOWEST_COST_WITHOUT_CAP'
  | 'LOWEST_COST_WITH_BID_CAP'
  | 'COST_CAP'
  | 'MINIMUM_ROAS'

export type MetaOptimizationGoal =
  | 'LINK_CLICKS'
  | 'REACH'
  | 'IMPRESSIONS'
  | 'CONVERSIONS'
  | 'LEAD_GENERATION'
  | 'APP_INSTALLS'
  | 'VIDEO_VIEWS'
  | 'LANDING_PAGE_VIEWS'
  | 'OFFSITE_CONVERSIONS'
  | 'POST_ENGAGEMENT'
  | 'VALUE'

export type MetaBillingEvent =
  | 'IMPRESSIONS'
  | 'LINK_CLICKS'
  | 'APP_INSTALLS'
  | 'VIDEO_VIEWS'
  | 'NONE'

export interface MetaTargeting {
  geo_locations?: {
    countries?: string[]
    cities?: Array<{ key: string; name: string }>
  }
  age_min?: number
  age_max?: number
  genders?: number[]
  publisher_platforms?: string[]
  facebook_positions?: string[]
  instagram_positions?: string[]
  device_platforms?: string[]
  flexible_spec?: Array<Record<string, unknown>>
  exclusions?: Record<string, unknown>
}

export interface MetaCreateAdSetPayload {
  name: string
  campaign_id: string
  status: MetaStatus
  optimization_goal: MetaOptimizationGoal
  billing_event: MetaBillingEvent
  bid_strategy?: MetaBidStrategy
  bid_amount?: number
  daily_budget?: number
  lifetime_budget?: number
  start_time?: string
  end_time?: string
  targeting: MetaTargeting
  destination_type?: string
  promoted_object?: {
    pixel_id?: string
    custom_event_type?: string
    page_id?: string
    application_id?: string
    object_store_url?: string
  }
}

export interface MetaCreateAdSetResponse {
  id: string
}

// ---- Creative & Ad ----
export type MetaCallToAction =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'DOWNLOAD'
  | 'CONTACT_US'
  | 'APPLY_NOW'
  | 'GET_QUOTE'
  | 'SUBSCRIBE'
  | 'BOOK_TRAVEL'
  | 'WATCH_MORE'
  | 'ORDER_NOW'
  | 'GET_OFFER'
  | 'INSTALL_APP'
  | 'USE_APP'
  | 'OPEN_LINK'
  | 'NO_BUTTON'

export interface MetaAdImage {
  hash: string
  url?: string
}

export interface MetaAdCreativePayload {
  name: string
  object_story_spec: {
    page_id: string
    instagram_actor_id?: string
    link_data?: {
      image_hash?: string
      link: string
      message: string
      name?: string
      description?: string
      call_to_action?: {
        type: MetaCallToAction
        value?: { link: string }
      }
    }
    video_data?: {
      video_id: string
      image_url?: string
      title?: string
      link_description?: string
      message?: string
      call_to_action?: {
        type: MetaCallToAction
        value?: { link: string }
      }
    }
  }
}

export interface MetaCreateAdPayload {
  name: string
  adset_id: string
  creative: { creative_id: string }
  status: MetaStatus
}

export interface MetaCreateAdResponse {
  id: string
}

export interface MetaCreativeResponse {
  id: string
}

// ---- Media Upload ----
export interface MetaImageUploadResponse {
  images: {
    bytes: {
      hash: string
      url: string
      width: number
      height: number
    }
  }
}

export interface MetaVideoUploadResponse {
  video_id: string
}

// ---- Error ----
export interface MetaApiError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    error_user_title?: string   // human-readable title from Meta
    error_user_msg?: string     // human-readable description with the exact bad param
    fbtrace_id: string
  }
}
