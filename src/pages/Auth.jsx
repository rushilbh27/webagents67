import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [useOtp, setUseOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [msg, setMsg] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

    const handleRedirect = (user) => {
        const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase();

        if (isAdmin) {
            navigate('/admin', { replace: true });
        } else {
            navigate('/dashboard', { replace: true });
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMsg('');

        try {
            if (useOtp) {
                if (!otpSent) {
                    const { error } = await supabase.auth.signInWithOtp({ email });
                    if (error) throw error;
                    setOtpSent(true);
                    setMsg('One-time password (OTP) sent to your email.');
                } else {
                    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
                    if (error) throw error;
                    handleRedirect(data.user);
                }
            } else if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                handleRedirect(data.user);
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMsg('Signup successful! Please log in (Admin may need to activate your account).');
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>{useOtp ? 'Email OTP' : (isLogin ? 'Login' : 'Sign Up')}</h2>
                <p className="auth-subtitle">Voice Agent IaaS Portal</p>

                {error && <div className="auth-alert error">{error}</div>}
                {msg && <div className="auth-alert success">{msg}</div>}

                <form onSubmit={handleAuth} className="auth-form">
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={otpSent}
                        />
                    </div>

                    {!useOtp && isLogin && (
                        <div className="input-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {!isLogin && !useOtp && (
                        <div className="input-group">
                            <label>Create Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {useOtp && otpSent && (
                        <div className="input-group">
                            <label>Enter OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                placeholder="6-digit code"
                            />
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="auth-btn Primary">
                        {loading ? 'Processing...' : (useOtp ? (otpSent ? 'Verify OTP' : 'Send OTP') : (isLogin ? 'Log In' : 'Sign Up'))}
                    </button>
                </form>

                <button
                    className="auth-btn Secondary"
                    onClick={() => {
                        setUseOtp(!useOtp);
                        setOtpSent(false);
                    }}
                >
                    {useOtp ? 'Back to Password Login' : 'Login with Email OTP (2FA)'}
                </button>

                {!useOtp && (
                    <button
                        className="auth-btn Secondary"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                    </button>
                )}
            </div>
        </div>
    );
}
