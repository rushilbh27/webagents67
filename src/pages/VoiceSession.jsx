import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { UltravoxSession } from 'ultravox-client';
import VoiceOrb from '../components/VoiceOrb';
import './VoiceSession.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function VoiceSession() {
    const { uuid } = useParams();
    const [status, setStatus] = useState('loading'); // loading | ready | connecting | active | ended | error
    const [agentStatus, setAgentStatus] = useState('');
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);
    const [savedData, setSavedData] = useState(null);
    const [localVolume, setLocalVolume] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    const sessionRef = useRef(null);
    const hasJoined = useRef(false);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Audio Analysis Loop (Isolated)
    const startAudioAnalysis = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);

                // Get average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // Scale 0-255 to 0-100 (and add a boost for sensitivity)
                const scaledVolume = Math.min(100, (average / 128) * 100 * 1.5);
                setLocalVolume(scaledVolume);

                // Update background glow opacity via CSS variable
                document.documentElement.style.setProperty('--bg-glow-opacity', (0.05 + (scaledVolume / 400)).toString());

                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };

            updateVolume();
            return stream;
        } catch (err) {
            console.error('Audio analysis failed:', err);
        }
    };

    // Fetch session config and create Ultravox call
    useEffect(() => {
        let micStream = null;

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

                // Start Visualizer
                micStream = await startAudioAnalysis();

                // Create UltravoxSession
                const session = new UltravoxSession();

                // Register saveAnswers as CLIENT-SIDE tool
                session.registerToolImplementation('saveAnswers', async (params) => {
                    console.log('saveAnswers invoked with:', params);
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
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            if (micStream) micStream.getTracks().forEach(track => track.stop());

            if (sessionRef.current) {
                sessionRef.current.leaveCall();
                hasJoined.current = false;
            }
        };
    }, [uuid]);

    function handleEndCall() {
        if (sessionRef.current) {
            sessionRef.current.leaveCall();
        }
        setStatus('ended');
    }

    function toggleMute() {
        if (sessionRef.current) {
            // isSpeakerMuted / muteSpeaker in SDK
            if (isMuted) {
                sessionRef.current.unmuteSpeaker();
            } else {
                sessionRef.current.muteSpeaker();
            }
            setIsMuted(!isMuted);
        }
    }

    // Status label for header
    const statusLabels = {
        loading: 'Initializing...',
        ready: 'Syncing...',
        connecting: 'Connecting...',
        active: agentStatus === 'speaking' ? 'Agent Speaking' : 'Listening...',
        ended: 'Session Closed',
        error: 'Engine Error'
    };

    return (
        <div className="voice-session">
            <div className="session-container">
                <div className="session-header">
                    <h1>{config?.business_name || 'AI Assistant'}</h1>
                    <p className="session-subtitle">Professional Voice Agent</p>
                </div>

                {/* The Premium Orb */}
                <VoiceOrb
                    volume={status === 'active' ? localVolume : 0}
                    status={status === 'active' ? (agentStatus === 'speaking' ? 'speaking' : 'active') : status}
                />

                <div className="session-status">
                    <span className={`status-dot ${status}`}></span>
                    <span className="status-label">{statusLabels[status]}</span>
                </div>

                {/* Error Box */}
                {status === 'error' && (
                    <div className="error-box">
                        <p>{error}</p>
                    </div>
                )}

                {/* Controls */}
                <div className="controls-area">
                    {status === 'active' && (
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <button
                                className={`end-call-btn ${isMuted ? 'muted' : ''}`}
                                onClick={toggleMute}
                                style={{ background: isMuted ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', color: isMuted ? '#fff' : 'rgba(255,255,255,0.4)' }}
                            >
                                {isMuted ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" /></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                )}
                            </button>

                            <button className="end-call-btn" onClick={handleEndCall}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                                    <line x1="23" y1="1" x2="1" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Premium Saved Data View */}
                {savedData && (
                    <div className="saved-data">
                        <h3><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Lead Captured</h3>

                        <div className="data-grid">
                            <div className="data-card">
                                <span className="data-label">Full Name</span>
                                <span className="data-value">{savedData.client_name}</span>
                            </div>
                            <div className="data-card">
                                <span className="data-label">Phone</span>
                                <span className="data-value">{savedData.phone_number}</span>
                            </div>
                        </div>

                        {savedData.responses && savedData.responses.length > 0 && (
                            <div className="responses-container">
                                {savedData.responses.map((r, i) => (
                                    <div key={i} className="response-card">
                                        <div className="data-label">Question {i + 1}</div>
                                        {r}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Final ended state */}
                {status === 'ended' && !savedData && (
                    <div className="saved-data" style={{ textAlign: 'center' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)' }}>The conversation has concluded.</p>
                        <button onClick={() => window.location.reload()} className="btn outline sm" style={{ marginTop: '1rem' }}>Restart Call</button>
                    </div>
                )}
            </div>
        </div>
    );
}
