import { useState } from 'react'
import { useInvestigatorStore, Finding, CritiqueFinding } from '../store/investigatorStore'
import { KBSuggestModal } from './KBSuggestModal'
import { RaiseIssueModal } from './RaiseIssueModal'

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

const SOURCE_COLOR: Record<string, string> = {
  article: 'var(--color-accent)',
  url: 'var(--color-warning)',
  file: 'var(--color-success)',
  email: '#a78bfa',
}

const CRITIQUE_VERDICT_COLOR: Record<CritiqueFinding['verdict'], string> = {
  'well-grounded': 'var(--color-success)',
  'overstated': 'var(--color-warning)',
  'unsupported': '#f97316',
  'contradicted': 'var(--color-danger)',
}

const CRITIQUE_VERDICT_SYMBOL: Record<CritiqueFinding['verdict'], string> = {
  'well-grounded': '✓',
  'overstated': '~',
  'unsupported': '?',
  'contradicted': '✗',
}

const RESOLUTION_COLOR: Record<string, string> = {
  upheld: 'var(--color-success)',
  overruled: 'var(--color-danger)',
  'partially-accepted': 'var(--color-warning)',
}

interface Props {
  ticketId: number
}

export function InvestigatorPanel({ ticketId }: Props) {
  const { reports, investigationIds, loading, errors, challenge, challenging } = useInvestigatorStore()
  const [showKBModal, setShowKBModal] = useState(false)
  const [showRaiseModal, setShowRaiseModal] = useState(false)
  const [challengeText, setChallengeText] = useState('')
  const [showChallenge, setShowChallenge] = useState(false)
  const [showDebate, setShowDebate] = useState(false)

  const isLoading = loading[ticketId]
  const isChallenging = challenging[ticketId]
  const error = errors[ticketId]
  const report = reports[ticketId]
  const investigationId = investigationIds[ticketId]

  if (!isLoading && !error && !report) return null

  async function handleChallenge() {
    if (!challengeText.trim()) return
    await challenge(ticketId, challengeText)
    setChallengeText('')
    setShowChallenge(false)
  }

  return (
    <>
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
            investigating · critiquing · arbitrating…
          </p>
        )}

        {error && (
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</p>
        )}

        {report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Confirmed bug banner */}
            {report.issueSeverity === 'confirmed-bug' && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-2)', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  CONFIRMED BUG
                </span>
                <button onClick={() => setShowRaiseModal(true)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '3px 8px', cursor: 'pointer' }}>
                  Raise Issue
                </button>
              </div>
            )}

            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.55 }}>
              {report.summary}
            </p>

            {report.findings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {report.findings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: STATUS_COLOR[f.status], fontFamily: 'var(--font-mono)', flexShrink: 0, width: 10, textAlign: 'center', paddingTop: 1 }}>
                      {STATUS_SYMBOL[f.status]}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{f.area}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', marginLeft: 4 }}>{f.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderLeft: '2px solid var(--color-accent)', background: 'var(--color-accent-subtle)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: 'var(--space-2)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>Hypothesis</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{report.hypothesis}</div>
            </div>

            {report.recommended_steps.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Steps</div>
                <ol style={{ margin: 0, paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {report.recommended_steps.map((step, i) => (
                    <li key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* KB Citations */}
            {report.citations && report.citations.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  KB Sources Used
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {report.citations.map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: SOURCE_COLOR[c.source_type] ?? 'var(--color-text-secondary)', background: `${SOURCE_COLOR[c.source_type] ?? 'rgba(255,255,255,0.1)'}22`, border: `1px solid ${SOURCE_COLOR[c.source_type] ?? 'rgba(255,255,255,0.1)'}44`, borderRadius: 100, padding: '1px 6px', flexShrink: 0, textTransform: 'uppercase' }}>
                        {c.source_type}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.source_ref
                            ? <a href={c.source_ref} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>{c.title}</a>
                            : c.title}
                        </div>
                        {c.snippet && (
                          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {c.snippet}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Debate */}
            {(report.critique || report.arbiterVerdict) && (
              <div>
                <button
                  onClick={() => setShowDebate((v) => !v)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 500, fontFamily: 'var(--font-mono)', padding: '5px', cursor: 'pointer', textAlign: 'center', width: '100%' }}
                >
                  {showDebate ? '▲' : '▼'} Agent Debate
                </button>

                {showDebate && (
                  <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                    {/* Critic section */}
                    {report.critique && (
                      <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#f97316', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Critic
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {report.critique.overallAssessment}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {report.critique.critiques.map((c, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: CRITIQUE_VERDICT_COLOR[c.verdict], fontFamily: 'var(--font-mono)', flexShrink: 0, width: 10, textAlign: 'center', paddingTop: 1 }}>
                                {CRITIQUE_VERDICT_SYMBOL[c.verdict]}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <span style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--color-text-primary)' }}>"{c.claim}"</span>
                                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', display: 'block', marginTop: 1, lineHeight: 1.4 }}>{c.reasoning}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {report.critique.alternativeHypothesis && (
                          <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(249,115,22,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', color: '#f97316', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Alt: </span>
                            {report.critique.alternativeHypothesis}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Arbiter section */}
                    {report.arbiterVerdict && (
                      <div style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.18)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Arbiter
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {report.arbiterVerdict.reasoning}
                        </p>
                        {report.arbiterVerdict.addressedCritiques.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {report.arbiterVerdict.addressedCritiques.map((a, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: RESOLUTION_COLOR[a.resolution] ?? 'var(--color-text-secondary)', background: `${RESOLUTION_COLOR[a.resolution] ?? 'rgba(255,255,255,0.1)'}22`, border: `1px solid ${RESOLUTION_COLOR[a.resolution] ?? 'rgba(255,255,255,0.1)'}44`, borderRadius: 100, padding: '1px 6px', flexShrink: 0, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                  {a.resolution}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <span style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--color-text-primary)' }}>"{a.claim}"</span>
                                  <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', display: 'block', marginTop: 1, lineHeight: 1.4 }}>{a.explanation}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {/* Challenge / Contest */}
            {!showChallenge ? (
              <button
                onClick={() => setShowChallenge(true)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 500, fontFamily: 'var(--font-mono)', padding: '5px', cursor: 'pointer', textAlign: 'center' }}
              >
                ↩ Challenge this assessment
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <textarea
                  value={challengeText}
                  onChange={(e) => setChallengeText(e.target.value)}
                  placeholder="Explain what you think is wrong or provide additional context…"
                  rows={3}
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: 'var(--text-xs)', padding: 'var(--space-2)', outline: 'none', resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--font-sans)', width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    onClick={handleChallenge}
                    disabled={isChallenging || !challengeText.trim()}
                    style={{ flex: 1, background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 600, padding: '7px', cursor: isChallenging ? 'wait' : 'pointer', opacity: isChallenging ? 0.7 : 1 }}
                  >
                    {isChallenging ? 'Re-evaluating…' : 'Submit Challenge'}
                  </button>
                  <button onClick={() => { setShowChallenge(false); setChallengeText('') }} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', padding: '7px 12px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {(report.confidence === 'high' || report.confidence === 'medium') && (
              <button onClick={() => setShowKBModal(true)} style={{ background: 'transparent', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent)', fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '6px', cursor: 'pointer', textAlign: 'center' }}>
                ✦ Suggest KB Article
              </button>
            )}
          </div>
        )}
      </div>

      {showKBModal && report && <KBSuggestModal report={report} onClose={() => setShowKBModal(false)} />}
      {showRaiseModal && report && <RaiseIssueModal report={report} investigationId={investigationId} onClose={() => setShowRaiseModal(false)} />}
    </>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--glass-bg-heavy)', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)',
  boxShadow: 'var(--shadow-glass)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
}
