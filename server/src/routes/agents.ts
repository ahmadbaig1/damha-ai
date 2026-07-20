import { Router } from 'express'
import { generateReplyDraft, composeMessage } from '../agents/reply'
import { getCoachSuggestion } from '../agents/coach'
import { runInvestigation, challengeInvestigation, InvestigationReport } from '../agents/investigator'
import { assessMood } from '../agents/mood'
import { getConversationMessages, extractSmoochUserId } from '../zendesk/client'
import { upsertConversation, logReplyDraft, upsertCoachingSession, appendCoachSuggestion } from '../db/conversations'
import { saveInvestigation } from '../db/investigations'
import { getOrgSettings } from '../db/orgSettings'
import { getAnthropicClient } from '../utils/anthropic'
import { ASK_SYSTEM, buildAskPrompt } from '../prompts/investigator'
import { getHelpdeskProvider } from '../connectors/helpdesk'
import { query } from '../db/client'

const router = Router()

router.post('/mood', async (req, res) => {
  try {
    const { ticketId } = req.body as { ticketId: number }
    if (!ticketId) {
      res.status(400).json({ error: 'ticketId is required' })
      return
    }
    const { messages, ticket } = await getConversationMessages(String(ticketId))
    const mood = await assessMood(messages)

    const conversationId = await upsertConversation(ticket)
    query(
      `INSERT INTO mood_scores (zendesk_ticket_id, conversation_id, score, label)
       VALUES ($1, $2::uuid, $3, $4)`,
      [ticketId, conversationId, mood.score, mood.label],
    ).catch(() => {})

    res.json({ mood })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to assess mood'
    res.status(500).json({ error: message })
  }
})

router.post('/reply', async (req, res) => {
  try {
    const { ticketId, investigationReport, isGreeting } = req.body as {
      ticketId: number
      investigationReport?: unknown
      isGreeting?: boolean
    }
    if (!ticketId) {
      res.status(400).json({ error: 'ticketId is required' })
      return
    }
    const { messages, ticket } = await getConversationMessages(String(ticketId))
    const draft = await generateReplyDraft(messages, investigationReport, isGreeting)
    const conversationId = await upsertConversation(ticket)
    logReplyDraft(conversationId, draft).catch(() => {})
    res.json({ draft })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate draft'
    res.status(500).json({ error: message })
  }
})

router.post('/coach/suggestion', async (req, res) => {
  try {
    const { ticketId } = req.body as { ticketId: number }
    if (!ticketId) {
      res.status(400).json({ error: 'ticketId is required' })
      return
    }
    const { messages, ticket } = await getConversationMessages(String(ticketId))
    const result = await getCoachSuggestion(messages)
    if (result.suggestion) {
      upsertConversation(ticket)
        .then((convId) => upsertCoachingSession(convId, req.user?.sub))
        .then((sessionId) => appendCoachSuggestion(sessionId, result as { suggestion: string; type: string }))
        .catch(() => {})
    }
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get coaching suggestion'
    res.status(500).json({ error: message })
  }
})

router.post('/compose', async (req, res) => {
  try {
    const { ticketId, input } = req.body as { ticketId: number; input: string }
    if (!ticketId || !input) {
      res.status(400).json({ error: 'ticketId and input are required' })
      return
    }
    const { messages } = await getConversationMessages(String(ticketId))
    const result = await composeMessage(input, messages)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Compose failed'
    res.status(500).json({ error: message })
  }
})

router.post('/investigate', async (req, res) => {
  try {
    const { ticketId } = req.body as { ticketId: number }
    if (!ticketId) {
      res.status(400).json({ error: 'ticketId is required' })
      return
    }
    const { messages, ticket } = await getConversationMessages(String(ticketId))
    const { kbOnly } = await getOrgSettings()
    const report = await runInvestigation(messages, kbOnly)
    const conversationId = await upsertConversation(ticket)
    const zendeskUserId = extractSmoochUserId(ticket.description) ?? undefined
    const investigationId = await saveInvestigation(conversationId, {}, report, {
      zendeskUserId,
      zendeskTicketId: ticketId,
      issueType: report.issueType,
    })
    res.json({ report, investigationId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Investigation failed'
    res.status(500).json({ error: message })
  }
})

router.post('/investigate/challenge', async (req, res) => {
  try {
    const { ticketId, originalReport, challenge } = req.body as {
      ticketId: number
      originalReport: InvestigationReport
      challenge: string
    }
    if (!ticketId || !originalReport || !challenge?.trim()) {
      res.status(400).json({ error: 'ticketId, originalReport and challenge are required' })
      return
    }
    const { messages } = await getConversationMessages(String(ticketId))
    const transcript = messages
      .filter((m) => m.content.type === 'text' || m.content.type === 'formResponse')
      .map((m) => {
        const role = m.author.type === 'user' ? 'Customer' : 'Agent'
        const text = m.content.text ?? m.content.textFallback ?? ''
        return text ? `${role}: ${text}` : null
      })
      .filter((l): l is string => l !== null)
      .join('\n')

    const revised = await challengeInvestigation(originalReport, challenge, transcript)
    res.json({ report: revised })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Challenge failed'
    res.status(500).json({ error: message })
  }
})

router.post('/ask', async (req, res) => {
  try {
    const { ticketId, question } = req.body as { ticketId: number; question: string }
    if (!ticketId || !question?.trim()) {
      res.status(400).json({ error: 'ticketId and question are required' })
      return
    }
    const provider = await getHelpdeskProvider()
    const { messages } = await provider.getConversation(String(ticketId))
    const transcript = messages
      .map((m) => `${m.role === 'customer' ? 'Customer' : 'Agent'}: ${m.text}`)
      .filter((l) => l.trim().length > 10)
      .join('\n')

    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: ASK_SYSTEM,
      messages: [{ role: 'user', content: buildAskPrompt(transcript, question) }],
    })
    const answer = response.content[0].type === 'text' ? response.content[0].text : ''
    res.json({ answer })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ask failed'
    res.status(500).json({ error: message })
  }
})

export default router
