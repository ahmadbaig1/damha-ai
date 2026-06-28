import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getHealth, type HealthResponse } from './api'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Workspace from './pages/Workspace'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError('Server unreachable'))
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div style={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'var(--color-bg)',
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
                <span style={{
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text-primary)',
                }}>
                  Auxly
                </span>

                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  opacity: 0.5,
                  letterSpacing: '0.01em',
                }}>
                  The intelligence layer for support teams.
                </span>

                {user && (
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 500,
                  }}>
                    {user.name}
                  </span>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-secondary)',
                  }}>
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
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
