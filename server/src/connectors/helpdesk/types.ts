export interface HelpdeskTicket {
  id: number
  subject: string
  status: string
  description: string
  created_at: string
  requester_id?: number
  call_url?: string | null
}

export interface HelpdeskMessage {
  id: string
  role: 'customer' | 'agent'
  text: string
  received: string
  authorName?: string
}

export interface HelpdeskConversation {
  ticket: HelpdeskTicket
  conversationId: string
  messages: HelpdeskMessage[]
}

export interface HelpdeskProvider {
  name: string
  getTickets(): Promise<HelpdeskTicket[]>
  getConversation(ticketId: string): Promise<HelpdeskConversation>
  sendMessage(conversationId: string, text: string): Promise<void>
  updateTicket(ticketId: string, fields: Partial<Pick<HelpdeskTicket, 'status' | 'subject' | 'requester_id'>>): Promise<HelpdeskTicket>
  getCallUrl(ticketId: string): Promise<string | null>
}
