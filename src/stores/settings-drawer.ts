import { create } from 'zustand'

export type DrawerSection = 'meta' | 'youtube' | 'workspace' | 'analytics'

interface State {
  open: boolean
  workspaceId: string
  section: DrawerSection
  openDrawer: (workspaceId: string, section?: DrawerSection) => void
  closeDrawer: () => void
  setSection: (s: DrawerSection) => void
}

export const useSettingsDrawer = create<State>((set) => ({
  open: false,
  workspaceId: 'default',
  section: 'meta',
  openDrawer: (workspaceId, section = 'meta') => set({ open: true, workspaceId, section }),
  closeDrawer: () => set({ open: false }),
  setSection: (section) => set({ section }),
}))
