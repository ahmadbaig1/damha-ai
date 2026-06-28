import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN!
const EMAIL = process.env.ZENDESK_EMAIL!
const TOKEN = process.env.ZENDESK_API_TOKEN!
const APPID = process.env.ZENDESK_CHAT_APPID!
const KEYID = process.env.ZENDESK_CHAT_KEYID!
const SECRET = process.env.ZENDESK_CHAT_SECRETKEY!

const supportAuth = Buffer.from(`${EMAIL}/token:${TOKEN}`).toString('base64')
const smoochAuth = Buffer.from(`${KEYID}:${SECRET}`).toString('base64')
const supportBase = `https://${SUBDOMAIN}/api/v2`
const smoochBase = `https://api.smooch.io/v2/apps/${APPID}`

async function supportFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${supportBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${supportAuth}`,
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    },
  })
  return res.json() as Promise<T>
}

async function smoochFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${smoochBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${smoochAuth}`,
      'Content-Type': 'application/json',
    },
  })
  return res.json() as Promise<T>
}

function extractSmoochUserId(description: string): string | null {
  const match = description.match(/Web User ([a-f0-9]+)/)
  return match ? match[1] : null
}

export interface ZendeskTicket {
  id: number
  subject: string
  status: string
  description: string
  created_at: string
  updated_at: string
  from_messaging_channel: boolean
  via: { channel: string }
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

  const convData = await smoochFetch<{ conversations: Array<{ id: string }> }>(
    `/conversations?filter%5BuserId%5D=${userId}`,
  )
  const conversation = convData.conversations?.[0]
  if (!conversation) throw new Error('No Sunshine Conversation found for user')

  const msgData = await smoochFetch<{ messages: SmoochMessage[] }>(
    `/conversations/${conversation.id}/messages`,
  )

  return { ticket, conversationId: conversation.id, messages: msgData.messages }
}

export async function updateTicketStatus(
  ticketId: string,
  status: 'pending' | 'solved',
): Promise<ZendeskTicket> {
  const data = await supportFetch<{ ticket: ZendeskTicket }>(`/tickets/${ticketId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ ticket: { status } }),
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
