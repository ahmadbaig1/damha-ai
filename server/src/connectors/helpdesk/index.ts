import { getOrgSettings } from '../../db/orgSettings'
import { HelpdeskProvider } from './types'
import { zendeskProvider } from './zendesk'
import { FreshdeskProvider } from './freshdesk'

export async function getHelpdeskProvider(): Promise<HelpdeskProvider> {
  const settings = await getOrgSettings()
  const provider = settings.helpdeskProvider ?? 'zendesk'
  const cfg = settings.helpdeskConfig ?? {}

  switch (provider) {
    case 'freshdesk': {
      const fdCfg = (cfg.freshdesk ?? {}) as Record<string, string | undefined>
      return new FreshdeskProvider(fdCfg.subdomain ?? '', fdCfg.apiKey ?? '')
    }
    case 'zendesk':
    default:
      return zendeskProvider
  }
}

export type { HelpdeskProvider, HelpdeskTicket, HelpdeskConversation, HelpdeskMessage } from './types'
