import api from './index'

export interface ToneConfig {
  formality: 'casual' | 'professional' | 'formal'
  signOff: string | null
  forbiddenPhrases: string[]
  customInstructions: string | null
  emojiPolicy: 'encouraged' | 'neutral' | 'discouraged' | 'never'
  humanness: number
}

export interface HelpdeskConfigResponse {
  subdomain: string
  email: string
  appId: string
  keyId: string
  hasApiToken: boolean
  hasSecretKey: boolean
  hasApiKey: boolean
}

export interface OrgSettings {
  toneConfig: ToneConfig
  kbOnly: boolean
  hasCustomKey: boolean
  helpdeskProvider: string
  helpdeskConfig: HelpdeskConfigResponse
  // true if that provider has credentials stored
  providerConfigs: Record<string, boolean>
}

export async function fetchSettings(): Promise<OrgSettings> {
  const { data } = await api.get<OrgSettings>('/settings/tone')
  return data
}

export async function saveSettings(patch: {
  toneConfig?: ToneConfig
  kbOnly?: boolean
  anthropicKey?: string
  helpdeskProvider?: string
  helpdeskConfig?: { subdomain?: string; email?: string; apiToken?: string; appId?: string; keyId?: string; secretKey?: string; apiKey?: string }
}): Promise<void> {
  await api.put('/settings/tone', patch)
}
