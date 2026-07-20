import { SmoochMessage } from '../../zendesk/client'
import { wordpressConnector } from '../../connectors/wordpress'
import { searchKnowledge } from '../knowledge'
import {
  INVESTIGATOR_CONTEXT_SYSTEM,
  buildContextPrompt,
  INVESTIGATOR_ANALYSIS_SYSTEM,
  buildAnalysisPrompt,
  buildChallengePrompt,
} from '../../prompts/investigator'
import { stripPII } from '../../utils/pii'
import { getAnthropicClient } from '../../utils/anthropic'

export interface ConversationContext {
  siteUrl: string | null
  issueType: string
  symptoms: string[]
  pluginsMentioned: Array<{ name: string; slug: string }>
  theme: string | null
  isSelfHosted: boolean
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
}

function toTranscript(messages: SmoochMessage[]): string {
  return messages
    .filter((m) => m.content.type === 'text' || m.content.type === 'formResponse')
    .map((m) => {
      const role = m.author.type === 'user' ? 'Customer' : 'Agent'
      const text = m.content.text ?? m.content.textFallback ?? ''
      return text ? `${role}: ${text}` : null
    })
    .filter((line): line is string => line !== null)
    .join('\n')
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

async function extractContext(transcript: string): Promise<ConversationContext> {
  const client = await getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: INVESTIGATOR_CONTEXT_SYSTEM,
    messages: [{ role: 'user', content: buildContextPrompt(transcript) }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return JSON.parse(stripFences(block.text)) as ConversationContext
}

export async function runInvestigation(
  messages: SmoochMessage[],
  kbOnly = false,
): Promise<InvestigationReport> {
  const rawTranscript = toTranscript(messages)
  if (!rawTranscript) throw new Error('No readable messages to investigate')
  const transcript = stripPII(rawTranscript)

  const context = await extractContext(transcript)

  const evidence: Record<string, unknown> = { context }

  const kbResults = await searchKnowledge([context.issueType, ...context.symptoms].join(' '))
  if (kbResults.length > 0) evidence.internalKnowledge = kbResults

  if (!kbOnly) {
    if (context.siteUrl) {
      const [frontendCheck, sslCheck, wpAdminCheck, specificPageCheck, siteInfo, diagnostics] =
        await Promise.all([
          wordpressConnector.checkFrontend(context.siteUrl),
          wordpressConnector.checkSSL(context.siteUrl),
          wordpressConnector.checkWpAdmin(context.siteUrl),
          wordpressConnector.checkSpecificPage(context.siteUrl),
          wordpressConnector.getSite(context.siteUrl),
          wordpressConnector.getDiagnostics(context.siteUrl),
        ])
      evidence.frontendCheck = frontendCheck
      evidence.sslCheck = sslCheck
      evidence.wpAdminCheck = wpAdminCheck
      evidence.specificPageCheck = specificPageCheck
      evidence.siteInfo = siteInfo
      evidence.diagnostics = diagnostics
    }

    if (context.pluginsMentioned.length > 0) {
      const slugs = context.pluginsMentioned.map((p) => p.slug)
      const [pluginData, knownConflicts] = await Promise.all([
        Promise.all(slugs.map((s) => wordpressConnector.getPluginInfo(s))),
        Promise.resolve(wordpressConnector.checkKnownConflicts(slugs)),
      ])
      evidence.pluginData = pluginData
      if (knownConflicts.length > 0) evidence.knownConflicts = knownConflicts
    }
  }

  const client = await getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1400,
    system: INVESTIGATOR_ANALYSIS_SYSTEM,
    messages: [{ role: 'user', content: buildAnalysisPrompt(transcript, evidence) }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')

  try {
    const parsed = JSON.parse(stripFences(block.text)) as InvestigationReport
    const citations: KBCitation[] = kbResults.map((r) => ({
      id: r.id,
      title: r.title,
      source_ref: r.source_ref ?? null,
      source_type: r.source_type,
      snippet: r.snippet,
    }))
    return {
      ...parsed,
      issueType: context.issueType,
      issueSeverity: parsed.issueSeverity ?? 'none',
      suggestedIssueTitle: parsed.suggestedIssueTitle ?? '',
      suggestedIssueBody: parsed.suggestedIssueBody ?? '',
      citations,
    }
  } catch {
    throw new Error(`Failed to parse investigation report: ${block.text.slice(0, 200)}`)
  }
}

export async function challengeInvestigation(
  originalReport: InvestigationReport,
  challenge: string,
  transcript: string,
): Promise<InvestigationReport> {
  const client = await getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1400,
    system: INVESTIGATOR_ANALYSIS_SYSTEM,
    messages: [{ role: 'user', content: buildChallengePrompt(transcript, originalReport, challenge) }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  try {
    const parsed = JSON.parse(stripFences(block.text)) as InvestigationReport
    return {
      ...originalReport,
      ...parsed,
      citations: originalReport.citations,
    }
  } catch {
    throw new Error(`Failed to parse challenge response: ${block.text.slice(0, 200)}`)
  }
}
