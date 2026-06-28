import { Router } from 'express'
import { getLiveChats, getConversationMessages, sendMessage, updateTicketStatus } from '../zendesk/client'
import { upsertConversation } from '../db/conversations'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const tickets = await getLiveChats()
    res.json({ tickets })
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

router.get('/:id/messages', async (req, res) => {
  try {
    const data = await getConversationMessages(req.params.id)
    upsertConversation(data.ticket).catch(() => {}) // fire-and-forget
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages'
    res.status(500).json({ error: message })
  }
})

router.post('/:id/reply', async (req, res) => {
  try {
    const { conversationId, text } = req.body as { conversationId: string; text: string }
    const messages = await sendMessage(conversationId, text)
    res.json({ messages })
  } catch {
    res.status(500).json({ error: 'Failed to send reply' })
  }
})

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body as { status: 'pending' | 'solved' }
    if (status !== 'pending' && status !== 'solved') {
      res.status(400).json({ error: 'status must be pending or solved' })
      return
    }
    const ticket = await updateTicketStatus(req.params.id, status)
    res.json({ ticket })
  } catch {
    res.status(500).json({ error: 'Failed to update ticket status' })
  }
})

export default router
