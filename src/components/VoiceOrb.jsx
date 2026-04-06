import { useRef, useEffect, useCallback } from 'react';
import './VoiceOrb.css';

/* ── Simplex-style 3D noise (compact) ── */
const GRAD3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];
const P = Array.from({ length: 256 }, () => Math.floor(Math.random() * 256));
const PERM = [...P, ...P];

function dot3(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }

function noise3D(x, y, z) {
    const F3 = 1/3, G3 = 1/6;
    const s = (x+y+z)*F3;
    const i = Math.floor(x+s), j = Math.floor(y+s), k = Math.floor(z+s);
    const t = (i+j+k)*G3;
    const X0 = i-t, Y0 = j-t, Z0 = k-t;
    const x0 = x-X0, y0 = y-Y0, z0 = z-Z0;
    let i1,j1,k1,i2,j2,k2;
    if (x0>=y0){if(y0>=z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0}else if(x0>=z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1}else{i1=0;j1=0;k1=1;i2=1;j2=0;k2=1}}
    else{if(y0<z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1}else if(x0<z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1}else{i1=0;j1=1;k1=0;i2=1;j2=1;k2=0}}
    const x1=x0-i1+G3,y1=y0-j1+G3,z1=z0-k1+G3;
    const x2=x0-i2+2*G3,y2=y0-j2+2*G3,z2=z0-k2+2*G3;
    const x3=x0-1+3*G3,y3=y0-1+3*G3,z3=z0-1+3*G3;
    const ii=i&255,jj=j&255,kk=k&255;
    const gi0=PERM[ii+PERM[jj+PERM[kk]]]%12;
    const gi1=PERM[ii+i1+PERM[jj+j1+PERM[kk+k1]]]%12;
    const gi2=PERM[ii+i2+PERM[jj+j2+PERM[kk+k2]]]%12;
    const gi3=PERM[ii+1+PERM[jj+1+PERM[kk+1]]]%12;
    const contrib = (g,x,y,z) => { const t = 0.6-x*x-y*y-z*z; return t<0?0:t*t*t*t*dot3(GRAD3[g],x,y,z); };
    return 32*(contrib(gi0,x0,y0,z0)+contrib(gi1,x1,y1,z1)+contrib(gi2,x2,y2,z2)+contrib(gi3,x3,y3,z3));
}

/* ── Color palettes ── */
const COLORS = {
    active:    { from: [52, 211, 153], to: [16, 185, 129] },
    speaking:  { from: [59, 130, 246], to: [99, 102, 241] },
    idle:      { from: [148, 163, 184], to: [100, 116, 139] },
    connecting:{ from: [251, 191, 36],  to: [245, 158, 11] },
    error:     { from: [239, 68, 68],   to: [220, 38, 38] },
};

