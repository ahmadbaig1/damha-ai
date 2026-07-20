import { create } from 'zustand'
import {
  KnowledgeSource,
  listKBSources,
  addKBArticle,
  crawlKBUrl,
  uploadKBFile,
  addKBEmail,
  deleteKBSource,
  suggestKBArticle,
} from '../api/kb'
import { InvestigationReport } from './investigatorStore'

interface KBState {
  sources: KnowledgeSource[]
  loading: boolean
  suggesting: boolean
  list: () => Promise<void>
  addArticle: (title: string, content: string) => Promise<void>
  crawlUrl: (url: string) => Promise<void>
  uploadFile: (file: File) => Promise<void>
  addEmail: (subject: string, body: string) => Promise<void>
  suggest: (report: InvestigationReport) => Promise<{ title: string; content: string }>
  delete: (id: string) => Promise<void>
}

export const useKBStore = create<KBState>((set, get) => ({
  sources: [],
  loading: false,
  suggesting: false,

  async list() {
    set({ loading: true })
    try {
      const sources = await listKBSources()
      set({ sources, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  async addArticle(title, content) {
    await addKBArticle(title, content)
    await get().list()
  },

  async crawlUrl(url) {
    await crawlKBUrl(url)
    await get().list()
  },

  async uploadFile(file) {
    await uploadKBFile(file)
    await get().list()
  },

  async addEmail(subject, body) {
    await addKBEmail(subject, body)
    await get().list()
  },

  async suggest(report) {
    set({ suggesting: true })
    try {
      const result = await suggestKBArticle(report)
      return result
    } finally {
      set({ suggesting: false })
    }
  },

  async delete(id) {
    await deleteKBSource(id)
    set((s) => ({ sources: s.sources.filter((x) => x.id !== id) }))
  },
}))
