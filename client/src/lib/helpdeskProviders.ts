export interface ProviderField {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'email' | 'password'
  required?: boolean
  hint?: string
}

export interface ProviderDef {
  id: string
  name: string
  description: string
  available: boolean
  fields: ProviderField[]
  guide?: string
}

export const HELPDESK_PROVIDERS: ProviderDef[] = [
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'The leading customer service platform',
    available: true,
    guide: 'Find your API token in Zendesk Admin → Apps & Integrations → Zendesk APIs. Sunshine credentials are only needed if you use live chat (Messaging).',
    fields: [
      { key: 'subdomain', label: 'Subdomain', placeholder: 'yourcompany.zendesk.com', type: 'text', required: true },
      { key: 'email', label: 'Agent Email', placeholder: 'agent@yourcompany.com', type: 'email', required: true },
      { key: 'apiToken', label: 'API Token', placeholder: 'Zendesk Admin → Apps & Integrations → APIs', type: 'password', required: true },
      { key: 'appId', label: 'Sunshine App ID', placeholder: 'Zendesk Admin → Sunshine Conversations', type: 'text', hint: 'Required for live chat' },
      { key: 'keyId', label: 'Sunshine Key ID', placeholder: 'Sunshine Conversations API key ID', type: 'text', hint: 'Required for live chat' },
      { key: 'secretKey', label: 'Sunshine Secret Key', placeholder: 'Sunshine Conversations secret key', type: 'password', hint: 'Required for live chat' },
    ],
  },
  {
    id: 'freshdesk',
    name: 'Freshdesk',
    description: 'Freshworks customer support software',
    available: true,
    guide: 'Find your API key in Freshdesk → Profile Settings (top-right avatar) → API Key. Your subdomain is the part before .freshdesk.com in your URL.',
    fields: [
      { key: 'subdomain', label: 'Subdomain', placeholder: 'yourcompany  (not the full URL)', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', placeholder: 'Profile Settings → API Key', type: 'password', required: true },
    ],
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Customer messaging platform',
    available: false,
    fields: [],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'HubSpot Service Hub',
    available: false,
    fields: [],
  },
]

export function getProvider(id: string): ProviderDef | undefined {
  return HELPDESK_PROVIDERS.find((p) => p.id === id)
}
