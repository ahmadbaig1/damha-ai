import {
  getLiveChats,
  getTicket,
  getConversationMessages,
  getTicketComments,
  sendMessage as zdSend,
  updateTicket as zdUpdate,
  extractSmoochUserId,
  TicketUpdate,
  SmoochMessage,
} from '../../zendesk/client'
import { HelpdeskProvider, HelpdeskTicket, HelpdeskConversation, HelpdeskMessage } from './types'

function mapMessage(m: SmoochMessage) {
  return {
    id: m.id,
    role: (m.author.type === 'user' ? 'customer' : 'agent') as 'customer' | 'agent',
    text: m.content.text ?? m.content.textFallback ?? '',
    received: m.received,
    authorName: m.author.displayName,
  }
}

export const zendeskProvider: HelpdeskProvider = {
  name: 'zendesk',

  async getTickets() {
    const tickets = await getLiveChats()
    return tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      description: t.description ?? '',
      created_at: t.created_at,
      requester_id: t.requester_id,
      call_url: null,
    }))
  },

  async getConversation(ticketId: string): Promise<HelpdeskConversation> {
    const ticket = await getTicket(ticketId)
    const mappedTicket: HelpdeskTicket = {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      description: ticket.description ?? '',
      created_at: ticket.created_at,
      requester_id: ticket.requester_id,
      call_url: ticket.via?.source?.to?.phone ? `tel:${ticket.via.source.to.phone}` : null,
    }

    // Try Sunshine Conversations first (messaging channel tickets)
    const smoochUserId = extractSmoochUserId(ticket.description ?? '')
    if (smoochUserId) {
      try {
        const data = await getConversationMessages(ticketId)
        return {
          ticket: mappedTicket,
          conversationId: data.conversationId,
          messages: data.messages.map(mapMessage),
        }
      } catch {
        // fall through to comments API
      }
    }

    // Fallback: standard Zendesk ticket comments (email, web form, etc.)
    const comments = await getTicketComments(ticketId)
    const messages: HelpdeskMessage[] = comments
      .filter((c) => c.public && c.plain_body?.trim())
      .map((c) => ({
        id: String(c.id),
        role: c.author_id === ticket.requester_id ? 'customer' : 'agent',
        text: c.plain_body || '',
        received: c.created_at,
      }))

    return {
      ticket: mappedTicket,
      conversationId: ticketId,
      messages,
    }
  },

  async sendMessage(conversationId: string, text: string): Promise<void> {
    await zdSend(conversationId, text)
  },

  async updateTicket(ticketId: string, fields: TicketUpdate): Promise<HelpdeskTicket> {
    const t = await zdUpdate(ticketId, fields)
    return {
      id: t.id,
      subject: t.subject,
      status: t.status,
      description: t.description ?? '',
      created_at: t.created_at,
    }
  },

  async getCallUrl(ticketId: string): Promise<string | null> {
    const ticket = await getTicket(ticketId)
    const phone = ticket.via?.source?.to?.phone
    return phone ? `tel:${phone}` : null
  },
}
