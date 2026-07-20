import { query } from './client'
import { HelpdeskTicket } from '../connectors/helpdesk/types'

export async function upsertConversation(ticket: HelpdeskTicket): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO conversations (zendesk_ticket_id, subject, status, channel, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (zendesk_ticket_id) DO UPDATE
       SET status = EXCLUDED.status, updated_at = now()
     RETURNING id`,
    [ticket.id, ticket.subject, ticket.status, 'messaging'],
  )
  return rows[0].id
}

export async function logReplyDraft(conversationId: string, draftText: string): Promise<void> {
  await query(
    `INSERT INTO reply_drafts (conversation_id, draft_text) VALUES ($1, $2)`,
    [conversationId, draftText],
  )
}

export async function upsertCoachingSession(
  conversationId: string,
  engineerId?: string,
): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO coaching_sessions (conversation_id, engineer_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [conversationId, engineerId ?? null],
  )
  if (rows.length > 0) return rows[0].id
  const existing = await query<{ id: string }>(
    `SELECT id FROM coaching_sessions WHERE conversation_id = $1`,
    [conversationId],
  )
  return existing[0].id
}

export async function appendCoachSuggestion(
  conversationId: string,
  suggestion: { suggestion: string; type: string },
): Promise<void> {
  await query(
    `UPDATE coaching_sessions
     SET suggestions = suggestions || $1::jsonb
     WHERE conversation_id = $2`,
    [JSON.stringify([{ ...suggestion, at: new Date().toISOString() }]), conversationId],
  )
}
