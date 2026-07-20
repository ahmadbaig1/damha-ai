import { Router } from 'express'
import multer from 'multer'
import { knowledgeConnector } from '../connectors/knowledge'
import { suggestKBArticle } from '../agents/knowledge/suggest'
import { InvestigationReport } from '../agents/investigator'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.get('/', async (_req, res) => {
  try {
    const sources = await knowledgeConnector.list()
    res.json({ sources })
  } catch {
    res.status(500).json({ error: 'Failed to list knowledge sources' })
  }
})

router.post('/articles', async (req, res) => {
  try {
    const { title, content } = req.body as { title: string; content: string }
    if (!title || !content) {
      res.status(400).json({ error: 'title and content are required' })
      return
    }
    const id = await knowledgeConnector.addArticle(title, content)
    res.json({ id })
  } catch {
    res.status(500).json({ error: 'Failed to add article' })
  }
})

router.post('/crawl', async (req, res) => {
  try {
    const { url } = req.body as { url: string }
    if (!url) {
      res.status(400).json({ error: 'url is required' })
      return
    }
    const id = await knowledgeConnector.addUrl(url)
    res.json({ id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to crawl URL'
    res.status(422).json({ error: message })
  }
})

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }
    const id = await knowledgeConnector.addFile(
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
    )
    res.json({ id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process file'
    res.status(500).json({ error: message })
  }
})

router.post('/email', async (req, res) => {
  try {
    const { subject, body } = req.body as { subject: string; body: string }
    if (!subject || !body) {
      res.status(400).json({ error: 'subject and body are required' })
      return
    }
    const id = await knowledgeConnector.addEmail(subject, body)
    res.json({ id })
  } catch {
    res.status(500).json({ error: 'Failed to add email' })
  }
})

router.post('/suggest', async (req, res) => {
  try {
    const { report } = req.body as { report: InvestigationReport }
    if (!report) {
      res.status(400).json({ error: 'report is required' })
      return
    }
    const article = await suggestKBArticle(report)
    res.json(article)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to suggest article'
    res.status(500).json({ error: message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await knowledgeConnector.delete(req.params.id)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete source' })
  }
})

export default router