function lerpColor(a, b, t) {
    return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

export default function VoiceOrb({ volume = 0, status = 'idle', isDark = false }) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const smoothVolRef = useRef(0);
    const prevColorRef = useRef(null);
    const colorTRef = useRef(0);

    // ── Refs so draw() never goes stale ──
    const volumeRef = useRef(volume);
    const statusRef = useRef(status);

    useEffect(() => { volumeRef.current = volume; }, [volume]);
    useEffect(() => { statusRef.current = status; }, [status]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;
        const cx = W / 2;
        const cy = H / 2;
        const baseR = Math.min(W, H) * 0.3;

        // Read from refs — not props
        const vol = (() => {
            smoothVolRef.current += (volumeRef.current - smoothVolRef.current) * 0.03;
            return smoothVolRef.current;
        })();

        const currentStatus = statusRef.current;
        const palette = COLORS[currentStatus] || COLORS.idle;

        if (prevColorRef.current !== palette) {
            colorTRef.current = 0;
            prevColorRef.current = palette;
        }
        colorTRef.current = Math.min(1, colorTRef.current + 0.02);

        const time = performance.now() / 1000;

        ctx.clearRect(0, 0, W, H);

        // ── Outer glow (clipped to circle so no square edge) ──
        const glowR = baseR * (1.5 + vol / 100 * 0.4);
        const glowAlpha = 0.06 + vol / 100 * 0.08;
        const gc = lerpColor(palette.from, palette.to, 0.5);
        const glow = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, glowR);
        glow.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},${glowAlpha})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // ── Smooth blob layers ──
        const POINTS = 64;
        for (let layer = 2; layer >= 0; layer--) {
            const layerRatio = 1 - layer * 0.12;
            const noiseFreq = 0.55 + layer * 0.1;   // very low freq = smooth
            const noiseAmp = (2 + vol / 100 * 6) * layerRatio; // subtle amplitude
            const phaseOffset = layer * 2.1;
            const r = baseR * layerRatio;
            const speed = 0.35 + vol / 100 * 0.2; // slow evolving motion

            // Sample noise points around the circle
            const radii = [];
            for (let i = 0; i < POINTS; i++) {
                const angle = (i / POINTS) * Math.PI * 2;
                const nx = Math.cos(angle) * noiseFreq;
                const ny = Math.sin(angle) * noiseFreq;
                const n = noise3D(nx + phaseOffset, ny + phaseOffset, time * speed);
                radii.push(r + n * noiseAmp);
            }

            // Draw with smooth quadratic bezier curves
            ctx.beginPath();
            for (let i = 0; i < POINTS; i++) {
                const a0 = (i / POINTS) * Math.PI * 2;
                const a1 = ((i + 1) / POINTS) * Math.PI * 2;
                const r0 = radii[i];
                const r1 = radii[(i + 1) % POINTS];
                const x0 = cx + Math.cos(a0) * r0;
                const y0 = cy + Math.sin(a0) * r0;
                const x1 = cx + Math.cos(a1) * r1;
                const y1 = cy + Math.sin(a1) * r1;
                const midA = (a0 + a1) / 2;
                const midR = (r0 + r1) / 2;
                const cpx = cx + Math.cos(midA) * midR * 1.02;
                const cpy = cy + Math.sin(midA) * midR * 1.02;
                if (i === 0) ctx.moveTo(x0, y0);
                ctx.quadraticCurveTo(cpx, cpy, x1, y1);
            }
            ctx.closePath();

            const t = (Math.sin(time * 0.5 + layer) + 1) / 2;
            const c = lerpColor(palette.from, palette.to, t);
            const alpha = layer === 0 ? 0.92 : 0.18 - layer * 0.04;

            const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r * 1.3);
            grad.addColorStop(0, `rgba(${lerpColor(c, [255,255,255], 0.5).join(',')},${alpha})`);
            grad.addColorStop(0.6, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.85})`);
            grad.addColorStop(1, `rgba(${lerpColor(c, [0,0,0], 0.15).join(',')},${alpha * 0.6})`);

            ctx.fillStyle = grad;
            ctx.fill();
        }

        // ── Inner highlight (glass) ──
        const hlR = baseR * 0.5;
        const hl = ctx.createRadialGradient(cx - hlR * 0.25, cy - hlR * 0.4, 0, cx, cy, hlR);
        hl.addColorStop(0, 'rgba(255,255,255,0.30)');
        hl.addColorStop(0.4, 'rgba(255,255,255,0.06)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hl;
        ctx.beginPath();
        ctx.arc(cx, cy, hlR, 0, Math.PI * 2);
        ctx.fill();

        animRef.current = requestAnimationFrame(draw);
    }, []); // ← empty deps, loop never restarts

    useEffect(() => {
        animRef.current = requestAnimationFrame(draw);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [draw]);

    return (
        <div className={`voice-orb-wrapper ${status}`}>
            <canvas ref={canvasRef} className="voice-orb-canvas" />
        </div>
    );
}