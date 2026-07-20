import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HELPDESK_PROVIDERS, getProvider } from '../lib/helpdeskProviders'
import { useSettingsStore } from '../store/settingsStore'
import { useTicketStore } from '../store/ticketStore'

export function HelpdeskSwitcher() {
  const { helpdeskProvider, providerConfigs, save, saving } = useSettingsStore()
  const { clearTickets, loadTickets } = useTicketStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pendingProvider, setPendingProvider] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !pendingProvider) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [pendingProvider])

  const current = HELPDESK_PROVIDERS.find((p) => p.id === helpdeskProvider) ?? HELPDESK_PROVIDERS[0]
  const pendingDef = pendingProvider ? getProvider(pendingProvider) : null

  async function handleSwitch(id: string) {
    if (id === helpdeskProvider) { setOpen(false); return }
    setOpen(false)

    const isConfigured = providerConfigs[id] ?? false
    if (isConfigured) {
      await save({ helpdeskProvider: id })
      clearTickets()
      loadTickets()
      navigate('/tickets')
    } else {
      setPendingProvider(id)
      setFields({})
      setError(null)
    }
  }

  async function handleConnect() {
    if (!pendingDef) return
    const requiredFields = pendingDef.fields.filter((f) => f.required)
    const missing = requiredFields.filter((f) => !fields[f.key]?.trim())
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(', ')}`)
      return
    }
    setConnecting(true)
    setError(null)
    try {
      await save({ helpdeskProvider: pendingDef.id, helpdeskConfig: fields })
      clearTickets()
      loadTickets()
      navigate('/tickets')
      setPendingProvider(null)
    } catch {
      setError('Failed to connect. Please check your credentials.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            padding: '4px 10px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{current.name}</span>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 200,
            background: 'rgba(10,10,26,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            minWidth: 200,
          }}>
            {HELPDESK_PROVIDERS.map((p, i) => {
              const isActive = p.id === helpdeskProvider
              const isReady = providerConfigs[p.id] ?? false
              return (
                <button
                  key={p.id}
                  onClick={() => p.available ? handleSwitch(p.id) : undefined}
                  disabled={!p.available}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: isActive ? 'rgba(129,140,248,0.12)' : 'transparent',
                    border: 'none',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    padding: '9px 14px',
                    cursor: p.available ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                    opacity: p.available ? 1 : 0.45,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (p.available && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'rgba(129,140,248,0.12)' : 'transparent' }}
                >
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                    {p.name}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {!p.available && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Soon
                      </span>
                    )}
                    {p.available && isActive && <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>✓</span>}
                    {p.available && !isActive && !isReady && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(251,191,36,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Connect
                      </span>
                    )}
                  </span>
                </button>
              )
            })}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 14px' }}>
              <a href="/settings" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                Manage credentials →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Credential modal — rendered at root level to escape any stacking context */}
      {pendingDef && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPendingProvider(null) }}
        >
          <div style={{
            background: 'rgba(12,12,28,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            padding: 'var(--space-6)',
            width: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Connect {pendingDef.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {pendingDef.description}
                </div>
              </div>
              <button
                onClick={() => setPendingProvider(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 2, marginTop: -2 }}
              >
                ×
              </button>
            </div>

            {pendingDef.guide && (
              <div style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderLeft: '3px solid rgba(129,140,248,0.5)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>
                {pendingDef.guide}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {pendingDef.fields.filter((f) => f.required).map((f) => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={fields[f.key] ?? ''}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConnect() }}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--text-sm)',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.5)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                fontSize: 'var(--text-xs)',
                color: '#f87171',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingProvider(null)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                style={{
                  padding: '8px 20px',
                  background: connecting ? 'rgba(129,140,248,0.3)' : 'var(--color-accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {connecting ? 'Connecting…' : `Connect ${pendingDef.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
