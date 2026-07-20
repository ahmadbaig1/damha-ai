import { Router } from 'express'
import { query } from '../db/client'

const router = Router()

router.get('/overview', async (req, res) => {
  if (req.user?.role !== 'lead') {
    res.status(403).json({ error: 'Dashboard is available to team leads only' })
    return
  }
  try {
    const [
      investigationsByType,
      avgCoachScore,
      systemicAlerts,
      moodDistribution,
      recentInvestigations,
    ] = await Promise.all([
      query<{ issue_type: string; count: number }>(
        `SELECT issue_type, COUNT(*)::int AS count FROM investigations
         WHERE issue_type IS NOT NULL
         GROUP BY issue_type ORDER BY count DESC`,
      ),
      query<{ avg: number }>(
        `SELECT ROUND(AVG(quality_score))::int AS avg FROM coaching_sessions
         WHERE quality_score IS NOT NULL`,
      ),
      query<{ issue_type: string; count: number }>(
        `SELECT issue_type, COUNT(*)::int AS count FROM investigations
         WHERE created_at > now() - interval '7 days' AND issue_type IS NOT NULL
         GROUP BY issue_type HAVING COUNT(*) >= 3 ORDER BY count DESC`,
      ),
      query<{ day: string; avg_score: number }>(
        `SELECT DATE(assessed_at) AS day, ROUND(AVG(score))::int AS avg_score
         FROM mood_scores
         WHERE assessed_at > now() - interval '30 days'
         GROUP BY day ORDER BY day`,
      ),
      query<{
        id: string
        zendesk_ticket_id: number
        issue_type: string
        created_at: string
        confidence: string
        raised_issue_url: string | null
      }>(
        `SELECT id, zendesk_ticket_id, issue_type, created_at,
                report->>'confidence' AS confidence, raised_issue_url
         FROM investigations ORDER BY created_at DESC LIMIT 10`,
      ),
    ])

    res.json({
      investigationsByType,
      avgCoachScore: avgCoachScore[0]?.avg ?? null,
      systemicAlerts,
      moodDistribution,
      recentInvestigations,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dashboard'
    res.status(500).json({ error: message })
  }
})

export default router
