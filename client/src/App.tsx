import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { getHealth, type HealthResponse } from './api'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'
import Login from './pages/Login'
import Workspace from './pages/Workspace'
import Settings from './pages/Settings'
import KnowledgePage from './pages/KnowledgePage'
import Dashboard from './pages/Dashboard'
import HelpdeskPicker from './pages/HelpdeskPicker'
import { HelpdeskSwitcher } from './components/HelpdeskSwitcher'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { user, clearAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)
  const { helpdeskConfig, fetch: fetchSettings, loading: settingsLoading, initialized: settingsInitialized } = useSettingsStore()

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setError('Server unreachable'))
  }, [])

  useEffect(() => {
    if (token) fetchSettings()
  }, [token])

  const needsHelpdeskSetup =
    !!token && settingsInitialized && !settingsLoading && !helpdeskConfig?.subdomain

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            {token && !settingsInitialized
              ? (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Loading…
                  </span>
                </div>
              )
              : needsHelpdeskSetup
              ? <HelpdeskPicker onDone={fetchSettings} />
              : (
                <div style={{
                  height: '100vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {/* Top bar */}
                  <header style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: '0 var(--space-6)',
                    height: 48,
                    background: 'var(--glass-bg-heavy)',
                    backdropFilter: 'var(--glass-blur)',
                    WebkitBackdropFilter: 'var(--glass-blur)',
                    borderBottom: '1px solid var(--glass-border)',
                    boxShadow: 'var(--shadow-sm)',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 10,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                      Auxly
                    </span>

                    <HelpdeskSwitcher />

                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', opacity: 0.5, letterSpacing: '0.01em' }}>
                      The intelligence layer for support teams.
                    </span>

                    <nav style={{ display: 'flex', gap: 'var(--space-1)', marginLeft: 'var(--space-4)' }}>
                      {([
                        { to: '/tickets', label: 'Workspace' },
                        { to: '/knowledge', label: 'Knowledge' },
                        { to: '/settings', label: 'Settings' },
                        ...(user?.role === 'lead' ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
                      ] as { to: string; label: string }[]).map(({ to, label }) => (
                        <NavLink
                          key={to}
                          to={to}
                          style={({ isActive }) => ({
                            fontSize: 'var(--text-xs)',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            textDecoration: 'none',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-md)',
                            background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                            transition: 'color 0.15s, background 0.15s',
                          })}
                        >
                          {label}
                        </NavLink>
                      ))}
                    </nav>

                    {user && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {user.name}
                      </span>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                        api:{' '}
                        {error
                          ? <span style={{ color: 'var(--color-danger)' }}>{error}</span>
                          : health
                            ? <span style={{ color: 'var(--color-success)' }}>{health.status}</span>
                            : <span>connecting…</span>}
                      </span>
                      <button
                        onClick={clearAuth}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 500,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-text-secondary)'
                          e.currentTarget.style.color = 'var(--color-text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)'
                          e.currentTarget.style.color = 'var(--color-text-secondary)'
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </header>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/tickets" replace />} />
                      <Route path="/tickets" element={<Workspace />} />
                      <Route path="/tickets/:id" element={<Workspace />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/knowledge" element={<KnowledgePage />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                    </Routes>
                  </div>
                </div>
              )
            }
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
