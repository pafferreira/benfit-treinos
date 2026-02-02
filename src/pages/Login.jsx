
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Check, Flame, ArrowRight, Github } from 'lucide-react';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage('Verifique seu e-mail para confirmar o cadastro!');
            }
        } catch (error) {
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
                redirectTo: window.location.origin + '/perfil?reset=true',
            });
            if (error) throw error;
            setMessage('Link de recuperação enviado para seu e-mail!');
        } catch (error) {
            setError(translateError(error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
            });
            if (error) throw error;
        } catch (error) {
            setError(translateError(error.message));
        }
    };

    const translateError = (msg) => {
        if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
        if (msg.includes('Email not confirmed')) return 'E-mail não confirmado.';
        return 'Ocorreu um erro. Tente novamente.';
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
                    {/* Header with Toggle */}
                    <div className="auth-toggle-container">
                        <button
                            className={`auth-toggle-btn ${isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                        >
                            Entrar
                        </button>
                        <button
                            className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                        >
                            Cadastrar
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="auth-form">
                        <div className="form-group">
                            <label>E-mail</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
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

                        {isLogin && (
                            <div className="forgot-password">
                                <button type="button" onClick={handleResetPassword} disabled={loading} className="text-btn">
                                    Esqueci minha senha
                                </button>
                            </div>
                        )}

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
                                    {isLogin ? 'Entrar' : 'Criar Conta'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="divider">
                        <span>OU CONTINUE COM</span>
                    </div>

                    <div className="social-login">
                        <button className="social-btn" onClick={() => handleSocialLogin('google')}>
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
                            Google
                        </button>
                        <button className="social-btn" onClick={() => handleSocialLogin('github')}>
                            <Github size={20} />
                            GitHub
                        </button>
                    </div>
                </div>
            </div>

            <div className="login-logo-header">
                <div className="logo-icon">
                    <div className="logo-square">
                        <div className="logo-dot"></div>
                    </div>
                </div>
                <span className="logo-text">BENFIT</span>
            </div>
        </div>
    );
};

export default Login;
