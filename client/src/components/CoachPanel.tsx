import { useCoachStore } from '../store/coachStore'

const TYPE_CONFIG = {
  empathy: { label: 'Empathy', color: 'var(--color-warning)' },
  efficiency: { label: 'Efficiency', color: 'var(--color-accent)' },
  positive: { label: 'Positive', color: 'var(--color-success)' },
}

interface Props {
  ticketId: number
}

export function CoachPanel({ ticketId }: Props) {
  const { suggestions, dismissed, loading, dismiss } = useCoachStore()

  const isLoading = loading[ticketId]
  const suggestion = suggestions[ticketId]
  const isDismissed = dismissed[ticketId]

  if (isLoading) {
    return (
      <div style={wrapperStyle('var(--color-border)')}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          coach thinking…
        </span>
      </div>
    )
  }

  if (!suggestion?.suggestion || isDismissed) return null

  const config = TYPE_CONFIG[suggestion.type!] ?? TYPE_CONFIG.efficiency

  return (
    <div style={wrapperStyle(config.color)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', flex: 1 }}>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: config.color,
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
          paddingTop: 1,
        }}>
          {config.label}
        </span>
        <span style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.45,
        }}>
          {suggestion.suggestion}
        </span>
      </div>
      <button
        onClick={() => dismiss(ticketId)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '0 var(--space-1)',
          flexShrink: 0,
          opacity: 0.6,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

function wrapperStyle(accentColor: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    borderTop: '1px solid var(--glass-border)',
    borderLeft: `3px solid ${accentColor}`,
    background: 'var(--glass-bg-heavy)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
  }
}
