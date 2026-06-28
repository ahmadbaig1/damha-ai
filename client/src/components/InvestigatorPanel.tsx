import { useInvestigatorStore, Finding } from '../store/investigatorStore'

const STATUS_COLOR: Record<Finding['status'], string> = {
  pass: 'var(--color-success)',
  warning: 'var(--color-warning)',
  fail: 'var(--color-danger)',
  unknown: 'var(--color-text-secondary)',
}

const STATUS_SYMBOL: Record<Finding['status'], string> = {
  pass: '✓',
  warning: '⚠',
  fail: '✗',
  unknown: '?',
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-warning)',
  low: 'var(--color-text-secondary)',
}

interface Props {
  ticketId: number
}

export function InvestigatorPanel({ ticketId }: Props) {
  const { reports, loading, errors } = useInvestigatorStore()

  const isLoading = loading[ticketId]
  const error = errors[ticketId]
  const report = reports[ticketId]

  if (!isLoading && !error && !report) return null

  return (
    <div style={cardStyle}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isLoading || error ? 0 : 'var(--space-2)',
      }}>
        <span style={labelStyle}>Investigation</span>
        {report && (
          <span style={{
            fontSize: 'var(--text-xs)',
            color: CONFIDENCE_COLOR[report.confidence],
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {report.confidence}
          </span>
        )}
      </div>

      {isLoading && (
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          checking site · fetching plugins…
        </p>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</p>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Summary */}
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.55 }}>
            {report.summary}
          </p>

          {/* Findings */}
          {report.findings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {report.findings.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: STATUS_COLOR[f.status],
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                    width: 10,
                    textAlign: 'center',
                    paddingTop: 1,
                  }}>
                    {STATUS_SYMBOL[f.status]}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {f.area}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', marginLeft: 4 }}>
                      {f.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hypothesis */}
          <div style={{
            borderLeft: '2px solid var(--color-accent)',
            background: 'var(--color-accent-subtle)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            padding: 'var(--space-2)',
          }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
              Hypothesis
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
              {report.hypothesis}
            </div>
          </div>

          {/* Recommended steps */}
          {report.recommended_steps.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Next Steps
              </div>
              <ol style={{ margin: 0, paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {report.recommended_steps.map((step, i) => (
                  <li key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--glass-bg-heavy)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-3)',
  boxShadow: 'var(--shadow-glass)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}
