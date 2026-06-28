import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTicketStore } from '../store/ticketStore'
import { useCoachStore } from '../store/coachStore'
import { useInvestigatorStore } from '../store/investigatorStore'
import { useMoodStore } from '../store/moodStore'
import { getDraftReply } from '../api/tickets'
import { ChatSidebar } from '../components/ChatSidebar'
import { ConversationThread } from '../components/ConversationThread'
import { ReplyComposer } from '../components/ReplyComposer'
import { CoachPanel } from '../components/CoachPanel'
import { RightSidebar } from '../components/RightSidebar'
import { CloseTicketButton } from '../components/CloseTicketButton'

const POLL_INTERVAL = 10_000

// A message is "substantive" if a customer wrote more than a brief greeting
function isSubstantive(text: string): boolean {
  return text.trim().length > 50
}

export default function Workspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    tickets,
    activeTicketId,
    conversations,
    messagesLoading,
    selectTicket,
    refreshMessages,
    setPendingDraft,
  } = useTicketStore()
  const { fetchSuggestion } = useCoachStore()
  const { investigate, reports: investigationReports, loading: investigatorLoading } = useInvestigatorStore()
  const { assessMood } = useMoodStore()

  const lastMessageCountRef = useRef<Record<number, number>>({})
  // Tracks tickets that have already had their greeting generated
  const greetedRef = useRef<Set<number>>(new Set())
  // Tracks tickets where auto-investigation has been triggered
  const investigatedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (id) selectTicket(Number(id))
  }, [id, selectTicket])

  useEffect(() => {
    if (activeTicketId && String(activeTicketId) !== id) {
      navigate(`/tickets/${activeTicketId}`, { replace: true })
    }
  }, [activeTicketId, id, navigate])

  useEffect(() => {
    if (!activeTicketId && tickets.length > 0) {
      selectTicket(tickets[0].id)
    }
  }, [tickets, activeTicketId, selectTicket])

  // On initial ticket load: greeting, mood, auto-investigate if already substantive
  useEffect(() => {
    if (!activeTicketId) return
    const convo = conversations[activeTicketId]
    if (!convo) return

    const prev = lastMessageCountRef.current[activeTicketId] ?? 0
    if (prev !== 0) return // not initial load

    lastMessageCountRef.current[activeTicketId] = convo.messages.length

    const customerMessages = convo.messages.filter((m) => m.author.type === 'user')
    const agentMessages = convo.messages.filter((m) => m.author.type === 'business')

    // Auto-greeting: engineer hasn't replied yet
    if (agentMessages.length === 0 && !greetedRef.current.has(activeTicketId)) {
      greetedRef.current.add(activeTicketId)
      getDraftReply(activeTicketId, undefined, true)
        .then((draft) => setPendingDraft(activeTicketId, draft))
        .catch(() => {})
    }

    // Initial mood assessment
    fetchSuggestion(activeTicketId)
    assessMood(activeTicketId)

    // Auto-investigate if customer has already described something substantive
    const hasSubstantiveMessage = customerMessages.some((m) => {
      const text = m.content.text ?? m.content.textFallback ?? ''
      return isSubstantive(text)
    })
    if (
      hasSubstantiveMessage &&
      !investigatedRef.current.has(activeTicketId) &&
      !investigationReports[activeTicketId] &&
      !investigatorLoading[activeTicketId]
    ) {
      investigatedRef.current.add(activeTicketId)
      investigate(activeTicketId)
    }
  }, [activeTicketId, conversations])

  // Poll + coach/mood/auto-investigate on new messages
  useEffect(() => {
    if (!activeTicketId) return

    const interval = setInterval(async () => {
      await refreshMessages(activeTicketId)

      const convo = useTicketStore.getState().conversations[activeTicketId]
      if (!convo) return

      const prev = lastMessageCountRef.current[activeTicketId] ?? 0
      const current = convo.messages.length

      if (current > prev) {
        lastMessageCountRef.current[activeTicketId] = current
        const lastMsg = convo.messages[convo.messages.length - 1]

        if (lastMsg.author.type === 'user') {
          fetchSuggestion(activeTicketId)
          assessMood(activeTicketId)

          // Auto-investigate when customer sends a substantive message
          const text = lastMsg.content.text ?? lastMsg.content.textFallback ?? ''
          const alreadyRan =
            investigatedRef.current.has(activeTicketId) ||
            !!useInvestigatorStore.getState().reports[activeTicketId] ||
            !!useInvestigatorStore.getState().loading[activeTicketId]

          if (isSubstantive(text) && !alreadyRan) {
            investigatedRef.current.add(activeTicketId)
            investigate(activeTicketId)
          }
        }
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [activeTicketId, refreshMessages, fetchSuggestion, assessMood, investigate])

  const activeConvo = activeTicketId ? conversations[activeTicketId] : null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ChatSidebar />

      {/* Center column */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--color-bg)',
        minWidth: 0,
      }}>
        {/* Panel header */}
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--glass-bg-heavy)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexShrink: 0,
          boxShadow: 'var(--shadow-xs)',
        }}>
          {activeConvo ? (
            <>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {activeConvo.ticket.subject}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                #{activeConvo.ticket.id}
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <CloseTicketButton ticketId={activeConvo.ticket.id} />
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              {messagesLoading ? 'Loading…' : 'Select a chat'}
            </span>
          )}
        </div>

        {messagesLoading && !activeConvo ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Loading messages…
          </div>
        ) : activeConvo ? (
          <>
            <ConversationThread messages={activeConvo.messages} />
            {activeTicketId && <CoachPanel ticketId={activeTicketId} />}
            <ReplyComposer
              ticketId={activeConvo.ticket.id}
              conversationId={activeConvo.conversationId}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No active chats
          </div>
        )}
      </div>

      {/* Right sidebar */}
      {activeTicketId && <RightSidebar ticketId={activeTicketId} />}
    </div>
  )
}
