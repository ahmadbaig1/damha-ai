import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { ToneConfig } from '../api/settings'
import { HELPDESK_PROVIDERS, getProvider } from '../lib/helpdeskProviders'

const FORMALITY_OPTIONS: ToneConfig['formality'][] = ['casual', 'professional', 'formal']
const EMOJI_OPTIONS: ToneConfig['emojiPolicy'][] = ['encouraged', 'neutral', 'discouraged', 'never']

const HUMANNESS_LABELS: Record<number, string> = {
  1: 'Formal',
  2: 'Professional',
  3: 'Balanced',
  4: 'Warm',
  5: 'Very Human',
}

export default function Settings() {
  const { toneConfig, kbOnly, hasCustomKey, helpdeskProvider, helpdeskConfig, loading, saving, saved, fetch, save } = useSettingsStore()
  const user = useAuthStore((s) => s.user)
  const isLead = user?.role === 'lead'

  const [local, setLocal] = useState<ToneConfig | null>(null)
  const [localKbOnly, setLocalKbOnly] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [forbidden, setForbidden] = useState('')

  // Helpdesk auth fields
  const [hdProvider, setHdProvider] = useState('zendesk')
  const [hdFields, setHdFields] = useState<Record<string, string>>({})
  const [hdSaving, setHdSaving] = useState(false)
  const [hdSaved, setHdSaved] = useState(false)

  useEffect(() => { fetch() }, [])
  useEffect(() => {
    if (toneConfig) setLocal({ ...toneConfig })
    setLocalKbOnly(kbOnly)
    setHdProvider(helpdeskProvider ?? 'zendesk')
    setHdFields({
      subdomain: helpdeskConfig?.subdomain ?? '',
      email:     helpdeskConfig?.email     ?? '',
      appId:     helpdeskConfig?.appId     ?? '',
      keyId:     helpdeskConfig?.keyId     ?? '',
    })
  }, [toneConfig, kbOnly, helpdeskProvider, helpdeskConfig])

  function update<K extends keyof ToneConfig>(key: K, value: ToneConfig[K]) {
    setLocal((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  function addForbidden() {
    const phrase = forbidden.trim()
    if (!phrase || !local) return
    if (!local.forbiddenPhrases.includes(phrase)) {
      update('forbiddenPhrases', [...local.forbiddenPhrases, phrase])
    }
    setForbidden('')
  }

  function removeForbidden(phrase: string) {
    update('forbiddenPhrases', local!.forbiddenPhrases.filter((p) => p !== phrase))
  }

  function handleSave() {
    if (!local) return
    save({
      toneConfig: local,
      kbOnly: localKbOnly,
      ...(apiKey ? { anthropicKey: apiKey } : {}),
    })
    setApiKey('')
  }

  async function handleHdSave() {
    setHdSaving(true)
    setHdSaved(false)
    const config: Record<string, string> = {}
    const provider = getProvider(hdProvider)
    if (provider) {
      for (const f of provider.fields) {
        if (hdFields[f.key]) config[f.key] = hdFields[f.key]
      }
    }
    await save({ helpdeskProvider: hdProvider, helpdeskConfig: config })
    setHdSaving(false)
    setHdSaved(true)
    setTimeout(() => setHdSaved(false), 2000)
  }

  if (loading || !local) {
    return (
      <div style={pageStyle}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Settings
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            {!isLead && 'Read-only — team leads can edit.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* --- AI BEHAVIOUR --- */}
          <Section label="AI Behaviour">
            {/* Humanness slider */}
            <Field label={`Human-likeness — ${HUMANNESS_LABELS[local.humanness ?? 3]}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', width: 40 }}>Formal</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={local.humanness ?? 3}
                  disabled={!isLead}
                  onChange={(e) => update('humanness', Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: isLead ? 'pointer' : 'not-allowed' }}
                />
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', width: 60, textAlign: 'right' }}>Human</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {[1,2,3,4,5].map((n) => (
                  <span key={n} style={{ fontSize: 10, color: (local.humanness ?? 3) === n ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', width: 20, textAlign: 'center' }}>{n}</span>
                ))}
              </div>
            </Field>

            {/* Formality */}
            <Field label="Formality">
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {FORMALITY_OPTIONS.map((opt) => (
                  <button key={opt} disabled={!isLead} onClick={() => update('formality', opt)} style={chipStyle(local.formality === opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>

            {/* Emoji policy */}
            <Field label="Emoji Policy">
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {EMOJI_OPTIONS.map((opt) => (
                  <button key={opt} disabled={!isLead} onClick={() => update('emojiPolicy', opt)} style={chipStyle(local.emojiPolicy === opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>

            {/* Sign-off */}
            <Field label="Sign-off (optional)">
              <input value={local.signOff ?? ''} onChange={(e) => update('signOff', e.target.value || null)} disabled={!isLead} placeholder="e.g. Thanks, Ahmad" style={inputStyle} />
            </Field>

            {/* Forbidden phrases */}
            <Field label="Forbidden Phrases">
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <input
                  value={forbidden}
                  onChange={(e) => setForbidden(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addForbidden() } }}
                  disabled={!isLead}
                  placeholder="Type phrase and press Enter"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {isLead && <button onClick={addForbidden} style={addBtnStyle}>Add</button>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                {local.forbiddenPhrases.map((phrase) => (
                  <span key={phrase} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 100, padding: '3px 10px', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>
                    {phrase}
                    {isLead && (
                      <button onClick={() => removeForbidden(phrase)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    )}
                  </span>
                ))}
              </div>
            </Field>

            {/* Custom instructions */}
            <Field label="Custom Instructions (optional)">
              <textarea value={local.customInstructions ?? ''} onChange={(e) => update('customInstructions', e.target.value || null)} disabled={!isLead} placeholder="Any additional tone guidance for the AI…" rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
            </Field>
          </Section>

          {/* --- KNOWLEDGE --- */}
          <Section label="Knowledge">
            <Field label="Investigation Mode">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: isLead ? 'pointer' : 'not-allowed' }}>
                <input
                  type="checkbox"
                  checked={localKbOnly}
                  disabled={!isLead}
                  onChange={(e) => setLocalKbOnly(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent)', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                  Use Knowledge Base only
                </span>
              </label>
              <p style={{ margin: '4px 0 0 28px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {localKbOnly
                  ? 'Investigations will only search your KB articles — no live site checks or plugin lookups.'
                  : 'Investigations search the KB and also run live checks (site status, plugins, etc.).'}
              </p>
            </Field>
          </Section>

          {/* --- HELPDESK AUTH --- */}
          <Section label="Authentication">
            <Field label="Helpdesk Platform">
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {HELPDESK_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    disabled={!isLead || !p.available}
                    onClick={() => { if (p.available) { setHdProvider(p.id); setHdFields({}) } }}
                    style={{
                      ...chipStyle(hdProvider === p.id),
                      opacity: p.available ? 1 : 0.4,
                      cursor: !isLead || !p.available ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                  >
                    {p.name}
                    {!p.available && (
                      <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', marginLeft: 4, color: 'inherit', opacity: 0.7 }}>soon</span>
                    )}
                  </button>
                ))}
              </div>
            </Field>

            {(() => {
              const provider = getProvider(hdProvider)
              if (!provider?.available) return null
              return provider.fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  <input
                    type={f.type}
                    value={hdFields[f.key] ?? ''}
                    onChange={(e) => setHdFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    disabled={!isLead}
                    placeholder={
                      (f.key === 'apiToken' && helpdeskConfig?.hasApiToken) ||
                      (f.key === 'secretKey' && helpdeskConfig?.hasSecretKey)
                        ? '••••••••••••  (saved — enter new to replace)'
                        : f.placeholder
                    }
                    style={inputStyle}
                  />
                </Field>
              ))
            })()}

            {isLead && (
              <button
                onClick={handleHdSave}
                disabled={hdSaving}
                style={{
                  background: hdSaved ? 'var(--color-success)' : 'var(--color-accent)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                  padding: '9px', fontSize: 'var(--text-sm)', fontWeight: 600,
                  cursor: hdSaving ? 'not-allowed' : 'pointer', opacity: hdSaving ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(129,140,248,0.3)', transition: 'background 0.2s',
                }}
              >
                {hdSaved ? '✓ Saved' : hdSaving ? 'Saving…' : 'Save Credentials'}
              </button>
            )}
          </Section>

          {/* --- API --- */}
          {isLead && (
            <Section label="Anthropic API Key">
              <Field label={hasCustomKey ? 'Custom key active — enter a new one to replace' : 'Use your own Anthropic API key'}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-…"
                  style={inputStyle}
                />
                <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  Leave blank to keep the current key. The key is stored server-side and never returned to the browser.
                </p>
              </Field>
            </Section>
          )}

          {isLead && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saved ? 'var(--color-success)' : 'var(--color-accent)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                padding: '10px', fontSize: 'var(--text-sm)', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(129,140,248,0.3)', transition: 'background 0.2s',
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Settings'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-2)' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center',
  padding: 'var(--space-8) var(--space-4)',
}

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 560,
  background: 'rgba(255,255,255,0.09)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 'var(--radius-xl)',
  padding: 'var(--space-8)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  alignSelf: 'flex-start',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
  fontSize: 'var(--text-sm)', padding: '9px var(--space-3)', outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
}

const addBtnStyle: React.CSSProperties = {
  background: 'var(--color-accent-subtle)', border: '1px solid rgba(129,140,248,0.3)',
  borderRadius: 'var(--radius-md)', color: 'var(--color-accent)',
  fontSize: 'var(--text-sm)', fontWeight: 600, padding: '9px var(--space-3)',
  cursor: 'pointer', flexShrink: 0,
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'var(--color-accent)' : 'var(--color-surface)',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 100, color: active ? '#fff' : 'var(--color-text-secondary)',
    fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 400, padding: '5px 12px',
    cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
  }
}
