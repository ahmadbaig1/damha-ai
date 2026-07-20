import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTicketStore } from '../store/ticketStore'
import { useCoachStore } from '../store/coachStore'
import { useInvestigatorStore } from '../store/investigatorStore'
import { useMoodStore } from '../store/moodStore'
import { useInvestigationHistoryStore } from '../store/investigationHistoryStore'
import { useAIMessagesStore } from '../store/aiMessagesStore'
import { getDraftReply } from '../api/tickets'
import { fetchCallUrl, askAI } from '../api/investigate'
import { ChatSidebar } from '../components/ChatSidebar'
import { ConversationThread } from '../components/ConversationThread'
import { ReplyComposer } from '../components/ReplyComposer'
import { CoachPanel } from '../components/CoachPanel'
import { RightSidebar } from '../components/RightSidebar'
import { CloseTicketButton } from '../components/CloseTicketButton'
import MatrixReveal from '../components/MatrixReveal'

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
  const { fetch: fetchHistory } = useInvestigationHistoryStore()
  const [callUrl, setCallUrl] = useState<string | null>(null)

  // URL is source of truth; fall back to store for any in-flight transitions
  const urlTicketId = id ? Number(id) : null
  const resolvedTicketId = urlTicketId ?? activeTicketId

  const lastMessageCountRef = useRef<Record<number, number>>({})
  // Tracks tickets that have already had their greeting generated
  const greetedRef = useRef<Set<number>>(new Set())
  // Tracks tickets where auto-investigation has been triggered
  const investigatedRef = useRef<Set<number>>(new Set())

  // URL is the source of truth — select the ticket the URL points to
  useEffect(() => {
    if (id) selectTicket(Number(id))
  }, [id])

  // Auto-navigate to first ticket when landing on /tickets with no ID
  useEffect(() => {
    if (!id && tickets.length > 0) {
      navigate(`/tickets/${tickets[0].id}`, { replace: true })
    }
  }, [id, tickets])

  // On initial ticket load: greeting, mood, auto-investigate if already substantive
  useEffect(() => {
    if (!resolvedTicketId) return
    const convo = conversations[resolvedTicketId]
    if (!convo) return

    const prev = lastMessageCountRef.current[resolvedTicketId] ?? 0
    if (prev !== 0) return // not initial load

    lastMessageCountRef.current[resolvedTicketId] = convo.messages.length

    const customerMessages = convo.messages.filter((m) => m.role === 'customer')
    const agentMessages = convo.messages.filter((m) => m.role === 'agent')

    // Auto-greeting: engineer hasn't replied yet
    if (agentMessages.length === 0 && !greetedRef.current.has(resolvedTicketId)) {
      greetedRef.current.add(resolvedTicketId)
      getDraftReply(resolvedTicketId, undefined, true)
        .then((draft) => setPendingDraft(resolvedTicketId, draft))
        .catch(() => {})
    }

    // Initial mood assessment + history + call URL
    fetchSuggestion(resolvedTicketId)
    assessMood(resolvedTicketId)
    fetchHistory(resolvedTicketId)
    setCallUrl(null)
    fetchCallUrl(resolvedTicketId).then(setCallUrl).catch(() => {})

    // Auto-investigate if customer has already described something substantive
    const hasSubstantiveMessage = customerMessages.some((m) => isSubstantive(m.text ?? ''))
    if (
      hasSubstantiveMessage &&
      !investigatedRef.current.has(resolvedTicketId) &&
      !investigationReports[resolvedTicketId] &&
      !investigatorLoading[resolvedTicketId]
    ) {
      investigatedRef.current.add(resolvedTicketId)
      investigate(resolvedTicketId)
    }
  }, [resolvedTicketId, conversations])

  // Poll + coach/mood/auto-investigate on new messages
  useEffect(() => {
    if (!resolvedTicketId) return

    const interval = setInterval(async () => {
      await refreshMessages(resolvedTicketId)

      const convo = useTicketStore.getState().conversations[resolvedTicketId]
      if (!convo) return

      const prev = lastMessageCountRef.current[resolvedTicketId] ?? 0
      const current = convo.messages.length

      if (current > prev) {
        lastMessageCountRef.current[resolvedTicketId] = current
        const lastMsg = convo.messages[convo.messages.length - 1]

        if (lastMsg.role === 'customer') {
          fetchSuggestion(resolvedTicketId)
          assessMood(resolvedTicketId)

          // Auto-investigate when customer sends a substantive message
          const text = lastMsg.text ?? ''
          const alreadyRan =
            investigatedRef.current.has(resolvedTicketId) ||
            !!useInvestigatorStore.getState().reports[resolvedTicketId] ||
            !!useInvestigatorStore.getState().loading[resolvedTicketId]

          if (isSubstantive(text) && !alreadyRan) {
            investigatedRef.current.add(resolvedTicketId)
            investigate(resolvedTicketId)
          }
        }
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [resolvedTicketId, refreshMessages, fetchSuggestion, assessMood, investigate])

  const activeConvo = resolvedTicketId ? conversations[resolvedTicketId] : null
  const { messages: aiMessages, addMessage, updateMessage } = useAIMessagesStore()
  const activeAIMessages = resolvedTicketId ? (aiMessages[resolvedTicketId] ?? []) : []

  const [askInput, setAskInput] = useState('')
  const [asking, setAsking] = useState(false)

  function isInvestigationRequest(text: string): boolean {
    const t = text.toLowerCase()
    return [
      /check\s*(the\s*)?(website|site|url|domain)/,
      /investigate/,
      /diagnos/,
      /run\s*(a\s*)?(check|investigation|diagnostic|scan|audit)/,
      /scan\s*(the\s*)?(site|website|plugin|theme)/,
      /audit\s*(the\s*)?(site|website)/,
      /look\s*into\s*(it|the\s*site|the\s*issue)/,
      /what('?s|\s+is)\s*(wrong|the\s*issue|the\s*problem)/,
      /check\s*(the\s*)?(plugin|theme|error|conflict)/,
      /analyze\s*(the\s*)?(site|website|issue)/,
    ].some((p) => p.test(t))
  }

  async function handleAsk() {
    if (!resolvedTicketId || !askInput.trim() || asking) return
    const question = askInput.trim()
    setAskInput('')
    setAsking(true)

    try {
      if (isInvestigationRequest(question)) {
        // Route to investigator agent instead of plain Q&A
        await investigate(resolvedTicketId)
      } else {
        const id = `ask-${Date.now()}`
        addMessage({ id, ticketId: resolvedTicketId, text: '', received: new Date().toISOString(), type: 'answer', loading: true })
        try {
          const answer = await askAI(resolvedTicketId, question)
          updateMessage(resolvedTicketId, id, { text: answer, loading: false })
        } catch {
          updateMessage(resolvedTicketId, id, { text: 'Failed to get an answer. Please try again.', loading: false })
        }
      }
    } finally {
      setAsking(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ChatSidebar />

      {/* Center column */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'transparent',
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
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {callUrl && (
                  <a
                    href={callUrl}
                    title="Hop on a call"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'rgba(52,211,153,0.1)',
                      border: '1px solid rgba(52,211,153,0.3)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-success)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      padding: '5px 10px',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)' }}
                  >
                    📞 Call
                  </a>
                )}
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
            <ConversationThread messages={activeConvo.messages} aiMessages={activeAIMessages} />
            {resolvedTicketId && <CoachPanel ticketId={resolvedTicketId} />}

            {/* Ask Auxly inline input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '6px var(--space-4)',
              borderTop: '1px solid rgba(99,102,241,0.12)',
              background: 'rgba(99,102,241,0.04)',
            }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'rgba(129,140,248,0.7)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>✦</span>
              <input
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
                placeholder="Ask Auxly anything about this ticket…"
                disabled={asking}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-sans)',
                  opacity: asking ? 0.5 : 1,
                }}
              />
              {asking && <MatrixReveal label="Reading intent…" />}
            </div>

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
      {resolvedTicketId && <RightSidebar ticketId={resolvedTicketId} />}
    </div>
  )
}
