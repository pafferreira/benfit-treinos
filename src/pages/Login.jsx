// cspell:ignore incorretos confirmado

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();

    // Internal App Mode: No Sign Up toggle. Login Only.
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const translateError = (msg) => {
        if (!msg) return 'Ocorreu um erro. Tente novamente.';
        if (msg.includes('Invalid login credentials') || msg.includes('E-mail ou senha')) return 'E-mail ou senha incorretos.';
        if (msg.includes('Email not confirmed')) return 'E-mail não confirmado.';
        if (msg.includes('User not found')) return 'Usuário não encontrado.';
        if (msg.includes('Failed to fetch')) return 'Erro de conexão. Verifique sua internet.';
        return msg;
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            // 1. Ensure User Sync (Enterprise Logic)
            // This calls the Edge Function to check z_usuarios and sync password to Auth
            // If the user doesn't have the function deployed, it might fail (404/500).
            // We fallback to standard login if that happens, assuming the user might already exist in Auth.

            const normalizedEmail = email.trim().toLowerCase();
            if (!normalizedEmail) {
                setError('Informe seu e-mail.');
                setLoading(false);
                return;
            }

            let finalPassword = password;
            // First try a local proxy endpoint to avoid CORS issues (same approach as Contratos)
            try {
                const resp = await fetch('/api/auth/ensure-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: normalizedEmail, password })
                });
                const payload = await resp.json().catch(() => ({}));
                if (!resp.ok) {
                    throw new Error(payload?.error || 'Proxy ensure-user failed');
                }
                if (payload?.tempPassword) finalPassword = payload.tempPassword;
            } catch (proxyErr) {
                // Fallback to Edge Function invoke (with timeout) if proxy not available
                try {
                    const invokeWithTimeout = (name, opts, ms = 1500) => {
                        return Promise.race([
                            supabase.functions.invoke(name, opts),
                            new Promise((_, rej) => setTimeout(() => rej(new Error('invoke-timeout')), ms))
                        ]);
                    };
                    const result = await invokeWithTimeout('ensure-user', { body: { email: normalizedEmail, password } }, 1500);
                    const ensureData = result?.data ?? result;
                    if (ensureData?.error) throw new Error(ensureData.error);
                    if (ensureData?.tempPassword) finalPassword = ensureData.tempPassword;
                } catch (fnErr) {
                    console.warn('Ensure-user not available or failed:', fnErr.message);
                    // Non-fatal; continue to standard auth
                }
            }

            // 2. Standard Supabase Auth Login
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: finalPassword,
            });

            if (authError) throw authError;

            navigate('/');

        } catch (error) {
            console.error('Auth error:', error);
            setError(translateError(error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError('Por favor, digite seu e-mail para recuperar a senha.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setMessage('Link de recuperação enviado para seu e-mail!');
        } catch (error) {
            console.error('Reset password error:', error);
            setError(translateError(error.message || ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Hero / Image Section */}
                <div className="login-hero">
                    <img src="/benfit-hero.jpg" alt="Modelo Fitness" className="hero-image" />
                </div>

                {/* Form Section */}
                <div className="login-content">
                    <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>Bem-vindo</h2>
                        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Acesse sua conta Benfit</p>
                    </div>

                    <form onSubmit={handleAuth} className="auth-form">
                        <div className="form-group">
                            <label>E-mail Corporativo</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    placeholder="seu@benfit.com.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Senha</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="forgot-password">
                            <button type="button" onClick={handleResetPassword} disabled={loading} className="text-btn">
                                Esqueci minha senha
                            </button>
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message">{message}</div>}

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border"></span>
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Social Login removed to match Enterprise Security standards (Inventario DB) */}
                </div>
            </div>


        </div>
    );
};

export default Login;
