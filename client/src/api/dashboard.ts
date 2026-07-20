import api from './index'

export interface DashboardOverview {
  investigationsByType: Array<{ issue_type: string; count: number }>
  avgCoachScore: number | null
  systemicAlerts: Array<{ issue_type: string; count: number }>
  moodDistribution: Array<{ day: string; avg_score: number }>
  recentInvestigations: Array<{
    id: string
    zendesk_ticket_id: number
    issue_type: string
    created_at: string
    confidence: string
    raised_issue_url: string | null
  }>
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const { data } = await api.get<DashboardOverview>('/dashboard/overview')
  return data
}
