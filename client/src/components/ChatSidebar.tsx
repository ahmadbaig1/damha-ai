import { useEffect } from 'react'
import { useTicketStore } from '../store/ticketStore'

export function ChatSidebar() {
  const { tickets, activeTicketId, ticketsLoading, loadTickets, selectTicket } = useTicketStore()

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  return (
    <aside style={{
      width: 248,
      flexShrink: 0,
      background: 'var(--glass-bg-heavy)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          Live Chats
        </span>
        {ticketsLoading && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', opacity: 0.5 }}>…</span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tickets.length === 0 && !ticketsLoading && (
          <div style={{
            padding: 'var(--space-4)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
          }}>
            No active chats
          </div>
        )}

        {tickets.map((ticket) => {
          const isActive = ticket.id === activeTicketId
          return (
            <button
              key={ticket.id}
              onClick={() => selectTicket(ticket.id)}
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                border: 'none',
                borderRadius: 0,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{
                fontSize: 'var(--text-sm)',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                fontWeight: isActive ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {ticket.subject}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: ticket.status === 'open' ? 'var(--color-success)' : 'var(--color-text-secondary)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  #{ticket.id} · {ticket.status}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
