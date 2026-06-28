import { useEffect, useRef } from 'react'
import { SmoochMessage } from '../api/tickets'

interface Props {
  messages: SmoochMessage[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function messageText(msg: SmoochMessage): string | null {
  if (msg.content.type === 'text') return msg.content.text ?? null
  if (msg.content.type === 'formResponse') return msg.content.textFallback ?? null
  return null
}

export function ConversationThread({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const visible = messages.filter((m) => messageText(m) !== null)

  if (visible.length === 0) {
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
      {visible.map((msg) => {
        const isUser = msg.author.type === 'user'
        const text = messageText(msg)!

        return (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-start' : 'flex-end',
          }}>
            <div style={{ maxWidth: '70%' }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                marginBottom: 4,
                textAlign: isUser ? 'left' : 'right',
                fontFamily: 'var(--font-mono)',
              }}>
                {msg.author.displayName ?? (isUser ? 'Customer' : 'Agent')}
                {' · '}
                {formatTime(msg.received)}
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: isUser
                  ? '4px 16px 16px 16px'
                  : '16px 4px 16px 16px',
                background: isUser
                  ? 'var(--color-surface)'
                  : 'var(--color-accent)',
                boxShadow: isUser
                  ? 'var(--shadow-sm)'
                  : '0 2px 8px rgba(99,102,241,0.25)',
                color: isUser ? 'var(--color-text-primary)' : '#ffffff',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.55,
              }}>
                {text}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
