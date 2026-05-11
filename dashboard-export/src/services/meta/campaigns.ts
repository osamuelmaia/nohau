import { MetaApiClient } from './client'
import { MetaCreateCampaignPayload, MetaCreateCampaignResponse, MetaCreateAdSetPayload, MetaCreateAdSetResponse, MetaAdCreativePayload, MetaCreativeResponse, MetaCreateAdPayload, MetaCreateAdResponse } from '@/types/meta'

export async function createMetaCampaign(client: MetaApiClient, adAccountId: string, payload: MetaCreateCampaignPayload): Promise<MetaCreateCampaignResponse> {
  const accountId=adAccountId.startsWith('act_')?adAccountId:`act_${adAccountId}`
  return client.post<MetaCreateCampaignResponse>(`${accountId}/campaigns`,payload as unknown as Record<string,unknown>)
}
export async function createMetaAdSet(client: MetaApiClient, adAccountId: string, payload: MetaCreateAdSetPayload): Promise<MetaCreateAdSetResponse> {
  const accountId=adAccountId.startsWith('act_')?adAccountId:`act_${adAccountId}`
  return client.post<MetaCreateAdSetResponse>(`${accountId}/adsets`,payload as unknown as Record<string,unknown>)
}
export async function createMetaCreative(client: MetaApiClient, adAccountId: string, payload: MetaAdCreativePayload): Promise<MetaCreativeResponse> {
  const accountId=adAccountId.startsWith('act_')?adAccountId:`act_${adAccountId}`
  return client.post<MetaCreativeResponse>(`${accountId}/adcreatives`,payload as unknown as Record<string,unknown>)
}
export async function createMetaAd(client: MetaApiClient, adAccountId: string, payload: MetaCreateAdPayload): Promise<MetaCreateAdResponse> {
  const accountId=adAccountId.startsWith('act_')?adAccountId:`act_${adAccountId}`
  return client.post<MetaCreateAdResponse>(`${accountId}/ads`,payload as unknown as Record<string,unknown>)
}
