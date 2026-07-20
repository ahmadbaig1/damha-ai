import { create } from 'zustand'
import { ToneConfig, OrgSettings, HelpdeskConfigResponse, fetchSettings, saveSettings } from '../api/settings'

interface SettingsState {
  toneConfig: ToneConfig | null
  kbOnly: boolean
  hasCustomKey: boolean
  helpdeskProvider: string
  helpdeskConfig: HelpdeskConfigResponse
  providerConfigs: Record<string, boolean>
  loading: boolean
  initialized: boolean
  saving: boolean
  saved: boolean
  fetch: () => Promise<void>
  save: (patch: {
    toneConfig?: ToneConfig
    kbOnly?: boolean
    anthropicKey?: string
    helpdeskProvider?: string
    helpdeskConfig?: { subdomain?: string; email?: string; apiToken?: string; appId?: string; keyId?: string; secretKey?: string; apiKey?: string }
  }) => Promise<void>
}

const DEFAULT_HD_CONFIG: HelpdeskConfigResponse = {
  subdomain: '', email: '', appId: '', keyId: '',
  hasApiToken: false, hasSecretKey: false, hasApiKey: false,
}

export const useSettingsStore = create<SettingsState>((set) => ({
  toneConfig: null,
  kbOnly: false,
  hasCustomKey: false,
  helpdeskProvider: 'zendesk',
  helpdeskConfig: DEFAULT_HD_CONFIG,
  providerConfigs: {},
  loading: false,
  initialized: false,
  saving: false,
  saved: false,

  async fetch() {
    set({ loading: true })
    try {
      const s: OrgSettings = await fetchSettings()
      set({
        toneConfig:       s.toneConfig,
        kbOnly:           s.kbOnly,
        hasCustomKey:     s.hasCustomKey,
        helpdeskProvider: s.helpdeskProvider ?? 'zendesk',
        helpdeskConfig:   s.helpdeskConfig ?? DEFAULT_HD_CONFIG,
        providerConfigs:  s.providerConfigs ?? {},
        loading:          false,
        initialized:      true,
      })
    } catch {
      set({ loading: false, initialized: true })
    }
  },

  async save(patch) {
    set({ saving: true, saved: false })
    try {
      await saveSettings(patch)
      // After any save re-fetch to get accurate providerConfigs + active provider config
      const s: OrgSettings = await fetchSettings()
      set({
        toneConfig:       patch.toneConfig      ?? s.toneConfig,
        kbOnly:           patch.kbOnly          !== undefined ? patch.kbOnly : s.kbOnly,
        hasCustomKey:     s.hasCustomKey,
        helpdeskProvider: s.helpdeskProvider    ?? 'zendesk',
        helpdeskConfig:   s.helpdeskConfig      ?? DEFAULT_HD_CONFIG,
        providerConfigs:  s.providerConfigs      ?? {},
        saving:           false,
        saved:            true,
      })
      setTimeout(() => set({ saved: false }), 2000)
    } catch (err) {
      set({ saving: false })
      throw err
    }
  },
}))
