import { MetaApiClient } from './client'
import { MetaAdAccount, MetaAdAccountsResponse } from '@/types/meta'

export async function listAdAccounts(client: MetaApiClient): Promise<MetaAdAccount[]> {
  const seen   = new Set<string>()
  const result: MetaAdAccount[] = []

  const absorb = (list: MetaAdAccount[]) => {
    for (const a of list) {
      if (!seen.has(a.id)) { seen.add(a.id); result.push(a) }
    }
  }

  const fetchPage = async (endpoint: string): Promise<MetaAdAccount[]> => {
    const res = await client.get<MetaAdAccountsResponse>(endpoint, {
      fields: 'id,name,account_id,account_status,currency,timezone_name',
      limit:  '100',
    } as Record<string, string>)
    return res.data ?? []
  }

  // 1. Direct personal accounts
  try { absorb(await fetchPage('me/adaccounts')) } catch { /* continue */ }

  if (result.length > 0) return result

  // 2. Business Manager — owned + client accounts
  try {
    const bizRes = await client.get<{ data: { id: string; name: string }[] }>(
      'me/businesses', { limit: '25' } as Record<string, string>,
    )
    for (const biz of (bizRes.data ?? [])) {
      for (const path of [
        `${biz.id}/owned_ad_accounts`,
        `${biz.id}/client_ad_accounts`,
        `${biz.id}/adaccounts`,
      ]) {
        try { absorb(await fetchPage(path)) } catch { /* continue */ }
      }
    }
  } catch { /* no businesses */ }

  return result
}

export async function getAdAccount(client: MetaApiClient, adAccountId: string): Promise<MetaAdAccount> {
  return client.get<MetaAdAccount>(adAccountId, {
    fields: 'id,name,account_id,account_status,currency,timezone_name',
  } as Record<string, string>)
}
