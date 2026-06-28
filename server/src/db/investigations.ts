import { query } from './client'

export async function saveInvestigation(
  conversationId: string,
  evidence: unknown,
  report: unknown,
): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO investigations (conversation_id, triggered_by, connector, status, evidence, report)
     VALUES ($1, 'manual', 'wordpress', 'complete', $2, $3)
     RETURNING id`,
    [conversationId, JSON.stringify(evidence), JSON.stringify(report)],
  )
  return rows[0].id
}
