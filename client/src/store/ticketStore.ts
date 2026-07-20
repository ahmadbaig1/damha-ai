import { create } from 'zustand'
import {
  ChatTicket,
  ConversationData,
  fetchLiveChats,
  fetchMessages,
} from '../api/tickets'

const HIDDEN_KEY = 'auxly_hidden_tickets'
function loadHidden(): number[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') } catch { return [] }
}

export const COMPLETED_STATUSES = ['solved', 'closed']

interface TicketStore {
  tickets: ChatTicket[]
  activeTicketId: number | null
  conversations: Record<number, ConversationData>
  ticketsLoading: boolean
  messagesLoading: boolean
  pendingDrafts: Record<number, string>
  hiddenIds: number[]

  loadTickets: () => Promise<void>
  selectTicket: (id: number) => Promise<void>
  refreshMessages: (id: number) => Promise<void>
  setPendingDraft: (ticketId: number, draft: string) => void
  clearPendingDraft: (ticketId: number) => void
  hideTicket: (id: number) => void
  clearTickets: () => void
}

export const useTicketStore = create<TicketStore>((set, get) => ({
  tickets: [],
  activeTicketId: null,
  conversations: {},
  ticketsLoading: false,
  messagesLoading: false,
  pendingDrafts: {},
  hiddenIds: loadHidden(),

  setPendingDraft: (ticketId, draft) =>
    set((s) => ({ pendingDrafts: { ...s.pendingDrafts, [ticketId]: draft } })),

  clearPendingDraft: (ticketId) =>
    set((s) => {
      const pendingDrafts = { ...s.pendingDrafts }
      delete pendingDrafts[ticketId]
      return { pendingDrafts }
    }),

  hideTicket: (id) =>
    set((s) => {
      const hiddenIds = [...s.hiddenIds, id]
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenIds))
      return { hiddenIds }
    }),

  clearTickets: () =>
    set({ tickets: [], conversations: {}, activeTicketId: null }),

  loadTickets: async () => {
    set({ ticketsLoading: true })
    try {
      const tickets = await fetchLiveChats()
      set({ tickets })
    } finally {
      set({ ticketsLoading: false })
    }
  },

  selectTicket: async (id) => {
    set({ activeTicketId: id })
    if (!get().conversations[id]) {
      set({ messagesLoading: true })
      try {
        const data = await fetchMessages(id)
        set((state) => ({ conversations: { ...state.conversations, [id]: data } }))
      } finally {
        set({ messagesLoading: false })
      }
    }
  },

  refreshMessages: async (id) => {
    try {
      const data = await fetchMessages(id)
      set((state) => ({ conversations: { ...state.conversations, [id]: data } }))
    } catch {
      // silent refresh — don't disrupt the UI
    }
  },
}))
