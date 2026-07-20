import { Router } from 'express'
import { query } from '../db/client'

const router = Router()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO
const LINEAR_API_KEY = process.env.LINEAR_API_KEY
const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID

router.get('/status', (_req, res) => {
  res.json({
    github: !!(GITHUB_TOKEN && GITHUB_REPO),
    linear: !!(LINEAR_API_KEY && LINEAR_TEAM_ID),
  })
})

router.post('/github/issue', async (req, res) => {
  try {
    const { title, body, investigationId } = req.body as {
      title: string
      body: string
      investigationId?: string
    }
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      res.status(503).json({ error: 'GitHub integration not configured' })
      return
    }
    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({ title, body }),
    })
    if (!ghRes.ok) {
      const err = await ghRes.text()
      res.status(ghRes.status).json({ error: err })
      return
    }
    const issue = (await ghRes.json()) as { html_url: string }
    if (investigationId) {
      query(
        `UPDATE investigations SET raised_issue_url = $1 WHERE id = $2`,
        [issue.html_url, investigationId],
      ).catch(() => {})
    }
    res.json({ url: issue.html_url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create GitHub issue'
    res.status(500).json({ error: message })
  }
})

router.post('/linear/issue', async (req, res) => {
  try {
    const { title, body, investigationId } = req.body as {
      title: string
      body: string
      investigationId?: string
    }
    if (!LINEAR_API_KEY || !LINEAR_TEAM_ID) {
      res.status(503).json({ error: 'Linear integration not configured' })
      return
    }
    const linRes = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: LINEAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation IssueCreate($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue { url }
            }
          }
        `,
        variables: {
          input: { teamId: LINEAR_TEAM_ID, title, description: body },
        },
      }),
    })
    const data = (await linRes.json()) as {
      data?: { issueCreate?: { success: boolean; issue?: { url: string } } }
    }
    const url = data.data?.issueCreate?.issue?.url
    if (!url) {
      res.status(500).json({ error: 'Linear did not return an issue URL' })
      return
    }
    if (investigationId) {
      query(
        `UPDATE investigations SET raised_issue_url = $1 WHERE id = $2`,
        [url, investigationId],
      ).catch(() => {})
    }
    res.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Linear issue'
    res.status(500).json({ error: message })
  }
})

export default router
