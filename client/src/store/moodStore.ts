import { create } from 'zustand'
import { fetchMood } from '../api/mood'

export interface MoodResult {
  score: number
  label: string
}

interface MoodStore {
  moods: Record<number, MoodResult>
  loading: Record<number, boolean>
  assessMood: (ticketId: number) => Promise<void>
}

export const useMoodStore = create<MoodStore>((set) => ({
  moods: {},
  loading: {},

  async assessMood(ticketId) {
    set((s) => ({ loading: { ...s.loading, [ticketId]: true } }))
    try {
      const mood = await fetchMood(ticketId)
      set((s) => ({ moods: { ...s.moods, [ticketId]: mood } }))
    } catch {
      // silent — mood is non-critical
    } finally {
      set((s) => ({ loading: { ...s.loading, [ticketId]: false } }))
    }
  },
}))
