import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'prompt'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [session, setSession] = useState(null);
    const [newKeyDetails, setNewKeyDetails] = useState(null);
    const [masterPrompt, setMasterPrompt] = useState('');
    const [savingPrompt, setSavingPrompt] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            if (data.session) {
                fetchAllData(data.session.access_token);
            } else {
                setError("Not authenticated");
                setLoading(false);
            }
        });
    }, []);

    const fetchAllData = async (token) => {
        setLoading(true);
        try {
            const [uRes, pRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/admin/master-prompt`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const [uData, pData] = await Promise.all([uRes.json(), pRes.json()]);

            if (!uRes.ok) {
                if (uRes.status === 401) {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                    return;
                }
                throw new Error(uData.error);
            }
            if (!pRes.ok) {
                if (pRes.status === 401) {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                    return;
                }
                throw new Error(pData.error);
            }

            setUsers(uData.users);
            setMasterPrompt(pData.master_prompt);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (userId, userEmail) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // Show the generated key
            setNewKeyDetails({ email: userEmail, key: data.plaintext_key });

            // Refresh user list
            fetchAllData(session.access_token);
        } catch (err) {
            alert(`Activation failed: ${err.message}`);
        }
    };

    const handleUpdateEntitlements = async (userId, limit, lifetime) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${userId}/entitlements`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    agent_limit: limit,
                    is_lifetime: lifetime
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert('User entitlements updated!');
            fetchAllData(session.access_token);
        } catch (err) {
            console.error('Update Plan Error:', err);
            alert(`Failed to update: ${err.message}`);
        }
    };

    const validateAndSavePrompt = async () => {
        const required = ['{agent_name}', '{company_name}', '{context}', '{questions}'];
        const missing = required.filter(v => !masterPrompt.includes(v));

        if (missing.length > 0) {
            alert(`Error: Missing mandatory variables: ${missing.join(', ')}. These are required for the system to function.`);
            return;
        }

        setSavingPrompt(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/master-prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ master_prompt: masterPrompt })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert('Global Personality Engine updated successfully!');
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingPrompt(false);
        }
    };

    if (loading) return <div className="dash-container">Loading Admin Portal...</div>;
    if (error) return <div className="dash-container error">{error}</div>;

    return (
        <div className="dash-container">
            <div className="dash-header">
                <div>
                    <h1>Gatekeeper Admin</h1>
                    <div className="tab-container">
                        <button
                            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >Registrations</button>
                        <button
                            className={`tab-btn ${activeTab === 'prompt' ? 'active' : ''}`}
                            onClick={() => setActiveTab('prompt')}
                        >Global Prompt</button>
                    </div>
                </div>
                <button onClick={() => supabase.auth.signOut()} className="btn secondary">Logout</button>
            </div>

            {newKeyDetails && (
                <div className="alert success">
                    <strong>User Activated: {newKeyDetails.email}</strong>
                    <p>Initial API Key (Show this to user securely. It will never be shown again):</p>
                    <div className="key-display">
                        <code>{newKeyDetails.key}</code>
                        <button onClick={() => navigator.clipboard.writeText(newKeyDetails.key)}>Copy</button>
                    </div>
                    <button className="btn outline" onClick={() => setNewKeyDetails(null)}>Dismiss</button>
                </div>
            )}

            {activeTab === 'users' ? (
                <div className="card">
                    <h2>Registered Tenants</h2>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Used / Limit</th>
                                    <th>Lifetime</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`badge ${user.is_active ? 'active' : 'inactive'}`}>
                                                {user.is_active ? 'Active' : 'Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{user.agent_count} / </span>
                                                <input
                                                    type="number"
                                                    defaultValue={user.agent_limit || 10}
                                                    id={`limit-${user.id}`}
                                                    style={{ width: '60px', background: 'rgba(0,0,0,0.3)', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                defaultChecked={user.is_lifetime}
                                                id={`lifetime-${user.id}`}
                                            />
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                {!user.is_active ? (
                                                    <button className="btn primary sm" onClick={() => handleActivate(user.id, user.email)}>Activate</button>
                                                ) : (
                                                    <button
                                                        className="btn outline sm"
                                                        onClick={() => {
                                                            const limit = document.getElementById(`limit-${user.id}`).value;
                                                            const lifetime = document.getElementById(`lifetime-${user.id}`).checked;
                                                            handleUpdateEntitlements(user.id, limit, lifetime);
                                                        }}
                                                    >Update Plan</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <h2>Global Personality Engine</h2>
                    <p className="text-muted sm">This prompt template applies to <strong>ALL</strong> agents on the platform. All variables below are mandatory.</p>

                    <div className="placeholder-tags mt-2">
                        <code>{'{agent_name}'}</code> <code>{'{company_name}'}</code> <code>{'{context}'}</code> <code>{'{questions}'}</code>
                    </div>

                    <textarea
                        value={masterPrompt}
                        onChange={(e) => setMasterPrompt(e.target.value)}
                        placeholder="You are a professional, friendly AI assistant named {agent_name} for {company_name}. Use the context: {context}. Ask questions: {questions}"
                        rows={15}
                        style={{ width: '100%', marginTop: '1.5rem', padding: '1.5rem', background: '#0a0a0f', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', lineHeight: '1.6', fontSize: '1rem', outline: 'none' }}
                    />

                    <div className="safety-note">
                        <strong>🛡️ System Guardrail:</strong> The immutable Functional Layer (Lead capture & session management) is automatically appended to this prompt to prevent breakage.
                    </div>

                    <div className="mt-4" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn primary"
                            disabled={savingPrompt}
                            onClick={validateAndSavePrompt}
                        >
                            {savingPrompt ? 'Deploying...' : 'Update Platform-Wide Persona'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
