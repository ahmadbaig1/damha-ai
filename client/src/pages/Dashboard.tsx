import { useEffect } from 'react'
import { useDashboardStore } from '../store/dashboardStore'
import { useAuthStore } from '../store/authStore'

function moodColor(score: number): string {
  const r1 = [239, 68, 68], mid = [249, 115, 22], r2 = [99, 102, 241]
  let r: number, g: number, b: number
  if (score <= 50) {
    const t = score / 50
    r = Math.round(r1[0] + (mid[0] - r1[0]) * t)
    g = Math.round(r1[1] + (mid[1] - r1[1]) * t)
    b = Math.round(r1[2] + (mid[2] - r1[2]) * t)
  } else {
    const t = (score - 50) / 50
    r = Math.round(mid[0] + (r2[0] - mid[0]) * t)
    g = Math.round(mid[1] + (r2[1] - mid[1]) * t)
    b = Math.round(mid[2] + (r2[2] - mid[2]) * t)
  }
  return `rgb(${r},${g},${b})`
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { overview, loading, error, fetch } = useDashboardStore()

  useEffect(() => { fetch() }, [])

  if (user?.role !== 'lead') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Dashboard is available to team leads only.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{error}</p>
      </div>
    )
  }

  if (!overview) return null

  const maxInvCount = Math.max(...overview.investigationsByType.map((x) => x.count), 1)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'var(--space-8) var(--space-6)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Team Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Systemic patterns, mood trends, and investigation history.
          </p>
        </div>

        {/* Systemic Alerts */}
        {overview.systemicAlerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <SectionLabel>Systemic Alerts (last 7 days)</SectionLabel>
            {overview.systemicAlerts.map((alert) => (
              <div key={alert.issue_type} style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {alert.issue_type}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                  {alert.count} cases in the last 7 days
                </span>
              </div>
            ))}
          </div>
        )}
        {overview.systemicAlerts.length === 0 && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>No systemic patterns detected this week.</span>
          </div>
        )}

        {/* Investigations by type */}
        <Card>
          <SectionLabel>Investigations by Type</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            {overview.investigationsByType.length === 0 && (
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>No data yet.</p>
            )}
            {overview.investigationsByType.map((row) => (
              <div key={row.issue_type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', width: 120, flexShrink: 0 }}>
                  {row.issue_type}
                </span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(row.count / maxInvCount) * 100}%`,
                    background: 'var(--color-accent)',
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', width: 24, textAlign: 'right' }}>
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Mood trend + Coach score */}
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <Card style={{ flex: 2 }}>
            <SectionLabel>Mood Trend (30 days)</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, marginTop: 'var(--space-3)' }}>
              {overview.moodDistribution.length === 0 && (
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>No mood data yet.</p>
              )}
              {overview.moodDistribution.map((day) => (
                <div
                  key={day.day}
                  title={`${day.day}: ${day.avg_score}`}
                  style={{
                    flex: 1,
                    minWidth: 4,
                    height: `${day.avg_score}%`,
                    background: moodColor(day.avg_score),
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
          </Card>

          <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <SectionLabel>Avg Coach Score</SectionLabel>
            <span style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: overview.avgCoachScore !== null ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              lineHeight: 1,
              marginTop: 'var(--space-3)',
            }}>
              {overview.avgCoachScore !== null ? overview.avgCoachScore : '—'}
            </span>
          </Card>
        </div>

        {/* Recent investigations */}
        <Card>
          <SectionLabel>Recent Investigations</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            {overview.recentInvestigations.length === 0 && (
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>No investigations yet.</p>
            )}
            {overview.recentInvestigations.map((inv) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                  #{inv.zendesk_ticket_id}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 600 }}>
                  {inv.issue_type ?? 'other'}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {inv.confidence}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(inv.created_at).toLocaleDateString()}
                </span>
                {inv.raised_issue_url && (
                  <a href={inv.raised_issue_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--color-accent)' }}>
                    ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      ...style,
    }}>
      {children}
    </div>
  )
}
