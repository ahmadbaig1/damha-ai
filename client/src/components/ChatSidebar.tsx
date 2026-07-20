import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTicketStore, COMPLETED_STATUSES } from '../store/ticketStore'

export function ChatSidebar() {
  const { id: activeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tickets, ticketsLoading, loadTickets, hideTicket, hiddenIds } = useTicketStore()
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => { loadTickets() }, [loadTickets])

  const activeTickets = tickets.filter(
    (t) => !COMPLETED_STATUSES.includes(t.status) && !hiddenIds.includes(t.id),
  )
  const completedTickets = tickets.filter(
    (t) => COMPLETED_STATUSES.includes(t.status) || hiddenIds.includes(t.id),
  )
  const displayTickets = showCompleted ? completedTickets : activeTickets

  const STATUS_DOT: Record<string, string> = {
    open:    'var(--color-success)',
    new:     'var(--color-accent)',
    pending: '#f59e0b',
    hold:    '#8b5cf6',
    solved:  'var(--color-text-secondary)',
    closed:  'var(--color-text-secondary)',
  }

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
      {/* Header */}
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
          color: showCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {showCompleted ? 'Completed' : 'Live Chats'}
        </span>
        {ticketsLoading && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', opacity: 0.5 }}>…</span>
        )}
        {!showCompleted && activeTickets.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-accent)',
            borderRadius: 100,
            padding: '1px 6px',
          }}>
            {activeTickets.length}
          </span>
        )}
      </div>

      {/* Ticket list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayTickets.length === 0 && !ticketsLoading && (
          <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {showCompleted ? 'No completed interactions' : 'No active chats'}
          </div>
        )}

        {displayTickets.map((ticket) => {
          const isActive = String(ticket.id) === activeId
          return (
            <div
              key={ticket.id}
              style={{ position: 'relative' }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector<HTMLButtonElement>('.hide-btn')
                if (btn) btn.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector<HTMLButtonElement>('.hide-btn')
                if (btn) btn.style.opacity = '0'
              }}
            >
              <button
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  paddingRight: 'var(--space-8)',
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
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  fontSize: 'var(--text-sm)',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  fontWeight: isActive ? 600 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}>
                  {ticket.subject}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: STATUS_DOT[ticket.status] ?? 'var(--color-text-secondary)',
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

              {/* Remove button — only on active view */}
              {!showCompleted && (
                <button
                  className="hide-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    hideTicket(ticket.id)
                    if (isActive) navigate('/tickets')
                  }}
                  title="Remove from list"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 12,
                    lineHeight: 1,
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: 0,
                    transition: 'opacity 0.15s, background 0.15s',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Completed toggle at bottom */}
      <div style={{ borderTop: '1px solid var(--glass-border)', padding: 'var(--space-2)' }}>
        <button
          onClick={() => setShowCompleted((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '8px var(--space-3)',
            background: showCompleted ? 'var(--color-accent-subtle)' : 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: showCompleted ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: showCompleted ? 600 : 400,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { if (!showCompleted) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={(e) => { if (!showCompleted) e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: 11 }}>✓</span>
          <span>Completed interactions</span>
          {completedTickets.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              background: showCompleted ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
              color: showCompleted ? '#fff' : 'var(--color-text-secondary)',
              borderRadius: 100,
              padding: '1px 6px',
            }}>
              {completedTickets.length}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
