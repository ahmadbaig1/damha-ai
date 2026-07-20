import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { InvestigationReport } from '../store/investigatorStore'
import { useKBStore } from '../store/kbStore'

interface Props {
  report: InvestigationReport
  onClose: () => void
}

export function KBSuggestModal({ report, onClose }: Props) {
  const { suggest, addArticle, suggesting } = useKBStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    suggest(report)
      .then(({ title: t, content: c }) => {
        setTitle(t)
        setContent(c)
      })
      .catch(() => setError('Failed to generate article'))
  }, [])

  async function handleSave() {
    if (!title || !content) return
    setSaving(true)
    try {
      await addArticle(title, content)
      setSaved(true)
      setTimeout(onClose, 800)
    } catch {
      setError('Failed to save article')
      setSaving(false)
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        width: '100%', maxWidth: 600,
        background: 'rgba(255,255,255,0.09)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
            Suggest KB Article
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {suggesting && (
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            ✦ Drafting article…
          </p>
        )}

        {error && (
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</p>
        )}

        {!suggesting && !error && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                background: saved ? 'var(--color-success)' : 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: saving || saved ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(129,140,248,0.3)',
                transition: 'background 0.2s',
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save to Knowledge Base'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-2) var(--space-3)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
}
