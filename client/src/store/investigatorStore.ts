import { create } from 'zustand'
import { requestInvestigation, challengeInvestigation } from '../api/investigate'
import { useAIMessagesStore } from './aiMessagesStore'

const CONFIDENCE_LABEL: Record<string, string> = { low: '🟡 Low', medium: '🟠 Medium', high: '🔴 High' }
const STATUS_ICON: Record<string, string> = { pass: '✓', warning: '⚠', fail: '✗', unknown: '?' }

function buildSummaryText(report: InvestigationReport): string {
  const topFindings = report.findings
    .filter((f) => f.status !== 'pass')
    .slice(0, 3)
    .map((f) => `${STATUS_ICON[f.status]} **${f.area}**: ${f.message}`)
    .join('\n')

  return [
    `**Investigation complete** · Confidence: ${CONFIDENCE_LABEL[report.confidence] ?? report.confidence}`,
    '',
    report.summary,
    topFindings ? `\n${topFindings}` : '',
    report.hypothesis ? `\n**Hypothesis:** ${report.hypothesis}` : '',
  ].filter(Boolean).join('\n')
}

export interface Finding {
  area: string
  status: 'pass' | 'warning' | 'fail' | 'unknown'
  message: string
}

export interface KBCitation {
  id: string
  title: string
  source_ref: string | null
  source_type: string
  snippet: string
}

export interface CritiqueFinding {
  claim: string
  verdict: 'well-grounded' | 'overstated' | 'unsupported' | 'contradicted'
  reasoning: string
}

export interface CritiqueReport {
  overallAssessment: string
  critiques: CritiqueFinding[]
  alternativeHypothesis: string | null
  confidenceChallenge: 'maintain' | 'lower' | 'raise'
}

export interface ArbiterVerdict {
  reasoning: string
  addressedCritiques: Array<{
    claim: string
    resolution: 'upheld' | 'overruled' | 'partially-accepted'
    explanation: string
  }>
}

export interface InvestigationReport {
  summary: string
  findings: Finding[]
  hypothesis: string
  confidence: 'low' | 'medium' | 'high'
  recommended_steps: string[]
  issueType: string
  issueSeverity: 'none' | 'confirmed-bug'
  suggestedIssueTitle: string
  suggestedIssueBody: string
  citations: KBCitation[]
  critique?: CritiqueReport
  arbiterVerdict?: ArbiterVerdict
}

interface InvestigatorState {
  reports: Record<number, InvestigationReport>
  investigationIds: Record<number, string>
  loading: Record<number, boolean>
  challenging: Record<number, boolean>
  errors: Record<number, string>
  investigate: (ticketId: number) => Promise<void>
  challenge: (ticketId: number, text: string) => Promise<void>
  clear: (ticketId: number) => void
}

export const useInvestigatorStore = create<InvestigatorState>((set, get) => ({
  reports: {},
  investigationIds: {},
  loading: {},
  challenging: {},
  errors: {},

  async investigate(ticketId) {
    set((s) => ({
      loading: { ...s.loading, [ticketId]: true },
      errors: { ...s.errors, [ticketId]: '' },
    }))
    try {
      const { report, investigationId } = await requestInvestigation(ticketId)
      set((s) => ({
        reports: { ...s.reports, [ticketId]: report },
        investigationIds: { ...s.investigationIds, [ticketId]: investigationId },
        loading: { ...s.loading, [ticketId]: false },
      }))
      useAIMessagesStore.getState().addMessage({
        id: `inv-${investigationId}`,
        ticketId,
        text: buildSummaryText(report),
        received: new Date().toISOString(),
        type: 'summary',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Investigation failed'
      set((s) => ({
        errors: { ...s.errors, [ticketId]: message },
        loading: { ...s.loading, [ticketId]: false },
      }))
    }
  },

  async challenge(ticketId, text) {
    const original = get().reports[ticketId]
    if (!original) return
    set((s) => ({ challenging: { ...s.challenging, [ticketId]: true } }))
    try {
      const { report } = await challengeInvestigation(ticketId, original, text)
      set((s) => ({
        reports: { ...s.reports, [ticketId]: report },
        challenging: { ...s.challenging, [ticketId]: false },
      }))
      useAIMessagesStore.getState().addMessage({
        id: `challenge-${ticketId}-${Date.now()}`,
        ticketId,
        text: `**Re-assessment after challenge**\n\n${buildSummaryText(report)}`,
        received: new Date().toISOString(),
        type: 'challenge',
      })
    } catch {
      set((s) => ({ challenging: { ...s.challenging, [ticketId]: false } }))
    }
  },

  clear(ticketId) {
    set((s) => {
      const reports = { ...s.reports }
      const errors = { ...s.errors }
      const investigationIds = { ...s.investigationIds }
      delete reports[ticketId]
      delete errors[ticketId]
      delete investigationIds[ticketId]
      return { reports, errors, investigationIds }
    })
  },
}))
