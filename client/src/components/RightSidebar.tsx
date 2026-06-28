import { MoodWidget } from './MoodWidget'
import { InvestigatorPanel } from './InvestigatorPanel'

interface Props {
  ticketId: number
}

export function RightSidebar({ ticketId }: Props) {
  return (
    <div style={{
      width: 280,
      flexShrink: 0,
      borderLeft: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      overflowY: 'auto',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.04)',
    }}>
      <MoodWidget ticketId={ticketId} />
      <InvestigatorPanel ticketId={ticketId} />
    </div>
  )
}
