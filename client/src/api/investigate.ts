import api from './index'
import { InvestigationReport } from '../store/investigatorStore'

export async function requestInvestigation(
  ticketId: number,
): Promise<{ report: InvestigationReport; investigationId: string }> {
  const { data } = await api.post<{ report: InvestigationReport; investigationId: string }>(
    '/agents/investigate',
    { ticketId },
  )
  return data
}

export async function challengeInvestigation(
  ticketId: number,
  originalReport: InvestigationReport,
  challenge: string,
): Promise<{ report: InvestigationReport }> {
  const { data } = await api.post<{ report: InvestigationReport }>(
    '/agents/investigate/challenge',
    { ticketId, originalReport, challenge },
  )
  return data
}

export async function fetchCallUrl(ticketId: number): Promise<string | null> {
  const { data } = await api.get<{ callUrl: string | null }>(`/tickets/${ticketId}/call`)
  return data.callUrl
}

export async function askAI(ticketId: number, question: string): Promise<string> {
  const { data } = await api.post<{ answer: string }>('/agents/ask', { ticketId, question })
  return data.answer
}
