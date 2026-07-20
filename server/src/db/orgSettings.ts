import { query } from './client'

export interface ToneConfig {
  formality: 'casual' | 'professional' | 'formal'
  signOff: string | null
  forbiddenPhrases: string[]
  customInstructions: string | null
  emojiPolicy: 'encouraged' | 'neutral' | 'discouraged' | 'never'
  humanness: number  // 1–5
}

// Nested per-provider: { zendesk: { subdomain, email, apiToken, ... }, freshdesk: { subdomain, apiKey } }
export type HelpdeskConfig = Record<string, Record<string, string | undefined>>

export interface OrgSettings {
  toneConfig: ToneConfig
  kbOnly: boolean
  anthropicKey: string | null
  helpdeskProvider: string
  helpdeskConfig: HelpdeskConfig
}

const DEFAULT_TONE: ToneConfig = {
  formality: 'professional',
  signOff: null,
  forbiddenPhrases: [],
  customInstructions: null,
  emojiPolicy: 'discouraged',
  humanness: 3,
}

const DEFAULT_SETTINGS: OrgSettings = {
  toneConfig: DEFAULT_TONE,
  kbOnly: false,
  anthropicKey: null,
  helpdeskProvider: 'zendesk',
  helpdeskConfig: {},
}

// Migrate legacy flat Zendesk config to the nested per-provider format on read
function normalizeHelpdeskConfig(
  raw: Record<string, unknown>,
  activeProvider: string,
): HelpdeskConfig {
  const knownProviders = ['zendesk', 'freshdesk', 'hubspot', 'intercom', 'helpscout']
  const isAlreadyNested = knownProviders.some(
    (p) => raw[p] !== undefined && typeof raw[p] === 'object' && raw[p] !== null,
  )
  if (isAlreadyNested) return raw as HelpdeskConfig
  return { [activeProvider]: raw as Record<string, string | undefined> }
}

export async function getOrgSettings(): Promise<OrgSettings> {
  try {
    const rows = await query<{
      tone_config: ToneConfig
      kb_only: boolean
      anthropic_key: string | null
      helpdesk_provider: string
      helpdesk_config: Record<string, unknown>
    }>(
      `SELECT tone_config, kb_only, anthropic_key, helpdesk_provider, helpdesk_config
       FROM org_settings WHERE key = 'default'`,
    )
    if (!rows[0]) return DEFAULT_SETTINGS
    const activeProvider = rows[0].helpdesk_provider ?? 'zendesk'
    const normalized = normalizeHelpdeskConfig(rows[0].helpdesk_config ?? {}, activeProvider)
    return {
      toneConfig: { ...DEFAULT_TONE, ...rows[0].tone_config },
      kbOnly: rows[0].kb_only ?? false,
      anthropicKey: rows[0].anthropic_key ?? null,
      helpdeskProvider: activeProvider,
      helpdeskConfig: normalized,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function getOrgToneConfig(): Promise<ToneConfig> {
  const s = await getOrgSettings()
  return s.toneConfig
}

export async function updateOrgSettings(patch: Partial<OrgSettings>): Promise<void> {
  const current = await getOrgSettings()
  const next = { ...current, ...patch }
  await query(
    `UPDATE org_settings
     SET tone_config = $1, kb_only = $2, anthropic_key = $3,
         helpdesk_provider = $4, helpdesk_config = $5, updated_at = now()
     WHERE key = 'default'`,
    [
      JSON.stringify(next.toneConfig),
      next.kbOnly,
      next.anthropicKey,
      next.helpdeskProvider,
      JSON.stringify(next.helpdeskConfig),
    ],
  )
}

export async function updateOrgToneConfig(config: ToneConfig): Promise<void> {
  await updateOrgSettings({ toneConfig: config })
}
