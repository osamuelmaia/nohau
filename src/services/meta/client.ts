// ============================================================
// Meta Graph API - HTTP Client
// ============================================================
// All Meta API calls go through this client.
// Never expose the access token to the frontend.

import { MetaApiError } from '@/types/meta'

const META_BASE_URL = process.env.META_BASE_URL ?? 'https://graph.facebook.com'
const META_API_VERSION = process.env.META_API_VERSION ?? 'v21.0'

export class MetaApiClient {
  private token: string
  private baseUrl: string

  constructor(token: string) {
    this.token = token
    this.baseUrl = `${META_BASE_URL}/${META_API_VERSION}`
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>) {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, '')}`)
    url.searchParams.set('access_token', this.token)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v))
      })
    }
    return url.toString()
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.buildUrl(path, params)
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    return this.handleResponse<T>(res)
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return this.handleResponse<T>(res)
  }

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    // For form data, access_token must be in URL
    const url = this.buildUrl(path)
    const res = await fetch(url, { method: 'POST', body: formData })
    return this.handleResponse<T>(res)
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const json = await res.json()

    if (!res.ok || (json as MetaApiError).error) {
      const err = (json as MetaApiError).error
      // Prefer error_user_msg (specific field details) over generic message
      let message = err?.error_user_msg ?? err?.message ?? `HTTP ${res.status}`

      // Provide actionable guidance for known error subcodes
      if (err?.error_subcode === 1885183) {
        message =
          'Seu app Meta está em modo de desenvolvimento. ' +
          'Para criar criativos e anúncios, acesse developers.facebook.com, ' +
          'abra seu app → App Review e coloque-o em modo Público (Live).'
      }

      throw new MetaError(message, err?.code, err?.type, err?.fbtrace_id)
    }

    return json as T
  }

  // Expose the raw base URL for building paths externally
  getBaseUrl() {
    return this.baseUrl
  }
}

// Custom error class for Meta API errors
export class MetaError extends Error {
  code?: number
  type?: string
  traceId?: string

  constructor(message: string, code?: number, type?: string, traceId?: string) {
    super(message)
    this.name = 'MetaError'
    this.code = code
    this.type = type
    this.traceId = traceId
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      traceId: this.traceId,
    }
  }
}

// Build a Meta client using the token stored in workspace settings
export async function getMetaClientFromSettings(workspaceId = 'default'): Promise<MetaApiClient> {
  const { prisma } = await import('@/services/db/client')
  const settings = await prisma.workspace.findUnique({ where: { id: workspaceId } })
  if (!settings?.metaToken) {
    throw new Error('Token Meta não configurado. Acesse Configurações para adicionar seu token.')
  }
  return new MetaApiClient(settings.metaToken)
}
