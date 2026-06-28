import { useState, useRef, useEffect } from 'react'
import { closeTicket } from '../api/tickets'
import { useTicketStore } from '../store/ticketStore'

interface Props {
  ticketId: number
}

const OPTIONS = [
  { status: 'pending' as const, label: 'Close as Pending', description: 'Awaiting customer response' },
  { status: 'solved' as const, label: 'Close as Solved', description: 'Issue resolved' },
]

export function CloseTicketButton({ ticketId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'pending' | 'solved' | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const { loadTickets } = useTicketStore()

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSelect(status: 'pending' | 'solved') {
    setOpen(false)
    setLoading(true)
    try {
      await closeTicket(ticketId, status)
      setDone(status)
      loadTickets() // refresh sidebar
    } catch {
      // silent — ticket may already be in that state
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span style={{
        fontSize: 'var(--text-xs)',
        fontFamily: 'var(--font-mono)',
        color: done === 'solved' ? 'var(--color-success)' : 'var(--color-warning)',
        fontWeight: 600,
      }}>
        {done === 'solved' ? '✓ Solved' : '⏸ Pending'}
      </span>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: open ? 'rgba(0,0,0,0.05)' : 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: loading ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          padding: '5px 10px',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = 'var(--color-border)' }}
      >
        {loading ? 'Closing…' : 'Close'}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          zIndex: 100,
          background: 'var(--glass-bg-heavy)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          minWidth: 180,
        }}>
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.status}
              onClick={() => handleSelect(opt.status)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderTop: i > 0 ? '1px solid var(--glass-border)' : 'none',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
