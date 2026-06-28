import api from './index'
import { MoodResult } from '../store/moodStore'

export async function fetchMood(ticketId: number): Promise<MoodResult> {
  const { data } = await api.post<{ mood: MoodResult }>('/agents/mood', { ticketId })
  return data.mood
}
