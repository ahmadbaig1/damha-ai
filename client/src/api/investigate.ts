import api from './index'
import { InvestigationReport } from '../store/investigatorStore'

export async function requestInvestigation(ticketId: number): Promise<InvestigationReport> {
  const { data } = await api.post<{ report: InvestigationReport }>('/agents/investigate', { ticketId })
  return data.report
}
