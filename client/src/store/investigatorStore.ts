import { create } from 'zustand'
import { requestInvestigation } from '../api/investigate'

export interface Finding {
  area: string
  status: 'pass' | 'warning' | 'fail' | 'unknown'
  message: string
}

export interface InvestigationReport {
  summary: string
  findings: Finding[]
  hypothesis: string
  confidence: 'low' | 'medium' | 'high'
  recommended_steps: string[]
}

interface InvestigatorState {
  reports: Record<number, InvestigationReport>
  loading: Record<number, boolean>
  errors: Record<number, string>
  investigate: (ticketId: number) => Promise<void>
  clear: (ticketId: number) => void
}

export const useInvestigatorStore = create<InvestigatorState>((set) => ({
  reports: {},
  loading: {},
  errors: {},

  async investigate(ticketId) {
    set((s) => ({
      loading: { ...s.loading, [ticketId]: true },
      errors: { ...s.errors, [ticketId]: '' },
    }))
    try {
      const report = await requestInvestigation(ticketId)
      set((s) => ({
        reports: { ...s.reports, [ticketId]: report },
        loading: { ...s.loading, [ticketId]: false },
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Investigation failed'
      set((s) => ({
        errors: { ...s.errors, [ticketId]: message },
        loading: { ...s.loading, [ticketId]: false },
      }))
    }
  },

  clear(ticketId) {
    set((s) => {
      const reports = { ...s.reports }
      const errors = { ...s.errors }
      delete reports[ticketId]
      delete errors[ticketId]
      return { reports, errors }
    })
  },
}))
