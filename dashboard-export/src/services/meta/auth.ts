import { MetaApiClient } from './client'

export async function validateToken(token: string) {
  const client = new MetaApiClient(token)
  return client.get<{ id: string; name: string; email?: string }>('/me', { fields: 'id,name,email' })
}
