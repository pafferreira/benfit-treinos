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
        console.log('Translating error:', msg);
        if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
        if (msg.includes('Email not confirmed')) return 'E-mail não confirmado.';
        if (msg.includes('User not found')) return 'Usuário não encontrado.';
        if (msg.includes('Failed to fetch')) return 'Erro de conexão. Verifique sua internet.';
        return msg || 'Ocorreu um erro. Tente novamente.';
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

            let finalPassword = password;
            // Invoke ensure-user but don't let a slow / missing function block login.
            // Use a small timeout so we fall back quickly to standard auth.
            try {
                const invokeWithTimeout = (name, opts, ms = 1500) => {
                    return Promise.race([
                        supabase.functions.invoke(name, opts),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('invoke-timeout')), ms))
                    ]);
                };

                const result = await invokeWithTimeout('ensure-user', { body: { email, password } }, 1500);

                // result may be { data, error } or may be the raw response depending on sdk; normalize
                const ensureData = result?.data ?? result;
                const ensureError = result?.error ?? null;

                if (ensureError) {
                    console.warn('Ensure-user function API warning:', ensureError);
                    // Non-fatal: continue to normal auth
                } else if (ensureData) {
                    if (ensureData.error) {
                        throw new Error(ensureData.error);
                    }
                    if (ensureData.tempPassword) {
                        finalPassword = ensureData.tempPassword;
                        console.log('Using synced credentials');
                    }
                }
            } catch (fnErr) {
                console.warn('Backend validation skipped/failed:', fnErr.message);
                // If the error message is explicitly about credentials, stop.
                if (fnErr.message.includes('inválidos') || fnErr.message.includes('inactive')) {
                    throw new Error(fnErr.message);
                }
                // Otherwise (e.g. function not deployed), continue to standard login
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
