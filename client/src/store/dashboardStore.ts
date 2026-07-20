import { create } from 'zustand'
import { DashboardOverview, fetchDashboardOverview } from '../api/dashboard'

interface DashboardState {
  overview: DashboardOverview | null
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set) => ({
  overview: null,
  loading: false,
  error: null,

  async fetch() {
    set({ loading: true, error: null })
    try {
      const overview = await fetchDashboardOverview()
      set({ overview, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard'
      set({ error: message, loading: false })
    }
  },
}))
