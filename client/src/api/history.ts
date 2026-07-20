import api from './index'

export interface InvestigationHistoryItem {
  id: string
  zendesk_ticket_id: number | null
  issue_type: string | null
  created_at: string
  summary: string | null
  confidence: string | null
}

export async function fetchInvestigationHistory(ticketId: number): Promise<InvestigationHistoryItem[]> {
  const { data } = await api.get<{ history: InvestigationHistoryItem[] }>(`/tickets/${ticketId}/history`)
  return data.history
}
