import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { sendReply, getDraftReply, composeMessage } from '../api/tickets'
import { useTicketStore } from '../store/ticketStore'
import { useCoachStore } from '../store/coachStore'
import { useInvestigatorStore } from '../store/investigatorStore'

interface Props {
  ticketId: number
  conversationId: string
}

type ComposerState = 'idle' | 'sending' | 'analyzing' | 'drafting'
type DraftSource = 'instruction' | 'polished' | null

export function ReplyComposer({ ticketId, conversationId }: Props) {
  const [text, setText] = useState('')
  const [state, setState] = useState<ComposerState>('idle')
  const [draftSource, setDraftSource] = useState<DraftSource>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { refreshMessages, pendingDrafts, clearPendingDraft } = useTicketStore()
  const fetchSuggestion = useCoachStore((s) => s.fetchSuggestion)
  const { reports: investigationReports } = useInvestigatorStore()
  const investigationReport = investigationReports[ticketId]

  // Consume auto-generated greeting draft when composer is empty
  useEffect(() => {
    const pending = pendingDrafts[ticketId]
    if (pending && !text) {
      setText(pending)
      clearPendingDraft(ticketId)
    }
  }, [ticketId, pendingDrafts])

  // Clear badge when user edits the text
  useEffect(() => {
    if (draftSource) setDraftSource(null)
  }, [text])

  async function doSend(message: string) {
    setState('sending')
    try {
      await sendReply(ticketId, conversationId, message)
      setText('')
      setDraftSource(null)
      await refreshMessages(ticketId)
      fetchSuggestion(ticketId)
    } finally {
      setState('idle')
    }
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || state !== 'idle') return

    // Already reviewed a draft — send directly without re-classifying
    if (draftSource) {
      await doSend(trimmed)
      return
    }

    // Smart compose: classify + polish
    setState('analyzing')
    try {
      const result = await composeMessage(ticketId, trimmed)
      if (result.type === 'direct' && !result.polished) {
        // Already warm and correct — send immediately
        await doSend(trimmed)
      } else {
        // Show polished/drafted text for review
        setText(result.draft)
        setDraftSource(result.type === 'instruction' ? 'instruction' : 'polished')
        setState('idle')
        setTimeout(() => textareaRef.current?.focus(), 50)
      }
    } catch {
      // On failure, fall back to sending as-is
      await doSend(trimmed)
    }
  }

  async function handleDraft() {
    if (state !== 'idle') return
    setState('drafting')
    try {
      const draft = await getDraftReply(ticketId, investigationReport)
      setText(draft)
      setDraftSource(null)
    } finally {
      setState('idle')
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const busy = state !== 'idle'
  const canSend = !!text.trim() && !busy

  const sendLabel = {
    idle: draftSource ? 'Send' : 'Send',
    analyzing: 'Thinking…',
    drafting: 'Drafting…',
    sending: 'Sending…',
  }[state]

  return (
    <div style={{
      borderTop: '1px solid var(--glass-border)',
      padding: 'var(--space-3) var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      background: 'var(--glass-bg-heavy)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
    }}>
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message, or give an instruction like 'apologize for the delay'…"
          rows={3}
          disabled={busy}
          style={{
            background: draftSource ? 'rgba(99,102,241,0.04)' : 'var(--color-surface)',
            border: `1px solid ${draftSource ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-3)',
            paddingRight: draftSource ? 100 : 'var(--space-3)',
            resize: 'none',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            lineHeight: 1.55,
            boxShadow: 'var(--shadow-xs)',
            transition: 'border-color 0.2s, background 0.2s, box-shadow 0.15s',
            opacity: busy ? 0.7 : 1,
          }}
          onFocus={(e) => {
            if (!draftSource) {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1), var(--shadow-xs)'
            }
          }}
          onBlur={(e) => {
            if (!draftSource) {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.boxShadow = 'var(--shadow-xs)'
            }
          }}
        />

        {/* Badge — shows draft source inside the textarea */}
        {draftSource && (
          <span style={{
            position: 'absolute',
            top: 8,
            right: 10,
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: draftSource === 'polished' ? 'var(--color-success)' : 'var(--color-accent)',
            background: draftSource === 'polished' ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.1)',
            border: `1px solid ${draftSource === 'polished' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
            borderRadius: 4,
            padding: '2px 6px',
            pointerEvents: 'none',
            letterSpacing: '0.03em',
          }}>
            {draftSource === 'polished' ? '✦ polished' : '✦ AI draft'}
          </span>
        )}

        {/* Analyzing overlay */}
        {state === 'analyzing' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ✦ reading intent…
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {/* Hint */}
        <span style={{
          fontSize: 10,
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
          opacity: 0.6,
          flex: 1,
        }}>
          {draftSource === 'polished'
            ? 'Tone was adjusted — review above, then send.'
            : draftSource === 'instruction'
              ? 'Review the draft above, edit if needed, then send.'
              : '⌘↵ send · rude or broken messages are auto-polished'}
        </span>

        <button
          onClick={handleDraft}
          disabled={busy}
          style={{
            background: 'transparent',
            color: state === 'drafting' ? 'var(--color-text-secondary)' : 'var(--color-accent)',
            border: '1px solid',
            borderColor: state === 'drafting' ? 'var(--color-border)' : 'rgba(99,102,241,0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '7px var(--space-3)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.5 : 1,
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {state === 'drafting' ? 'Drafting…' : '✦ AI Draft'}
        </button>

        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background: canSend ? 'var(--color-accent)' : 'var(--color-border)',
            color: canSend ? '#fff' : 'var(--color-text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '7px var(--space-4)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: canSend ? 'pointer' : 'not-allowed',
            boxShadow: canSend ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
            transition: 'background 0.15s, box-shadow 0.15s',
            minWidth: 76,
          }}
        >
          {sendLabel}
        </button>
      </div>
    </div>
  )
}
