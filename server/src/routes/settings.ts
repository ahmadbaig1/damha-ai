import { Router } from 'express'
import { getOrgSettings, updateOrgSettings, OrgSettings } from '../db/orgSettings'
import { invalidateZendeskCredCache } from '../zendesk/client'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const settings = await getOrgSettings()
    const allCfg = settings.helpdeskConfig ?? {}
    const activeProvider = settings.helpdeskProvider ?? 'zendesk'
    const cfg = (allCfg[activeProvider] ?? {}) as Record<string, string | undefined>

    // Tell the client which providers already have credentials stored
    const providerConfigs: Record<string, boolean> = {}
    for (const [pid, pcfg] of Object.entries(allCfg)) {
      if (pcfg && typeof pcfg === 'object') {
        const c = pcfg as Record<string, string | undefined>
        providerConfigs[pid] = !!(c.subdomain)
      }
    }

    res.json({
      toneConfig:       settings.toneConfig,
      kbOnly:           settings.kbOnly,
      hasCustomKey:     !!settings.anthropicKey,
      helpdeskProvider: activeProvider,
      helpdeskConfig: {
        subdomain:    cfg.subdomain    ?? '',
        email:        cfg.email        ?? '',
        appId:        cfg.appId        ?? '',
        keyId:        cfg.keyId        ?? '',
        hasApiToken:  !!(cfg.apiToken),
        hasSecretKey: !!(cfg.secretKey),
        hasApiKey:    !!(cfg.apiKey),
      },
      providerConfigs,
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

router.put('/', async (req, res) => {
  if (req.user?.role !== 'lead') {
    res.status(403).json({ error: 'Only team leads can update settings' })
    return
  }
  try {
    const { toneConfig, kbOnly, anthropicKey, helpdeskProvider, helpdeskConfig } = req.body as
      Partial<OrgSettings> & {
        anthropicKey?: string
        helpdeskConfig?: Record<string, string | undefined>
      }

    const patch: Partial<OrgSettings> = {}
    if (toneConfig !== undefined)     patch.toneConfig = toneConfig
    if (kbOnly !== undefined)         patch.kbOnly = kbOnly
    if (anthropicKey !== undefined)   patch.anthropicKey = anthropicKey || null
    if (helpdeskProvider !== undefined) patch.helpdeskProvider = helpdeskProvider

    if (helpdeskConfig !== undefined) {
      const current = await getOrgSettings()
      const targetProvider = helpdeskProvider ?? current.helpdeskProvider ?? 'zendesk'
      const allCfg = current.helpdeskConfig ?? {}
      const existingCfg = (allCfg[targetProvider] ?? {}) as Record<string, string | undefined>

      // Merge creds into the provider's bucket; never wipe stored secrets with blanks
      const newCfg: Record<string, string | undefined> = {
        ...existingCfg,
        ...helpdeskConfig,
        apiToken:  helpdeskConfig.apiToken  || existingCfg.apiToken,
        secretKey: helpdeskConfig.secretKey || existingCfg.secretKey,
        apiKey:    helpdeskConfig.apiKey    || existingCfg.apiKey,
      }

      patch.helpdeskConfig = { ...allCfg, [targetProvider]: newCfg }
      invalidateZendeskCredCache()
    }

    await updateOrgSettings(patch)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export default router
