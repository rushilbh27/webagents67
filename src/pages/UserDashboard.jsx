import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const FRONTEND_URL = window.location.origin;

export default function UserDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [session, setSession] = useState(null);
    const [newKey, setNewKey] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            if (data.session) {
                fetchDashboard(data.session.access_token);
            } else {
                setError("Not authenticated");
                setLoading(false);
            }
        });
    }, []);

    const fetchDashboard = async (token) => {
        try {
            const res = await fetch(`${API_BASE}/api/user/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dashData = await res.json();

            if (!res.ok) {
                if (res.status === 401) {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                    return;
                }
                throw new Error(dashData.error);
            }

            setData(dashData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateKey = async () => {
        if (!confirm("WARNING: This will immediately invalidate your current API key. Are you sure you want to generate a new one?")) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/user/regenerate-key`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error);

            setNewKey(result.plaintext_key);
            fetchDashboard(session.access_token); // refresh
        } catch (err) {
            alert(`Key regeneration failed: ${err.message}`);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        // Simple visual feedback could be added here
    };

    if (loading) return <div className="dash-container">Loading Dashboard...</div>;
    if (error) return <div className="dash-container error">{error}</div>;

    const { user, agents, leads } = data;

    // Progress Bar Logic
    const limit = 10;
    const count = user.agent_count;
    const progressPercent = Math.min((count / limit) * 100, 100);
    let progressColor = '#34d399'; // Green default
    if (count >= 5) progressColor = '#fbbf24'; // Yellow at 5
    if (count >= 8) progressColor = '#ef4444'; // Red at 8

    return (
        <div className="dash-container">
            <div className="dash-header">
                <h1>Dashboard</h1>
                <button onClick={() => supabase.auth.signOut()} className="btn secondary">Logout</button>
            </div>

            {!user.is_active ? (
                <div className="alert warning">
                    Your account is pending activation by the Admin. You cannot create agents until your account is verified.
                </div>
            ) : (
                <>
                    {/* Progress Bar & API Vault */}
                    <div className="dashboard-grid">
                        <div className="card">
                            <h2>API Usage</h2>
                            <div className="usage-stats">
                                <span className="usage-count">{count} / {limit} Agents</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${progressPercent}%`, backgroundColor: progressColor }}
                                ></div>
                            </div>
                            <p className="text-muted mt-2">Maximum limit: 10 active agents.</p>
                        </div>

                        <div className="card">
                            <h2>API Vault</h2>

                            {newKey ? (
                                <div className="alert success">
                                    <p>New key generated (shown once):</p>
                                    <div className="key-display">
                                        <code>{newKey}</code>
                                        <button onClick={() => handleCopy(newKey)}>Copy</button>
                                    </div>
                                    <button className="btn outline mt-2" onClick={() => setNewKey(null)}>I've copied it</button>
                                </div>
                            ) : (
                                <div className="api-vault-view">
                                    <code>{user.api_key_masked || 'No key generated yet'}</code>
                                    <div className="vault-actions">
                                        <button className="icon-btn" title="Regenerate Key" onClick={handleRegenerateKey}>👁️ Regenerate</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agents List */}
                    <div className="card mt-4">
                        <h2>Your Agents</h2>
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Business Name</th>
                                        <th>Context</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.length === 0 ? (
                                        <tr><td colSpan="4" className="text-muted text-center">No agents created yet.</td></tr>
                                    ) : agents.map(agent => {
                                        const sessionUrl = `${FRONTEND_URL}/voice-session/${agent.id}`;
                                        return (
                                            <tr key={agent.id}>
                                                <td><strong>{agent.business_name}</strong></td>
                                                <td className="truncate">{agent.business_context.substring(0, 50)}...</td>
                                                <td>{new Date(agent.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="btn outline sm" onClick={() => handleCopy(sessionUrl)}>Copy Link</button>
                                                        <a href={sessionUrl} target="_blank" rel="noreferrer" className="btn primary sm">Test Call</a>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Lead Management */}
                    <div className="card mt-4">
                        <h2>Captured Leads</h2>
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Agent</th>
                                        <th>Name</th>
                                        <th>Phone</th>
                                        <th>Responses</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.length === 0 ? (
                                        <tr><td colSpan="5" className="text-muted text-center">No leads captured yet.</td></tr>
                                    ) : leads.map(lead => (
                                        <tr key={lead.id}>
                                            <td>{new Date(lead.created_at).toLocaleString()}</td>
                                            <td>{lead.agent_name}</td>
                                            <td>{lead.client_name}</td>
                                            <td>{lead.phone_number}</td>
                                            <td>
                                                <div className="response-tags">
                                                    {lead.responses.map((r, i) => <span key={i} className="tag">{r}</span>)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
