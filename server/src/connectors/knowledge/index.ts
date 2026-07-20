import { query } from '../../db/client'
import { fetchWithTimeout } from '../../utils/fetch'

export interface KnowledgeResult {
  id: string
  title: string
  snippet: string
  source_type: string
  source_ref?: string | null
}

export interface KnowledgeSource {
  id: string
  source_type: string
  title: string
  source_ref: string | null
  created_at: string
}

class KnowledgeConnector {
  async addArticle(title: string, content: string): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO knowledge_sources (source_type, title, raw_content)
       VALUES ('article', $1, $2) RETURNING id`,
      [title, content],
    )
    return rows[0].id
  }

  async addUrl(url: string): Promise<string> {
    const res = await fetchWithTimeout(url, 10000)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    const html = await res.text()
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : url
    const content = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const rows = await query<{ id: string }>(
      `INSERT INTO knowledge_sources (source_type, title, source_ref, raw_content)
       VALUES ('url', $1, $2, $3) RETURNING id`,
      [title, url, content],
    )
    return rows[0].id
  }

  async addFile(filename: string, buffer: Buffer, mimetype: string): Promise<string> {
    let content: string
    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const data = await pdfParse(buffer)
      content = data.text
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.endsWith('.docx')
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      content = result.value
    } else if (mimetype === 'message/rfc822' || filename.endsWith('.eml')) {
      const { simpleParser } = await import('mailparser')
      const parsed = await simpleParser(buffer)
      const subject = parsed.subject ?? filename
      const htmlBody = typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ') : ''
      const body = parsed.text ?? htmlBody
      const rows = await query<{ id: string }>(
        `INSERT INTO knowledge_sources (source_type, title, source_ref, raw_content)
         VALUES ('email', $1, $2, $3) RETURNING id`,
        [subject, filename, body],
      )
      return rows[0].id
    } else {
      content = buffer.toString('utf-8')
    }
    const rows = await query<{ id: string }>(
      `INSERT INTO knowledge_sources (source_type, title, source_ref, raw_content)
       VALUES ('file', $1, $2, $3) RETURNING id`,
      [filename, filename, content],
    )
    return rows[0].id
  }

  async addEmail(subject: string, body: string): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO knowledge_sources (source_type, title, raw_content)
       VALUES ('email', $1, $2) RETURNING id`,
      [subject, body],
    )
    return rows[0].id
  }

  async search(queryText: string, limit = 5): Promise<KnowledgeResult[]> {
    const rows = await query<{ id: string; title: string; raw_content: string; source_type: string }>(
      `SELECT id, title, source_type,
              ts_headline('english', raw_content, plainto_tsquery('english', $1),
                'MaxWords=50, MinWords=20, StartSel=, StopSel=') AS raw_content
       FROM knowledge_sources
       WHERE search_vector @@ plainto_tsquery('english', $1)
       ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
       LIMIT $2`,
      [queryText, limit],
    )
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      snippet: r.raw_content.slice(0, 300),
      source_type: r.source_type,
    }))
  }

  async list(): Promise<KnowledgeSource[]> {
    return query<KnowledgeSource>(
      `SELECT id, source_type, title, source_ref, created_at
       FROM knowledge_sources ORDER BY created_at DESC`,
    )
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM knowledge_sources WHERE id = $1`, [id])
  }
}

export const knowledgeConnector = new KnowledgeConnector()
