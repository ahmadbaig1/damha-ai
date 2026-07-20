import api from './index'
import { InvestigationReport } from '../store/investigatorStore'

export interface KnowledgeSource {
  id: string
  source_type: string
  title: string
  source_ref: string | null
  created_at: string
}

export async function listKBSources(): Promise<KnowledgeSource[]> {
  const { data } = await api.get<{ sources: KnowledgeSource[] }>('/kb')
  return data.sources
}

export async function addKBArticle(title: string, content: string): Promise<string> {
  const { data } = await api.post<{ id: string }>('/kb/articles', { title, content })
  return data.id
}

export async function crawlKBUrl(url: string): Promise<string> {
  const { data } = await api.post<{ id: string }>('/kb/crawl', { url })
  return data.id
}

export async function uploadKBFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ id: string }>('/kb/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.id
}

export async function addKBEmail(subject: string, body: string): Promise<string> {
  const { data } = await api.post<{ id: string }>('/kb/email', { subject, body })
  return data.id
}

export async function suggestKBArticle(report: InvestigationReport): Promise<{ title: string; content: string }> {
  const { data } = await api.post<{ title: string; content: string }>('/kb/suggest', { report })
  return data
}

export async function deleteKBSource(id: string): Promise<void> {
  await api.delete(`/kb/${id}`)
}
