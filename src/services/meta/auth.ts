import { MetaApiClient } from './client'
import { MetaTokenValidation } from '@/types/meta'

// Validate token and return user info
export async function validateToken(token: string): Promise<MetaTokenValidation> {
  const client = new MetaApiClient(token)
  return client.get<MetaTokenValidation>('me', { fields: 'id,name,email' })
}
