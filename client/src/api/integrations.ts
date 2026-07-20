import api from './index'

export interface IntegrationStatus {
  github: boolean
  linear: boolean
}

export async function fetchIntegrationStatus(): Promise<IntegrationStatus> {
  const { data } = await api.get<IntegrationStatus>('/integrations/status')
  return data
}

export async function raiseGitHubIssue(
  title: string,
  body: string,
  investigationId?: string,
): Promise<string> {
  const { data } = await api.post<{ url: string }>('/integrations/github/issue', {
    title,
    body,
    investigationId,
  })
  return data.url
}

export async function raiseLinearIssue(
  title: string,
  body: string,
  investigationId?: string,
): Promise<string> {
  const { data } = await api.post<{ url: string }>('/integrations/linear/issue', {
    title,
    body,
    investigationId,
  })
  return data.url
}
