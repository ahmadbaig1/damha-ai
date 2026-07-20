import { Router } from 'express'
import { getHelpdeskProvider } from '../connectors/helpdesk'
import { upsertConversation } from '../db/conversations'
import { getInvestigationHistory } from '../db/investigations'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const provider = await getHelpdeskProvider()
    const tickets = await provider.getTickets()
    res.json({ tickets })
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

router.get('/:id/messages', async (req, res) => {
  try {
    const provider = await getHelpdeskProvider()
    const data = await provider.getConversation(req.params.id)
    upsertConversation(data.ticket).catch(() => {})
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages'
    res.status(500).json({ error: message })
  }
})

router.post('/:id/reply', async (req, res) => {
  try {
    const { conversationId, text } = req.body as { conversationId: string; text: string }
    const provider = await getHelpdeskProvider()
    await provider.sendMessage(conversationId, text)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to send reply' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { status, subject, requester_id } = req.body as {
      status?: string; subject?: string; requester_id?: number
    }
    const fields: { status?: string; subject?: string; requester_id?: number } = {}
    if (status !== undefined) fields.status = status
    if (subject !== undefined) fields.subject = subject
    if (requester_id !== undefined) fields.requester_id = requester_id
    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: 'No valid fields provided' })
      return
    }
    const provider = await getHelpdeskProvider()
    const ticket = await provider.updateTicket(req.params.id, fields)
    res.json({ ticket })
  } catch {
    res.status(500).json({ error: 'Failed to update ticket' })
  }
})

router.get('/:id/call', async (req, res) => {
  try {
    const provider = await getHelpdeskProvider()
    const callUrl = await provider.getCallUrl(req.params.id)
    res.json({ callUrl })
  } catch {
    res.status(500).json({ error: 'Failed to fetch call info' })
  }
})

router.get('/:id/history', async (req, res) => {
  try {
    const provider = await getHelpdeskProvider()
    const { ticket } = await provider.getConversation(req.params.id)
    const userId = ticket.requester_id ? String(ticket.requester_id) : null
    if (!userId) {
      res.json({ history: [] })
      return
    }
    const history = await getInvestigationHistory(userId)
    res.json({ history })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch history'
    res.status(500).json({ error: message })
  }
})

export default router
