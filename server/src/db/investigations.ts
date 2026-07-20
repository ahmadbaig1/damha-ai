import { query } from './client'

interface InvestigationMeta {
  zendeskUserId?: string
  zendeskTicketId?: number
  issueType?: string
}

export async function saveInvestigation(
  conversationId: string,
  evidence: unknown,
  report: unknown,
  meta?: InvestigationMeta,
): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO investigations
       (conversation_id, triggered_by, connector, status, evidence, report,
        zendesk_user_id, zendesk_ticket_id, issue_type)
     VALUES ($1, 'manual', 'wordpress', 'complete', $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      conversationId,
      JSON.stringify(evidence),
      JSON.stringify(report),
      meta?.zendeskUserId ?? null,
      meta?.zendeskTicketId ?? null,
      meta?.issueType ?? null,
    ],
  )
  return rows[0].id
}

export interface InvestigationHistoryItem {
  id: string
  zendesk_ticket_id: number | null
  issue_type: string | null
  created_at: string
  summary: string | null
  confidence: string | null
}

export async function getInvestigationHistory(
  zendeskUserId: string,
): Promise<InvestigationHistoryItem[]> {
  return query<InvestigationHistoryItem>(
    `SELECT id, zendesk_ticket_id, issue_type, created_at,
            report->>'summary'    AS summary,
            report->>'confidence' AS confidence
     FROM investigations
     WHERE zendesk_user_id = $1 AND status = 'complete'
     ORDER BY created_at DESC
     LIMIT 5`,
    [zendeskUserId],
  )
}
