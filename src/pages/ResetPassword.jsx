import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import './Login.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // When a user clicks the password recovery link, Supabase appends the
        // access token / refresh token information to the URL (hash fragment).
        // We must call getSessionFromUrl() so the client can parse and set the
        // session. Some browsers or small delays can make this async, so we
        // also attach an auth state listener as a fallback.
        const checkSession = async () => {
            try {
                // Try to parse session from URL (this handles the redirect token)
                const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl();

                if (sessionError) {
                    // If it's not the expected flow, continue to try getting an existing user
                    console.warn('getSessionFromUrl warning:', sessionError.message || sessionError);
                }

                if (sessionData?.session?.user) {
                    setUser(sessionData.session.user);
                    setLoading(false);
                    return;
                }

                // If no session from URL, check current user (maybe already signed in)
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user) {
                    setUser(userData.user);
                    setLoading(false);
                    return;
                }

                // Fallback: wait briefly for auth state change (some providers need it)
                const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                        if (session?.user) setUser(session.user);
                    }
                });

                // After a short grace period, if still no user, show friendly message
                setTimeout(async () => {
                    const { data: finalUser } = await supabase.auth.getUser();
                    if (finalUser?.user) {
                        setUser(finalUser.user);
                    } else {
                        setError('Link inválido ou expirado. Por favor, solicite uma nova redefinição de senha.');
                    }
                    setLoading(false);
                    try {
                        listener?.subscription?.unsubscribe();
                    } catch (e) {
                        // ignore
                    }
                }, 2000);

            } catch (err) {
                console.error('Session check error:', err);
                setError('Erro ao verificar sessão.');
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    // Watch user to stop loading once found
    useEffect(() => {
        if (user) setLoading(false);
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não conferem.');
            return;
        }

        setSaving(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setSuccess('Senha atualizada com sucesso!');

            // Redirect after a moment
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            console.error('Update password error:', err);
            setError(translateError(err.message));
        } finally {
            setSaving(false);
        }
    };

    const translateError = (msg) => {
        if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.';
        return 'Não foi possível atualizar a senha. Tente novamente.';
    };

    return (
        <div className="login-container">
            <div className="login-logo-header">
                <div className="logo-icon">
                    <div className="logo-square">
                        <div className="logo-dot"></div>
                    </div>
                </div>
                <span className="logo-text">BENFIT</span>
            </div>

            <div className="login-card" style={{ maxWidth: '400px', marginTop: '80px' }}>
                <div className="login-content">
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#EFF6FF',
                            color: '#3B82F6',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <ShieldCheck size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                            Redefinir Senha
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                            {user ? `Nova senha para: ${user.email}` : 'Verificando link de segurança...'}
                        </p>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                            <div className="spinner-border" style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }}></div>
                        </div>
                    ) : error && !user ? (
                        <div style={{ textAlign: 'center' }}>
                            <div className="error-message">{error}</div>
                            <button className="submit-btn" onClick={() => navigate('/login')}>
                                <ArrowLeft size={18} /> Voltar para o Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label>Nova Senha</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoFocus
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

                            <div className="form-group">
                                <label>Confirmar Nova Senha</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && <div className="error-message">{error}</div>}
                            {success && <div className="success-message">{success}</div>}

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={saving}
                            >
                                {saving ? (
                                    <span className="spinner-border"></span>
                                ) : (
                                    <>
                                        Atualizar Senha
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
