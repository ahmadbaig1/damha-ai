import { useInvestigationHistoryStore } from '../store/investigationHistoryStore'

interface Props {
  ticketId: number
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-warning)',
  low: 'var(--color-text-secondary)',
}

export function InvestigationHistory({ ticketId }: Props) {
  const { history, loading } = useInvestigationHistoryStore()
  const items = history[ticketId]
  const isLoading = loading[ticketId]

  if (!isLoading && (!items || items.length === 0)) return null

  return (
    <div style={{
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
    }}>
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        Prior Cases
      </span>

      {isLoading && (
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          checking history…
        </p>
      )}

      {items?.map((item) => (
        <div key={item.id} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: 'var(--space-2)',
          background: 'var(--glass-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--glass-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-accent)',
              fontWeight: 600,
            }}>
              {item.issue_type ?? 'other'}
            </span>
            {item.zendesk_ticket_id && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                #{item.zendesk_ticket_id}
              </span>
            )}
            {item.confidence && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: CONFIDENCE_COLOR[item.confidence] ?? 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {item.confidence}
              </span>
            )}
          </div>
          {item.summary && (
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              {item.summary}
            </p>
          )}
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}
