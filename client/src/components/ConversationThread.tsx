import { useEffect, useRef } from 'react'
import { ConversationMessage } from '../api/tickets'
import { AIMessage } from '../store/aiMessagesStore'

interface Props {
  messages: ConversationMessage[]
  aiMessages: AIMessage[]
}

type TimelineItem =
  | { kind: 'real'; msg: ConversationMessage }
  | { kind: 'ai'; msg: AIMessage }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Lightweight inline markdown renderer (bold, bullets, line breaks)
function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const isBullet = line.startsWith('- ') || line.startsWith('• ')
    const content = isBullet ? line.slice(2) : line

    const parts = content.split(/(\*\*[^*]+\*\*)/)
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      return <span key={j}>{part}</span>
    })

    if (isBullet) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: i > 0 ? 3 : 0 }}>
          <span style={{ opacity: 0.5, flexShrink: 0 }}>·</span>
          <span>{rendered}</span>
        </div>
      )
    }
    if (line === '') return <div key={i} style={{ height: 6 }} />
    return <div key={i} style={{ marginTop: i > 0 ? 2 : 0 }}>{rendered}</div>
  })
}

const AI_TYPE_LABEL: Record<AIMessage['type'], string> = {
  summary: 'Investigation',
  answer: 'Answer',
  challenge: 'Re-assessment',
}

export function ConversationThread({ messages, aiMessages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiMessages])

  // Merge and sort all items by time
  const items: TimelineItem[] = [
    ...messages
      .filter((m) => m.text?.trim())
      .map((m): TimelineItem => ({ kind: 'real', msg: m })),
    ...aiMessages.map((m): TimelineItem => ({ kind: 'ai', msg: m })),
  ].sort((a, b) =>
    new Date(a.msg.received).getTime() - new Date(b.msg.received).getTime()
  )

  if (items.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
      }}>
        No messages yet
      </div>
    )
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 'var(--space-4) var(--space-5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
    }}>
      {items.map((item) => {
        if (item.kind === 'ai') {
          const m = item.msg
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'rgba(129,140,248,0.7)',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>✦ Auxly</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'rgba(129,140,248,0.15)',
                  color: 'rgba(129,140,248,0.9)',
                  borderRadius: 100,
                  padding: '1px 6px',
                }}>
                  {AI_TYPE_LABEL[m.type]}
                </span>
                <span style={{ opacity: 0.5 }}>{formatTime(m.received)}</span>
              </div>
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderLeft: '3px solid rgba(129,140,248,0.6)',
                borderRadius: '0 12px 12px 12px',
                padding: '10px 14px',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
                color: 'var(--color-text-primary)',
                maxWidth: '85%',
              }}>
                {m.loading
                  ? <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Thinking…</span>
                  : renderMarkdown(m.text)
                }
              </div>
            </div>
          )
        }

        const m = item.msg
        const isCustomer = m.role === 'customer'

        return (
          <div key={m.id} style={{ display: 'flex', justifyContent: isCustomer ? 'flex-start' : 'flex-end' }}>
            <div style={{ maxWidth: '70%' }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                marginBottom: 4,
                textAlign: isCustomer ? 'left' : 'right',
                fontFamily: 'var(--font-mono)',
              }}>
                {m.authorName ?? (isCustomer ? 'Customer' : 'Agent')}
                {' · '}
                {formatTime(m.received)}
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: isCustomer ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                background: isCustomer ? 'var(--color-surface)' : 'var(--color-accent)',
                boxShadow: isCustomer ? 'var(--shadow-sm)' : '0 2px 8px rgba(99,102,241,0.25)',
                color: isCustomer ? 'var(--color-text-primary)' : '#ffffff',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.55,
              }}>
                {m.text}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
