import { create } from 'zustand'
import {
  IntegrationStatus,
  fetchIntegrationStatus,
  raiseGitHubIssue,
  raiseLinearIssue,
} from '../api/integrations'

interface IntegrationsState {
  status: IntegrationStatus | null
  raising: boolean
  fetchStatus: () => Promise<void>
  raiseGitHub: (title: string, body: string, investigationId?: string) => Promise<string>
  raiseLinear: (title: string, body: string, investigationId?: string) => Promise<string>
}

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  status: null,
  raising: false,

  async fetchStatus() {
    try {
      const status = await fetchIntegrationStatus()
      set({ status })
    } catch {
      set({ status: { github: false, linear: false } })
    }
  },

  async raiseGitHub(title, body, investigationId) {
    set({ raising: true })
    try {
      const url = await raiseGitHubIssue(title, body, investigationId)
      return url
    } finally {
      set({ raising: false })
    }
  },

  async raiseLinear(title, body, investigationId) {
    set({ raising: true })
    try {
      const url = await raiseLinearIssue(title, body, investigationId)
      return url
    } finally {
      set({ raising: false })
    }
  },
}))
