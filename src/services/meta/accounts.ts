import { MetaApiClient } from './client'
import { MetaAdAccount, MetaAdAccountsResponse } from '@/types/meta'

export async function listAdAccounts(client: MetaApiClient): Promise<MetaAdAccount[]> {
  const response = await client.get<MetaAdAccountsResponse>('me/adaccounts', {
    fields: 'id,name,account_id,account_status,currency,timezone_name,business',
    limit: '100',
  } as Record<string, string>)
  return response.data
}

export async function getAdAccount(client: MetaApiClient, adAccountId: string): Promise<MetaAdAccount> {
  return client.get<MetaAdAccount>(adAccountId, {
    fields: 'id,name,account_id,account_status,currency,timezone_name',
  } as Record<string, string>)
}
