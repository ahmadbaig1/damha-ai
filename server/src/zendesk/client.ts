import dotenv from 'dotenv'
import path from 'path'
import { getOrgSettings } from '../db/orgSettings'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

// Dynamic credentials: DB config first, env fallback, short cache
let _credCache: {
  subdomain: string; email: string; apiToken: string
  appId: string; keyId: string; secretKey: string
  ts: number
} | null = null
const CRED_TTL = 30_000

async function getZendeskCreds() {
  if (_credCache && Date.now() - _credCache.ts < CRED_TTL) return _credCache
  const settings = await getOrgSettings()
  const allCfg = settings.helpdeskConfig ?? {}
  // Support both nested format ({ zendesk: {...} }) and legacy flat format
  const cfg = (allCfg.zendesk ?? allCfg) as Record<string, string | undefined>
  const creds = {
    subdomain:  cfg.subdomain  || process.env.ZENDESK_SUBDOMAIN       || '',
    email:      cfg.email      || process.env.ZENDESK_EMAIL            || '',
    apiToken:   cfg.apiToken   || process.env.ZENDESK_API_TOKEN        || '',
    appId:      cfg.appId      || process.env.ZENDESK_CHAT_APPID       || '',
    keyId:      cfg.keyId      || process.env.ZENDESK_CHAT_KEYID       || '',
    secretKey:  cfg.secretKey  || process.env.ZENDESK_CHAT_SECRETKEY   || '',
    ts: Date.now(),
  }
  _credCache = creds
  return creds
}

export function invalidateZendeskCredCache() {
  _credCache = null
}

async function supportFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { subdomain, email, apiToken } = await getZendeskCreds()
  const auth = Buffer.from(`${email}/token:${apiToken}`).toString('base64')
  const base = `https://${subdomain}/api/v2`
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    },
  })
  return res.json() as Promise<T>
}

async function smoochFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { appId, keyId, secretKey } = await getZendeskCreds()
  const auth = Buffer.from(`${keyId}:${secretKey}`).toString('base64')
  const base = `https://api.smooch.io/v2/apps/${appId}`
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })
  return res.json() as Promise<T>
}

export async function getTicket(ticketId: string): Promise<ZendeskTicket> {
  const data = await supportFetch<{ ticket: ZendeskTicket }>(`/tickets/${ticketId}.json`)
  return data.ticket
}

export function extractSmoochUserId(description: string): string | null {
  const match = description.match(/Web User ([a-f0-9]+)/)
  return match ? match[1] : null
}

interface ZendeskComment {
  id: number
  author_id: number
  body: string
  plain_body: string
  public: boolean
  created_at: string
}

export async function getTicketComments(ticketId: string): Promise<ZendeskComment[]> {
  const data = await supportFetch<{ comments: ZendeskComment[] }>(
    `/tickets/${ticketId}/comments.json`,
  )
  return data.comments ?? []
}

export interface ZendeskTicket {
  id: number
  subject: string
  status: string
  description: string
  created_at: string
  updated_at: string
  from_messaging_channel: boolean
  requester_id?: number
  via: {
    channel: string
    source?: {
      to?: { phone?: string; name?: string }
      from?: { phone?: string; name?: string }
    }
  }
}

export interface SmoochMessage {
  id: string
  received: string
  author: {
    type: 'user' | 'business'
    displayName?: string
    userId?: string
  }
  content: {
    type: 'text' | 'form' | 'formResponse'
    text?: string
    textFallback?: string
  }
  source: { type: string }
}

export async function getLiveChats(): Promise<ZendeskTicket[]> {
  const data = await supportFetch<{ tickets: ZendeskTicket[] }>(
    '/tickets.json?sort_by=created_at&sort_order=desc',
  )
  return data.tickets.filter((t) => t.from_messaging_channel)
}

export async function getConversationMessages(ticketId: string): Promise<{
  ticket: ZendeskTicket
  conversationId: string
  messages: SmoochMessage[]
}> {
  const { ticket } = await supportFetch<{ ticket: ZendeskTicket }>(`/tickets/${ticketId}.json`)

  const userId = extractSmoochUserId(ticket.description)
  if (!userId) throw new Error('Could not extract Smooch user ID from ticket')

  const convData = await smoochFetch<{
    conversations: Array<{ id: string; metadata?: Record<string, string> }>
  }>(`/conversations?filter%5BuserId%5D=${userId}`)

  // Prefer the conversation Zendesk explicitly linked to this ticket (stored in
  // Sunshine Conversations metadata as "zendesk:ticketId"). Fall back to [0]
  // when the field isn't present — the created_at message filter below still
  // keeps messages scoped to this session.
  const conversation =
    convData.conversations?.find(
      (c) => c.metadata?.['zendesk:ticketId'] === String(ticketId),
    ) ?? convData.conversations?.[0]

  if (!conversation) throw new Error('No Sunshine Conversation found for user')

  const msgData = await smoochFetch<{ messages: SmoochMessage[] }>(
    `/conversations/${conversation.id}/messages`,
  )

  // Smooch uses a persistent conversation per user, so a "new" ticket from the
  // same user will share the same conversation and include all prior messages.
  // Filter to only messages received at or after this ticket was created.
  const ticketStart = new Date(ticket.created_at).getTime()
  const messages = msgData.messages.filter(
    (m) => new Date(m.received).getTime() >= ticketStart,
  )

  return { ticket, conversationId: conversation.id, messages }
}

export interface TicketUpdate {
  status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed'
  subject?: string
  requester_id?: number
}

export async function updateTicket(
  ticketId: string,
  fields: TicketUpdate,
): Promise<ZendeskTicket> {
  const data = await supportFetch<{ ticket: ZendeskTicket }>(`/tickets/${ticketId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ ticket: fields }),
  })
  return data.ticket
}

export async function sendMessage(conversationId: string, text: string): Promise<SmoochMessage[]> {
  const data = await smoochFetch<{ messages: SmoochMessage[] }>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        author: { type: 'business' },
        content: { type: 'text', text },
      }),
    },
  )
  return data.messages
}
