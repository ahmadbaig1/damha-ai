import { create } from 'zustand'
import { InvestigationHistoryItem, fetchInvestigationHistory } from '../api/history'

interface HistoryState {
  history: Record<number, InvestigationHistoryItem[]>
  loading: Record<number, boolean>
  fetch: (ticketId: number) => Promise<void>
}

export const useInvestigationHistoryStore = create<HistoryState>((set) => ({
  history: {},
  loading: {},

  async fetch(ticketId) {
    set((s) => ({ loading: { ...s.loading, [ticketId]: true } }))
    try {
      const items = await fetchInvestigationHistory(ticketId)
      set((s) => ({
        history: { ...s.history, [ticketId]: items },
        loading: { ...s.loading, [ticketId]: false },
      }))
    } catch {
      set((s) => ({ loading: { ...s.loading, [ticketId]: false } }))
    }
  },
}))
