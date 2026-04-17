import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VoiceSession from './pages/VoiceSession'
import Auth from './pages/Auth'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import { supabase } from './lib/supabase'
import './pages/Landing.css'

const MOCK_SESSIONS = [
  { initials: 'AK', name: 'agent-alpha', meta: 'customer-support · 3m 12s', badge: 'mbadge-active',   label: 'Active' },
  { initials: 'BT', name: 'agent-beta',  meta: 'sales-outreach · 7m 44s',  badge: 'mbadge-complete', label: 'Completed' },
  { initials: 'CG', name: 'agent-gamma', meta: 'onboarding · queued',       badge: 'mbadge-pending',  label: 'Pending' },
]

function RequestAccessModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ name: '', company: '', email: '', number: '', role: '', purpose: '' })
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAlert(null)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API_BASE}/api/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')
      setAlert({ type: 'success', text: data.message })
      setTimeout(() => {
        setFormData({ name: '', company: '', email: '', number: '', role: '', purpose: '' })
        setAlert(null)
      }, 3000)
    } catch (err) {
      setAlert({ type: 'error', text: err.message || 'Error submitting request. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-hd">
          <div className="modal-hd-text">
            <h2 className="modal-hd-title">Request API Access</h2>
            <p className="modal-hd-sub">We'll review and send you a private key.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {alert && (
          <div className={`modal-alert ${alert.type}`}>
            {alert.type === 'success' ? '✓ ' : '✕ '}{alert.text}
          </div>
        )}

        <form className="mform" onSubmit={handleSubmit}>
          <div className="mform-row">
            <div className="mfield">
              <label>Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Your name" />
            </div>
            <div className="mfield">
              <label>Company *</label>
              <input type="text" name="company" value={formData.company} onChange={handleChange} required placeholder="Your company" />
            </div>
          </div>

          <div className="mform-row">
            <div className="mfield">
              <label>Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@company.com" />
            </div>
            <div className="mfield">
              <label>Phone *</label>
              <input type="tel" name="number" value={formData.number} onChange={handleChange} required placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          <div className="mfield">
            <label>Role *</label>
            <input type="text" name="role" value={formData.role} onChange={handleChange} required placeholder="e.g., Developer, Founder, PM" />
          </div>

          <div className="mfield">
            <label>Purpose <span style={{ textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>(optional)</span></label>
            <textarea name="purpose" value={formData.purpose} onChange={handleChange} placeholder="Tell us how you plan to use the Voice Agent API..." />
          </div>

          <button type="submit" className="mform-submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Request →'}
          </button>
        </form>
      </div>
    </div>
  )
}

function LandingPage({ session, onRequestAccess }) {
  return (
    <div className="landing">
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />

      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Invite Only
        </div>

        <h1 className="hero-title">
          <span className="hero-title-main">Voice Agent</span>
          <span className="hero-title-sub">Infrastructure as a Service</span>
        </h1>

        <p className="hero-desc">
          One API call deploys a live voice agent. Your users talk, your agents act.
          No infrastructure to manage.
        </p>

        <button className="hero-cta" onClick={() => session ? window.location.href = '/redirect' : onRequestAccess()}>
          {session ? 'Go to Dashboard →' : 'Request API Access →'}
        </button>
      </section>

      <div className="mockup-wrap">
        <div className="mockup">
          <div className="mockup-titlebar">
            <span className="mdot mdot-r" />
            <span className="mdot mdot-y" />
            <span className="mdot mdot-g" />
            <span className="mockup-titlebar-label">Voice Agent Dashboard</span>
          </div>
          <div className="mockup-body">
            <div className="mockup-stats">
              <div className="mstat">
                <div className="mstat-label">API Calls</div>
                <div className="mstat-value">1,284</div>
                <div className="mstat-delta">+12% this week</div>
              </div>
              <div className="mstat">
                <div className="mstat-label">Active Sessions</div>
                <div className="mstat-value">47</div>
                <div className="mstat-delta">Live now</div>
              </div>
              <div className="mstat">
                <div className="mstat-label">Uptime</div>
                <div className="mstat-value">99.9%</div>
                <div className="mstat-delta neutral">All systems go</div>
              </div>
              <div className="mstat">
                <div className="mstat-label">Avg Latency</div>
                <div className="mstat-value">180ms</div>
                <div className="mstat-delta">−8ms vs last week</div>
              </div>
            </div>

            <div className="mockup-sessions">
              <div className="msessions-hd">
                <span className="msessions-title">Recent Sessions</span>
                <span className="live-pill"><span className="live-dot" />Live</span>
              </div>
              {MOCK_SESSIONS.map((row) => (
                <div key={row.name} className="mrow">
                  <div className="mrow-avatar">{row.initials}</div>
                  <div className="mrow-info">
                    <div className="mrow-name">{row.name}</div>
                    <div className="mrow-meta">{row.meta}</div>
                  </div>
                  <span className={`mbadge ${row.badge}`}>{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL
  const isAdmin = (email) => email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <>
            <LandingPage session={session} onRequestAccess={() => setShowModal(true)} />
            <RequestAccessModal isOpen={showModal} onClose={() => setShowModal(false)} />
          </>
        } />

        <Route path="/redirect" element={
          session
            ? isAdmin(session.user.email) ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
            : <Navigate to="/" replace />
        } />

        <Route path="/voice-session/:uuid" element={<VoiceSession />} />
        <Route path="/auth" element={<Auth />} />

        <Route path="/dashboard" element={
          session
            ? isAdmin(session.user.email) ? <Navigate to="/admin" replace /> : <UserDashboard />
            : <Auth />
        } />

        <Route path="/admin" element={
          session
            ? isAdmin(session.user.email) ? <AdminDashboard /> : <Navigate to="/dashboard" replace />
            : <Auth />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
