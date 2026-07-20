import { HelpdeskProvider, HelpdeskTicket, HelpdeskConversation, HelpdeskMessage } from './types'

interface FDTicket {
  id: number
  subject: string
  status: number
  description: string
  description_text: string
  created_at: string
  requester_id: number
}

interface FDConversation {
  id: number
  body: string
  body_text: string
  incoming: boolean
  created_at: string
}

const STATUS_TO_STRING: Record<number, string> = {
  2: 'open',
  3: 'pending',
  4: 'resolved',
  5: 'closed',
}

const STRING_TO_STATUS: Record<string, number> = {
  open: 2,
  pending: 3,
  'on-hold': 3,
  solved: 4,
  resolved: 4,
  closed: 5,
}

function mapTicket(t: FDTicket): HelpdeskTicket {
  return {
    id: t.id,
    subject: t.subject,
    status: STATUS_TO_STRING[t.status] ?? 'open',
    description: t.description_text || t.description || '',
    created_at: t.created_at,
    requester_id: t.requester_id,
  }
}

export class FreshdeskProvider implements HelpdeskProvider {
  name = 'freshdesk'

  constructor(private subdomain: string, private apiKey: string) {}

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const auth = Buffer.from(`${this.apiKey}:X`).toString('base64')
    const res = await fetch(`https://${this.subdomain}.freshdesk.com/api/v2${path}`, {
      ...options,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Freshdesk ${res.status}: ${body}`)
    }
    const text = await res.text()
    return text ? JSON.parse(text) : ({} as T)
  }

  async getTickets(): Promise<HelpdeskTicket[]> {
    const tickets = await this.fetch<FDTicket[]>(
      '/tickets?order_by=created_at&order_type=desc&include=description',
    )
    return tickets.map(mapTicket)
  }

  async getConversation(ticketId: string): Promise<HelpdeskConversation> {
    const [ticket, convs] = await Promise.all([
      this.fetch<FDTicket>(`/tickets/${ticketId}?include=description`),
      this.fetch<FDConversation[]>(`/tickets/${ticketId}/conversations`),
    ])

    const messages: HelpdeskMessage[] = [
      {
        id: `${ticketId}-description`,
        role: 'customer',
        text: ticket.description_text || ticket.description || '',
        received: ticket.created_at,
      },
      ...convs.map((c) => ({
        id: String(c.id),
        role: c.incoming ? ('customer' as const) : ('agent' as const),
        text: c.body_text || c.body || '',
        received: c.created_at,
      })),
    ]

    return {
      ticket: mapTicket(ticket),
      conversationId: ticketId,
      messages,
    }
  }

  async sendMessage(conversationId: string, text: string): Promise<void> {
    await this.fetch(`/tickets/${conversationId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body: text }),
    })
  }

  async updateTicket(
    ticketId: string,
    fields: Partial<Pick<HelpdeskTicket, 'status' | 'subject' | 'requester_id'>>,
  ): Promise<HelpdeskTicket> {
    const body: Record<string, unknown> = {}
    if (fields.status !== undefined) body.status = STRING_TO_STATUS[fields.status] ?? 2
    if (fields.subject !== undefined) body.subject = fields.subject
    if (fields.requester_id !== undefined) body.requester_id = fields.requester_id
    const ticket = await this.fetch<FDTicket>(`/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return mapTicket(ticket)
  }

  async getCallUrl(_ticketId: string): Promise<string | null> {
    return null
  }
}
