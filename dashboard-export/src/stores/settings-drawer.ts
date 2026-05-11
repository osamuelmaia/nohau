import { create } from 'zustand'

type Section = 'meta' | 'workspace' | 'analytics'

interface SettingsDrawerState {
  open:        boolean
  workspaceId: string
  section:     Section
  openDrawer:  (workspaceId?: string, section?: Section) => void
  closeDrawer: () => void
  setSection:  (s: Section) => void
}

export const useSettingsDrawer = create<SettingsDrawerState>(set => ({
  open:        false,
  workspaceId: 'default',
  section:     'meta',
  openDrawer:  (workspaceId = 'default', section = 'meta') => set({ open: true, workspaceId, section }),
  closeDrawer: () => set({ open: false }),
  setSection:  s => set({ section: s }),
}))
