import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { UltravoxSession } from 'ultravox-client';
import VoiceOrb from '../components/VoiceOrb';
import './VoiceSession.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* ── Icons ── */
const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
);
const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
);
const HangUpIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
        <line x1="23" y1="1" x2="1" y2="23"/>
    </svg>
);

export default function VoiceSession() {
    const { uuid } = useParams();
    const [status, setStatus] = useState('loading');
    const [agentStatus, setAgentStatus] = useState('');
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);
    const [savedData, setSavedData] = useState(null);
    const [localVolume, setLocalVolume] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [transcripts, setTranscripts] = useState([]);

    const sessionRef = useRef(null);
    const hasJoined = useRef(false);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const transcriptContainerRef = useRef(null);
    const callIdRef = useRef(null);
    const callStartTimeRef = useRef(null);

    // Auto-scroll transcripts
    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcripts]);

    // Audio Analysis Loop
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

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // Gentle sensitivity for smooth orb motion
                const scaledVolume = Math.min(100, (average / 128) * 100 * 1.0);
                setLocalVolume(scaledVolume);

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
                callIdRef.current = data.callId || null;

                // Start Visualizer
                micStream = await startAudioAnalysis();

                // Create UltravoxSession
                const session = new UltravoxSession();

                // Register saveAnswers as CLIENT-SIDE tool
                session.registerToolImplementation('saveAnswers', async (params) => {
                    console.log('saveAnswers invoked with:', params);

                    // Calculate call duration in seconds
                    const callDuration = callStartTimeRef.current
                        ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
                        : null;

                    try {
                        await fetch(`${API_BASE}/api/save-answers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                agent_config_id: uuid,
                                client_name: params.client_name,
                                phone_number: params.phone_number,
                                responses: params.responses,
                                call_id: callIdRef.current,
                                call_duration: callDuration
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

                // Listen to transcripts
                session.addEventListener('transcripts', () => {
                    const txts = session.transcripts;
                    if (txts && txts.length > 0) {
                        setTranscripts([...txts]);
                    }
                });

                sessionRef.current = session;

                // Join the call
                setStatus('connecting');
                await session.joinCall(data.joinUrl);
                callStartTimeRef.current = Date.now();
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

    // Determine the orb status key
    const orbStatus = status === 'active'
        ? (agentStatus === 'speaking' ? 'speaking' : 'active')
        : status === 'ended' ? 'idle' : status;

    // Status labels
    const statusLabels = {
        loading: 'Initializing...',
        ready: 'Syncing...',
        connecting: 'Connecting...',
        active: agentStatus === 'speaking' ? 'Agent Speaking' : 'Listening...',
        ended: 'Session Closed',
        error: 'Engine Error'
    };

    // Latest transcript text
    const lastTranscript = transcripts.length > 0 ? transcripts[transcripts.length - 1] : null;

    return (
        <div className={`voice-session ${isDarkMode ? 'dark' : 'light'}`}>
            {/* Theme toggle */}
            <button
                className="theme-toggle"
                onClick={() => setIsDarkMode(d => !d)}
                aria-label="Toggle theme"
            >
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className="session-container">
                <div className="session-header">
                    <p className="session-subtitle">Welcome to</p>
                    <h1>{config?.business_name || 'AI Assistant'}</h1>
                </div>

                {/* The Fluid Orb */}
                <VoiceOrb
                    volume={status === 'active' ? localVolume : 0}
                    status={orbStatus}
                    isDark={isDarkMode}
                />

                {/* Status */}
                <div className="session-status">
                    <span className={`status-dot ${status}`} />
                    <span className="status-label">{statusLabels[status]}</span>
                </div>

                {/* Live transcript */}
                {lastTranscript && status === 'active' && (
                    <div className="transcript-area" ref={transcriptContainerRef}>
                        <p className={`transcript-text ${lastTranscript.speaker === 'agent' ? 'agent' : 'user'}`}>
                            {lastTranscript.text}
                        </p>
                    </div>
                )}

                {/* Error */}
                {status === 'error' && (
                    <div className="error-box">
                        <p>{error}</p>
                    </div>
                )}

                {/* Controls — only hang up */}
                <div className="controls-area">
                    {status === 'active' && (
                        <button className="end-call-btn" onClick={handleEndCall}>
                            <HangUpIcon />
                        </button>
                    )}
                </div>

                {/* Saved data display */}
                {savedData && (
                    <div className="saved-data">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                            Thank you for your time!
                        </h3>
                        <p className="saved-data-description">
                            Thank you for reaching out. Our team will be in touch with you shortly.
                        </p>
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

                {/* Ended state */}
                {status === 'ended' && !savedData && (
                    <div className="saved-data" style={{ textAlign: 'center' }}>
                        <p className="ended-text">The conversation has concluded.</p>
                        <button onClick={() => window.location.reload()} className="restart-btn">Restart Call</button>
                    </div>
                )}
            </div>
        </div>
    );
}
