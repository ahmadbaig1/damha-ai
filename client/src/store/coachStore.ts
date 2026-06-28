import { create } from 'zustand'
import { CoachSuggestion, fetchCoachSuggestion } from '../api/coach'

interface CoachStore {
  suggestions: Record<number, CoachSuggestion>
  dismissed: Record<number, boolean>
  loading: Record<number, boolean>
  fetchSuggestion: (ticketId: number) => Promise<void>
  dismiss: (ticketId: number) => void
}

export const useCoachStore = create<CoachStore>((set) => ({
  suggestions: {},
  dismissed: {},
  loading: {},

  fetchSuggestion: async (ticketId) => {
    set((s) => ({ loading: { ...s.loading, [ticketId]: true } }))
    try {
      const result = await fetchCoachSuggestion(ticketId)
      set((s) => ({
        suggestions: { ...s.suggestions, [ticketId]: result },
        dismissed: { ...s.dismissed, [ticketId]: false },
      }))
    } finally {
      set((s) => ({ loading: { ...s.loading, [ticketId]: false } }))
    }
  },

  dismiss: (ticketId) => {
    set((s) => ({ dismissed: { ...s.dismissed, [ticketId]: true } }))
  },
}))
