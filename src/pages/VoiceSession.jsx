import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { UltravoxSession } from 'ultravox-client';
import './VoiceSession.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function VoiceSession() {
    const { uuid } = useParams();
    const [status, setStatus] = useState('loading'); // loading | ready | connecting | active | ended | error
    const [agentStatus, setAgentStatus] = useState('');
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);
    const [savedData, setSavedData] = useState(null);
    const sessionRef = useRef(null);
    const hasJoined = useRef(false);

    // Fetch session config and create Ultravox call
    useEffect(() => {
        async function initSession() {
            if (hasJoined.current) return;
            hasJoined.current = true;

            try {
                const res = await fetch(`${API_BASE}/api/session/${uuid}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Session not found.');
                    setStatus('error');
                    return;
                }

                setConfig(data.config);
                setStatus('ready');

                // Create UltravoxSession
                const session = new UltravoxSession();

                // Register saveAnswers as CLIENT-SIDE tool
                session.registerToolImplementation('saveAnswers', async (params) => {
                    console.log('saveAnswers invoked with:', params);

                    // Immediately POST to our backend
                    try {
                        await fetch(`${API_BASE}/api/save-answers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                agent_config_id: uuid,
                                client_name: params.client_name,
                                phone_number: params.phone_number,
                                responses: params.responses
                            })
                        });
                    } catch (err) {
                        console.error('Failed to save answers to backend:', err);
                    }

                    setSavedData(params);
                    return 'Data saved successfully.';
                });

                // Register hangUp tool
                session.registerToolImplementation('hangUp', async () => {
                    console.log('hangUp tool invoked by agent. Leaving call...');
                    session.leaveCall();
                    return 'Call ended.';
                });

                // Listen to status changes
                session.addEventListener('status', () => {
                    const s = session.status;
                    setAgentStatus(s);
                    if (s === 'disconnected') {
                        setStatus('ended');
                    }
                });

                sessionRef.current = session;

                // Join the call
                setStatus('connecting');
                await session.joinCall(data.joinUrl);
                setStatus('active');

            } catch (err) {
                console.error('Init error:', err);
                setError('Failed to initialize voice session.');
                setStatus('error');
                hasJoined.current = false;
            }
        }

        initSession();

        return () => {
            // We don't want to leave the call just because React unmounted and remounted
            // the component in dev mode. We only leave if the user explicitly clicks End Call.
            // But for safety, if you navigate away completely, it should disconnect.
            if (sessionRef.current && status === 'ended') {
                sessionRef.current.leaveCall();
                hasJoined.current = false;
            }
        };
    }, [uuid]);

    function handleEndCall() {
        if (sessionRef.current) {
            sessionRef.current.leaveCall();
            sessionRef.current = null;
        }
        setStatus('ended');
    }

    // Status label for the orb
    const statusLabels = {
        loading: 'Initializing...',
        ready: 'Ready',
        connecting: 'Connecting...',
        active: agentStatus || 'Connected',
        ended: 'Call Ended',
        error: 'Error'
    };

    return (
        <div className="voice-session">
            <div className="session-container">
                {/* Header */}
                <div className="session-header">
                    <h1>{config?.business_name || 'Voice Assistant'}</h1>
                    <p className="session-subtitle">AI-Powered Voice Agent</p>
                </div>

                {/* Orb */}
                <div className="orb-area">
                    <div className={`orb ${status === 'active' ? 'orb-active' : 'orb-idle'}`}>
                        <div className="orb-inner"></div>
                    </div>
                    {status === 'active' && <div className="orb-pulse"></div>}
                </div>

                {/* Status */}
                <div className="session-status">
                    <span className={`status-dot ${status}`}></span>
                    <span className="status-label">{statusLabels[status]}</span>
                </div>

                {/* Error */}
                {status === 'error' && (
                    <div className="error-box">
                        <p>{error}</p>
                    </div>
                )}

                {/* Controls */}
                {status === 'active' && (
                    <button className="end-call-btn" onClick={handleEndCall}>
                        End Call
                    </button>
                )}

                {/* Saved Data Display */}
                {savedData && (
                    <div className="saved-data">
                        <h3>✅ Lead Captured</h3>
                        <div className="data-row"><strong>Name:</strong> {savedData.client_name}</div>
                        <div className="data-row"><strong>Phone:</strong> {savedData.phone_number}</div>
                        {savedData.responses && savedData.responses.length > 0 && (
                            <div className="responses-list">
                                <strong>Responses:</strong>
                                {savedData.responses.map((r, i) => (
                                    <div key={i} className="response-item">
                                        <span className="response-num">Q{i + 1}:</span> {r}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Ended state */}
                {status === 'ended' && !savedData && (
                    <div className="ended-message">
                        <p>The call has ended. Thank you.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
