import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { InvestigationReport } from '../store/investigatorStore'
import { useIntegrationsStore } from '../store/integrationsStore'

interface Props {
  report: InvestigationReport
  investigationId?: string
  onClose: () => void
}

export function RaiseIssueModal({ report, investigationId, onClose }: Props) {
  const { status, fetchStatus, raiseGitHub, raiseLinear, raising } = useIntegrationsStore()
  const [title, setTitle] = useState(report.suggestedIssueTitle)
  const [body, setBody] = useState(report.suggestedIssueBody)
  const [issueUrl, setIssueUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchStatus() }, [])

  async function handleRaise(provider: 'github' | 'linear') {
    setError(null)
    try {
      const url = provider === 'github'
        ? await raiseGitHub(title, body, investigationId)
        : await raiseLinear(title, body, investigationId)
      setIssueUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise issue')
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        width: '100%', maxWidth: 600,
        background: 'rgba(255,255,255,0.09)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
            ⚠ Raise Bug Issue
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {issueUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-4) 0' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>✓ Issue raised</span>
            <a href={issueUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)' }}>
              View Issue ↗
            </a>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {status?.github && (
                <button
                  onClick={() => handleRaise('github')}
                  disabled={raising}
                  style={raiseBtn}
                >
                  {raising ? 'Raising…' : 'Raise on GitHub'}
                </button>
              )}
              {status?.linear && (
                <button
                  onClick={() => handleRaise('linear')}
                  disabled={raising}
                  style={{ ...raiseBtn, background: 'rgba(100,50,220,0.7)' }}
                >
                  {raising ? 'Raising…' : 'Raise on Linear'}
                </button>
              )}
              {!status?.github && !status?.linear && (
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  No integrations configured. Add GITHUB_TOKEN or LINEAR_API_KEY to .env.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-2) var(--space-3)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
}

const raiseBtn: React.CSSProperties = {
  flex: 1,
  background: 'rgba(239,68,68,0.2)',
  border: '1px solid rgba(239,68,68,0.4)',
  color: 'var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  padding: '9px',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  cursor: 'pointer',
}
