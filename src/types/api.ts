// ============================================================
// Internal API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface ValidationError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: ValidationError[]
}

export interface UploadResponse {
  id: string
  url: string
  fileName: string
  fileSize: number
  mimeType: string
  type: 'IMAGE' | 'VIDEO'
}

export interface SubmitCampaignResponse {
  campaignId: string
  metaCampaignId: string
  adSetsSubmitted: number
  adsSubmitted: number
  errors: string[]
}
