import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VoiceSession from './pages/VoiceSession'
import Auth from './pages/Auth'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import { supabase } from './lib/supabase'

function RequestAccessModal({ isOpen, onClose, adminEmail }) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    number: '',
    role: '',
    purpose: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const API_BASE = import.meta.env.VITE_API_URL || ''
      
      const res = await fetch(`${API_BASE}/api/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }

      setMessage('✅ ' + data.message)
      setTimeout(() => {
        setFormData({ name: '', company: '', email: '', number: '', role: '', purpose: '' })
        setMessage('')
      }, 3000)
    } catch (err) {
      setMessage('❌ ' + (err.message || 'Error submitting request. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>Request API Access</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}>✕</button>
        </div>

        {message && (
          <div style={{
            background: message.includes('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            border: `1px solid ${message.includes('Error') ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
            color: message.includes('Error') ? '#fca5a5' : '#86efac',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#ddd', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Your name"
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#ddd', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Company *
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Your company"
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#ddd', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#ddd', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Phone Number *
            </label>
            <input
              type="tel"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#ddd', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Role *
            </label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="e.g., Product Manager, Developer, Founder"
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#ddd', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Purpose (Optional)
            </label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box',
                minHeight: '80px',
                fontFamily: "'Inter', sans-serif",
                resize: 'vertical'
              }}
              placeholder="Tell us how you plan to use the Voice Agent API..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#9333ea',
              color: '#fff',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '1rem',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Preparing...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)

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
                <button
                  onClick={() => session ? window.location.href = '/redirect' : setShowRequestModal(true)}
                  style={{
                    display: 'inline-block',
                    background: '#9333ea',
                    color: '#fff',
                    border: 'none',
                    textDecoration: 'none',
                    padding: '0.8rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#7e22ce'}
                  onMouseLeave={(e) => e.target.style.background = '#9333ea'}
                >
                  {session ? 'Go to Dashboard' : 'Request API Access'}
                </button>
              </div>

              <RequestAccessModal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} adminEmail={ADMIN_EMAIL} />
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
