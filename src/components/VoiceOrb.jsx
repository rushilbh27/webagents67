import React, { useMemo } from 'react';
import './VoiceOrb.css';

/**
 * Premium ChatGPT-style Voice Orb
 * @param {number} volume - Real-time amplitude (0-100)
 * @param {string} status - current session status (idle, connecting, active, speaking)
 */
export default function VoiceOrb({ volume = 0, status = 'idle' }) {
    // Calculate pulse based on volume
    // We use a base scale + a dynamic boost from volume
    const baseScale = status === 'active' || status === 'speaking' ? 1.1 : 1.0;
    const volumeBoost = (volume / 100) * 0.4;
    const totalScale = baseScale + volumeBoost;

    // Determine colors based on status
    const orbColors = useMemo(() => {
        if (status === 'error') return ['#ef4444', '#991b1b'];
        if (status === 'connecting') return ['#f59e0b', '#d97706'];
        if (status === 'speaking') return ['#a855f7', '#6366f1']; // Agent is speaking
        if (status === 'active') return ['#6366f1', '#ec4899']; // User is listening/speaking
        return ['#374151', '#111827']; // Idle
    }, [status]);

    return (
        <div className={`voice-orb-wrapper ${status}`}>
            <svg viewBox="0 0 200 200" className="voice-orb-svg">
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                            result="goo"
                        />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>

                    <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={orbColors[0]} />
                        <stop offset="100%" stopColor={orbColors[1]} />
                    </linearGradient>
                </defs>

                <g filter="url(#goo)">
                    {/* Main Core */}
                    <circle
                        cx="100" cy="100" r="45"
                        fill="url(#orbGradient)"
                        style={{ transform: `scale(${totalScale})`, transformOrigin: 'center' }}
                    />

                    {/* Floating Blobs (React to volume) */}
                    {status === 'active' || status === 'speaking' ? (
                        <>
                            <circle className="blob blob-1" cx="100" cy="100" r="30" fill="url(#orbGradient)"
                                style={{ transform: `scale(${1 + volumeBoost * 2}) translate(${volume / 5}px, -${volume / 10}px)` }}
                            />
                            <circle className="blob blob-2" cx="100" cy="100" r="25" fill="url(#orbGradient)"
                                style={{ transform: `scale(${1 + volumeBoost * 1.5}) translate(-${volume / 8}px, ${volume / 5}px)` }}
                            />
                            <circle className="blob blob-3" cx="100" cy="100" r="20" fill="url(#orbGradient)"
                                style={{ transform: `scale(${1 + volumeBoost * 3}) translate(${volume / 12}px, ${volume / 8}px)` }}
                            />
                        </>
                    ) : null}
                </g>
            </svg>

            {/* Outer Ambient Glow */}
            <div
                className="orb-glow"
                style={{
                    background: `radial-gradient(circle, ${orbColors[0]}44 0%, transparent 70%)`,
                    transform: `scale(${1.2 + volumeBoost * 2})`
                }}
            ></div>
        </div>
    );
}
