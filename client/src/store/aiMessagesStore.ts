import { create } from 'zustand'

export interface AIMessage {
  id: string
  ticketId: number
  text: string
  received: string
  loading?: boolean
  type: 'summary' | 'answer' | 'challenge'
}

interface AIMessagesState {
  messages: Record<number, AIMessage[]>
  addMessage: (msg: AIMessage) => void
  updateMessage: (ticketId: number, id: string, patch: Partial<AIMessage>) => void
  clearTicket: (ticketId: number) => void
}

export const useAIMessagesStore = create<AIMessagesState>((set) => ({
  messages: {},

  addMessage(msg) {
    set((s) => ({
      messages: {
        ...s.messages,
        [msg.ticketId]: [...(s.messages[msg.ticketId] ?? []), msg],
      },
    }))
  },

  updateMessage(ticketId, id, patch) {
    set((s) => ({
      messages: {
        ...s.messages,
        [ticketId]: (s.messages[ticketId] ?? []).map((m) =>
          m.id === id ? { ...m, ...patch } : m,
        ),
      },
    }))
  },

  clearTicket(ticketId) {
    set((s) => {
      const messages = { ...s.messages }
      delete messages[ticketId]
      return { messages }
    })
  },
}))
