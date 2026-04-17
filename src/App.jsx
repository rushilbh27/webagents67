import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VoiceSession from './pages/VoiceSession'
import Auth from './pages/Auth'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import { supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null;

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

  // Helper to determine if a user is an admin
  const isAdmin = (email) => email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase();

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050508',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            textAlign: 'center',
            padding: '2rem'
          }}>
            <div style={{ maxWidth: '600px', background: 'rgba(255,255,255,0.03)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h1 style={{
                fontSize: '3.5rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, #fff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1rem'
              }}>Voice Agent IaaS</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', lineHeight: 1.5 }}>
                Request access and receive a private API key from us. No public signup is available.
              </p>

              <div style={{ marginTop: '2.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-block' }}>
                <code style={{ color: '#a78bfa', fontSize: '0.9rem' }}>POST /api/create-agent</code>
                <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0.5rem' }}>→</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>Get session link</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0.5rem' }}>→</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>Share with user</span>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <a href={session ? "/redirect" : `mailto:${ADMIN_EMAIL}?subject=Request%20API%20Access`} style={{
                  display: 'inline-block',
                  background: '#9333ea',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}>
                  {session ? 'Go to Dashboard' : 'Request API Access'}
                </a>
              </div>
            </div>
          </div>
        } />

        {/* The Redirect Bouncer */}
        <Route path="/redirect" element={
          session ? (
            isAdmin(session.user.email) ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
          ) : <Navigate to="/" replace />
        } />

        {/* Public Voice Agent Session */}
        <Route path="/voice-session/:uuid" element={<VoiceSession />} />

        {/* Auth Page: Now just a landing for those redirected from home */}
        <Route path="/auth" element={<Auth />} />

        {/* Protected Dashboard Route with Deportation Guard */}
        <Route path="/dashboard" element={
          session ? (
            isAdmin(session.user.email) ? <Navigate to="/admin" replace /> : <UserDashboard />
          ) : <Auth />
        } />

        {/* Admin Dashboard Route with Deportation Guard */}
        <Route path="/admin" element={
          session ? (
            isAdmin(session.user.email) ? <AdminDashboard /> : <Navigate to="/dashboard" replace />
          ) : <Auth />
        } />


      </Routes>
    </BrowserRouter>
  )
}

export default App;
