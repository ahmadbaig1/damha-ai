import api from './index'

export interface ChatTicket {
  id: number
  subject: string
  status: string
  description: string
  created_at: string
  updated_at: string
}

export interface SmoochMessage {
  id: string
  received: string
  author: {
    type: 'user' | 'business'
    displayName?: string
  }
  content: {
    type: 'text' | 'form' | 'formResponse'
    text?: string
    textFallback?: string
  }
  source: { type: string }
}

export interface ConversationData {
  ticket: ChatTicket
  conversationId: string
  messages: SmoochMessage[]
}

export async function fetchLiveChats(): Promise<ChatTicket[]> {
  const { data } = await api.get<{ tickets: ChatTicket[] }>('/tickets')
  return data.tickets
}

export async function fetchMessages(ticketId: number): Promise<ConversationData> {
  const { data } = await api.get<ConversationData>(`/tickets/${ticketId}/messages`)
  return data
}

export async function getDraftReply(
  ticketId: number,
  investigationReport?: unknown,
  isGreeting?: boolean,
): Promise<string> {
  const { data } = await api.post<{ draft: string }>('/agents/reply', {
    ticketId,
    investigationReport,
    isGreeting,
  })
  return data.draft
}

export async function sendReply(
  ticketId: number,
  conversationId: string,
  text: string,
): Promise<void> {
  await api.post(`/tickets/${ticketId}/reply`, { conversationId, text })
}

export async function closeTicket(
  ticketId: number,
  status: 'pending' | 'solved',
): Promise<void> {
  await api.patch(`/tickets/${ticketId}/status`, { status })
}

export type ComposeResult =
  | { type: 'direct'; draft: string; polished: boolean }
  | { type: 'instruction'; draft: string; polished: true }

export async function composeMessage(
  ticketId: number,
  input: string,
): Promise<ComposeResult> {
  const { data } = await api.post<ComposeResult>('/agents/compose', { ticketId, input })
  return data
}
