import { useEffect, useRef, useState } from 'react'
import { useKBStore } from '../store/kbStore'

type Tab = 'article' | 'url' | 'file' | 'email'

const TYPE_COLOR: Record<string, string> = {
  article: 'var(--color-accent)',
  url: 'var(--color-warning)',
  file: 'var(--color-success)',
  email: '#a78bfa',
}

export default function KnowledgePage() {
  const { sources, loading, list, addArticle, crawlUrl, uploadFile, addEmail, delete: deleteSource } = useKBStore()
  const [activeTab, setActiveTab] = useState<Tab | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Article
  const [artTitle, setArtTitle] = useState('')
  const [artContent, setArtContent] = useState('')
  // URL
  const [url, setUrl] = useState('')
  // File
  const fileRef = useRef<HTMLInputElement>(null)
  // Email
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  useEffect(() => { list() }, [])

  async function handleAdd() {
    setError(null)
    setBusy(true)
    try {
      if (activeTab === 'article') {
        if (!artTitle || !artContent) { setError('Title and content required'); setBusy(false); return }
        await addArticle(artTitle, artContent)
        setArtTitle(''); setArtContent('')
      } else if (activeTab === 'url') {
        if (!url) { setError('URL required'); setBusy(false); return }
        await crawlUrl(url)
        setUrl('')
      } else if (activeTab === 'file') {
        const file = fileRef.current?.files?.[0]
        if (!file) { setError('No file selected'); setBusy(false); return }
        await uploadFile(file)
        if (fileRef.current) fileRef.current.value = ''
      } else if (activeTab === 'email') {
        if (!emailSubject || !emailBody) { setError('Subject and body required'); setBusy(false); return }
        await addEmail(emailSubject, emailBody)
        setEmailSubject(''); setEmailBody('')
      }
      setActiveTab(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'var(--space-8) var(--space-6)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Knowledge Base
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Articles and docs that surface automatically during investigations.
          </p>
        </div>

        {/* Add buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          {(['article', 'url', 'file', 'email'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(activeTab === tab ? null : tab)}
              style={{
                background: activeTab === tab ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                border: `1px solid ${activeTab === tab ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                padding: '7px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              + {tab}
            </button>
          ))}
        </div>

        {/* Inline add form */}
        {activeTab && (
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}>
            {activeTab === 'article' && (
              <>
                <input value={artTitle} onChange={(e) => setArtTitle(e.target.value)} placeholder="Title" style={inputStyle} />
                <textarea value={artContent} onChange={(e) => setArtContent(e.target.value)} placeholder="Article content…" rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
              </>
            )}
            {activeTab === 'url' && (
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
            )}
            {activeTab === 'file' && (
              <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.md,.eml" style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)' }} />
            )}
            {activeTab === 'email' && (
              <>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Subject" style={inputStyle} />
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Email body…" rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
              </>
            )}
            {error && <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={handleAdd} disabled={busy} style={{
                background: 'var(--color-accent)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-md)', padding: '8px 20px',
                fontSize: 'var(--text-sm)', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
              }}>
                {busy ? 'Adding…' : 'Add'}
              </button>
              <button onClick={() => { setActiveTab(null); setError(null) }} style={{
                background: 'transparent', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '8px 16px',
                color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Source list */}
        {loading && <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Loading…</p>}
        {!loading && sources.length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>No sources yet. Add articles, URLs, files, or emails above.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {sources.map((src) => (
            <div key={src.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: TYPE_COLOR[src.source_type] ?? 'var(--color-text-secondary)',
                background: `${TYPE_COLOR[src.source_type] ?? 'rgba(255,255,255,0.1)'}22`,
                border: `1px solid ${TYPE_COLOR[src.source_type] ?? 'rgba(255,255,255,0.1)'}44`,
                borderRadius: 100,
                padding: '2px 8px',
                flexShrink: 0,
              }}>
                {src.source_type}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {src.title}
              </span>
              {src.source_ref && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {src.source_ref}
                </span>
              )}
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {new Date(src.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => deleteSource(src.id)}
                style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 16, opacity: 0.6, flexShrink: 0 }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--text-sm)',
  padding: '9px var(--space-3)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
}
