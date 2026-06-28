import api from './index'

export interface CoachSuggestion {
  suggestion: string | null
  type: 'empathy' | 'efficiency' | 'positive' | null
}

export async function fetchCoachSuggestion(ticketId: number): Promise<CoachSuggestion> {
  const { data } = await api.post<CoachSuggestion>('/agents/coach/suggestion', { ticketId })
  return data
}
