export interface ApiResponse<T = unknown> {
  success: boolean
  data?:   T
  error?:  string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page:       number
    limit:      number
    total:      number
    totalPages: number
  }
}

export interface ValidationError {
  field:   string
  message: string
}

export interface ApiErrorResponse {
  success: false
  error:   string
  details?: ValidationError[]
}

export interface UploadResponse {
  success:  boolean
  url?:     string
  filename?: string
  size?:    number
  error?:   string
}

export interface SubmitCampaignResponse {
  success:    boolean
  campaignId?: string
  adSetId?:   string
  adId?:      string
  error?:     string
}
