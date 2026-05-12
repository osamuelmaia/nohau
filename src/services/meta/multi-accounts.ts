// ── Multi-Account Utility ──────────────────────────────────────────────────────
// Returns all Meta ad accounts linked to a workspace.
// Falls back to the legacy single-account Workspace fields for old workspaces.

import { prisma } from '@/services/db/client'

export interface WorkspaceAccount {
  id:            string
  adAccountId:   string  // always prefixed with act_
  adAccountName: string
  metaToken:     string
  pageId:        string | null
  label:         string | null
}

export async function getWorkspaceMetaAccounts(workspaceId: string): Promise<WorkspaceAccount[]> {
  const accounts = await prisma.workspaceMetaAccount.findMany({
    where:   { workspaceId },
    orderBy: { createdAt: 'asc' },
  })

  if (accounts.length > 0) {
    return accounts.map(a => ({
      id:            a.id,
      adAccountId:   a.adAccountId.startsWith('act_') ? a.adAccountId : `act_${a.adAccountId}`,
      adAccountName: a.adAccountName ?? a.adAccountId,
      metaToken:     a.metaToken,
      pageId:        a.pageId,
      label:         a.label,
    }))
  }

  // Fallback: legacy single-account Workspace fields
  const ws = await prisma.workspace.findUnique({
    where:  { id: workspaceId },
    select: { metaToken: true, adAccountId: true, adAccountName: true, pageId: true },
  })

  if (!ws?.metaToken || !ws?.adAccountId) return []

  return [{
    id:            'legacy',
    adAccountId:   ws.adAccountId.startsWith('act_') ? ws.adAccountId : `act_${ws.adAccountId}`,
    adAccountName: ws.adAccountName ?? ws.adAccountId,
    metaToken:     ws.metaToken,
    pageId:        ws.pageId,
    label:         null,
  }]
}
