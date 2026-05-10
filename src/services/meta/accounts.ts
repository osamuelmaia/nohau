import { MetaApiClient } from './client'
import { MetaAdAccount, MetaAdAccountsResponse } from '@/types/meta'

export async function listAdAccounts(client: MetaApiClient): Promise<MetaAdAccount[]> {
  const response = await client.get<MetaAdAccountsResponse>('me/adaccounts', {
    fields: 'id,name,account_id,account_status,currency,timezone_name,business',
    limit: '100',
  } as Record<string, string>)

  const direct = response.data ?? []
  if (direct.length > 0) return direct

  // Fallback: accounts managed via Business Manager
  try {
    const bizRes = await client.get<{ data: { id: string }[] }>('me/businesses', {
      limit: '25',
    } as Record<string, string>)
    const seen    = new Set<string>()
    const merged: MetaAdAccount[] = []
    for (const biz of (bizRes.data ?? [])) {
      const res = await client.get<MetaAdAccountsResponse>(`${biz.id}/adaccounts`, {
        fields: 'id,name,account_id,account_status,currency,timezone_name',
        limit: '100',
      } as Record<string, string>)
      for (const acc of (res.data ?? [])) {
        if (!seen.has(acc.id)) { seen.add(acc.id); merged.push(acc) }
      }
    }
    return merged
  } catch {
    return []
  }
}

export async function getAdAccount(client: MetaApiClient, adAccountId: string): Promise<MetaAdAccount> {
  return client.get<MetaAdAccount>(adAccountId, {
    fields: 'id,name,account_id,account_status,currency,timezone_name',
  } as Record<string, string>)
}
