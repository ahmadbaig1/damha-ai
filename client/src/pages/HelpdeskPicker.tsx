import { useState } from 'react'
import { HELPDESK_PROVIDERS, ProviderDef } from '../lib/helpdeskProviders'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

interface Props {
  onDone: () => void
}

export default function HelpdeskPicker({ onDone }: Props) {
  const { save, saving } = useSettingsStore()
  const { clearAuth } = useAuthStore()
  const [selected, setSelected] = useState<ProviderDef | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  function setField(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleConnect() {
    if (!selected) return
    for (const f of selected.fields) {
      if (f.required && !fields[f.key]?.trim()) {
        setError(`${f.label} is required`)
        return
      }
    }
    setError(null)
    try {
      await save({
        helpdeskProvider: selected.id,
        helpdeskConfig: fields,
      })
      onDone()
    } catch {
      setError('Failed to save credentials — check server connection')
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      position: 'relative',
    }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-6)' }}>
          <button
            onClick={clearAuth}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 500, padding: '4px 10px', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>

        <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 var(--space-2)', fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
            Connect your helpdesk
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Choose the platform your team uses. You can change this later in Settings.
          </p>
        </div>

        {/* Provider grid */}
        {!selected && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {HELPDESK_PROVIDERS.map((p) => (
              <button
                key={p.id}
                disabled={!p.available}
                onClick={() => { setSelected(p); setFields({}) }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  textAlign: 'left',
                  cursor: p.available ? 'pointer' : 'not-allowed',
                  opacity: p.available ? 1 : 0.45,
                  transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!p.available) return
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.borderColor = 'rgba(129,140,248,0.4)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {p.description}
                </div>
                {!p.available && (
                  <span style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-secondary)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 100,
                    padding: '2px 7px',
                  }}>
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Auth form */}
        {selected && (
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: selected.guide ? 'var(--space-3)' : 'var(--space-5)' }}>
              <button
                onClick={() => { setSelected(null); setError(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
              >
                ←
              </button>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Connect {selected.name}
              </span>
            </div>

            {selected.guide && (
              <p style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: '10px 12px', background: 'rgba(129,140,248,0.07)', borderRadius: 'var(--radius-md)', borderLeft: '2px solid rgba(129,140,248,0.4)' }}>
                {selected.guide}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {selected.fields.map((f) => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                      {f.label}
                    </label>
                    {f.hint && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', opacity: 0.5, fontStyle: 'italic' }}>
                        {f.hint}
                      </span>
                    )}
                  </div>
                  <input
                    type={f.type}
                    value={fields[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={inputStyle}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConnect() }}
                  />
                </div>
              ))}

              {error && (
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</p>
              )}

              <button
                onClick={handleConnect}
                disabled={saving}
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '11px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 2px 12px rgba(129,140,248,0.4)',
                  transition: 'opacity 0.15s',
                }}
              >
                {saving ? 'Connecting…' : `Connect ${selected.name}`}
              </button>
            </div>
          </div>
        )}
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
  padding: '10px var(--space-3)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
}
