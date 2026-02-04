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
            // 1. Authenticate with Supabase Auth (Checks auth.users)
            const { data: { user, session }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (user) {
                navigate('/');
            }

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
                            <label>E-mail</label>
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
