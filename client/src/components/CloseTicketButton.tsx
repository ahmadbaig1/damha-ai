import { useState, useRef, useEffect } from 'react'
import { updateTicket } from '../api/tickets'
import { useTicketStore } from '../store/ticketStore'

type Status = 'open' | 'pending' | 'hold' | 'solved'

interface Props {
  ticketId: number
}

const OPTIONS: { status: Status; label: string; description: string; color: string }[] = [
  { status: 'open',    label: 'Submit as Open',     description: 'Keep ticket open',               color: 'var(--color-accent)' },
  { status: 'pending', label: 'Submit as Pending',   description: 'Awaiting customer response',     color: 'var(--color-warning)' },
  { status: 'hold',    label: 'Submit as On-hold',   description: 'Waiting on a third party',       color: '#a78bfa' },
  { status: 'solved',  label: 'Submit as Solved',    description: 'Issue resolved',                 color: 'var(--color-success)' },
]

const STATUS_LABEL: Record<Status, string> = {
  open: '● Open',
  pending: '⏸ Pending',
  hold: '⏳ On-hold',
  solved: '✓ Solved',
}

export function CloseTicketButton({ ticketId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<Status | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const { loadTickets } = useTicketStore()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSelect(status: Status) {
    setOpen(false)
    setLoading(true)
    try {
      await updateTicket(ticketId, { status })
      setDone(status)
      loadTickets()
    } catch {
      // silent — ticket may already be in that state
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    const opt = OPTIONS.find((o) => o.status === done)!
    return (
      <span style={{
        fontSize: 'var(--text-xs)',
        fontFamily: 'var(--font-mono)',
        color: opt.color,
        fontWeight: 600,
      }}>
        {STATUS_LABEL[done]}
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
          background: open ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: loading ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          padding: '5px 10px',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = 'var(--color-border)' }}
      >
        {loading ? 'Submitting…' : 'Submit'}
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
          background: 'rgba(12,12,28,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          minWidth: 210,
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
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: opt.color }}>
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
