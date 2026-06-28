import { Router } from 'express'
import { generateReplyDraft, composeMessage } from '../agents/reply'
import { getCoachSuggestion } from '../agents/coach'
import { runInvestigation } from '../agents/investigator'
import { assessMood } from '../agents/mood'
import { getConversationMessages } from '../zendesk/client'
import { upsertConversation, logReplyDraft, upsertCoachingSession, appendCoachSuggestion } from '../db/conversations'
import { saveInvestigation } from '../db/investigations'

const router = Router()

router.post('/mood', async (req, res) => {
  try {
    const { ticketId } = req.body as { ticketId: number }
    if (!ticketId) {
      res.status(400).json({ error: 'ticketId is required' })
      return
    }
    const { messages } = await getConversationMessages(String(ticketId))
    const mood = await assessMood(messages)
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
        .then((convId) => upsertCoachingSession(convId))
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
    const report = await runInvestigation(messages)
    const conversationId = await upsertConversation(ticket)
    saveInvestigation(conversationId, {}, report).catch(() => {})
    res.json({ report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Investigation failed'
    res.status(500).json({ error: message })
  }
})

export default router
