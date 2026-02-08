import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Play, BarChart2, User, Moon, Sun } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase'; // Correct import
import './DashboardLayout.css';

const DashboardLayout = () => {
    const [darkMode, setDarkMode] = useState(false);
    const lastScrollY = useRef(0);
    const mainContentRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const disableAuth = import.meta.env.VITE_DISABLE_AUTH === 'true';

    const [avatarUrl, setAvatarUrl] = useState('/Elifit_Coach.png');
    const [userEmail, setUserEmail] = useState('...');

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };

    useEffect(() => {
        // Allow disabling auth checks for development or emergency bypass
        if (disableAuth) return;

        const loadUser = async () => {
            try {
                const userData = await supabaseHelpers.getCurrentUser();
                console.log('🔄 Dashboard Refreshed User:', userData);
                if (userData) {
                    setAvatarUrl(userData.avatar_url || '/Elifit_Coach.png');
                    // Ensure email is set even if empty string
                    setUserEmail(userData.email || 'Sem e-mail');
                }
            } catch (e) {
                console.error('Error loading user in dashboard:', e);
            }
        };

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                navigate('/login');
            } else {
                loadUser();
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                navigate('/login');
            } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                loadUser();
            }
        });

        // Listen for custom profile update event (Avatar changes)
        const handleProfileUpdate = () => {
            console.log('🔔 Profile Updated Event Received!');
            loadUser();
        };
        window.addEventListener('profile-updated', handleProfileUpdate);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, [navigate, disableAuth]);


    // Determine Header Content based on Route
    const getHeaderContent = (pathname) => {
        switch (pathname) {
            case '/treinos':
                return { title: 'Meus Treinos', subtitle: 'Seus programas personalizados' };
            case '/meu-treino':
                return { title: 'Meu Treino', subtitle: 'Seu treino de hoje' };
            case '/exercicios':
                return { title: 'Exercícios', subtitle: 'Biblioteca completa' };
            case '/coach':
                return { title: 'Coach IA', subtitle: 'Seu assistente pessoal' };
            case '/perfil':
                return { title: 'Perfil', subtitle: 'Suas configurações' };
            case '/diagnostic':
                return { title: 'Diagnóstico', subtitle: 'Verificação do sistema' };
            default:
                // Default home or dashboard
                if (pathname === '/') return { title: 'BENFIT', subtitle: "Painel de Treinos" };
                return { title: 'BENFIT', subtitle: "Painel de Treinos" };
        }
    };

    const { title, subtitle } = getHeaderContent(location.pathname);

    // Navigation handler
    const handleNav = (path) => {
        navigate(path);
    };

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className={`dashboard-layout ${darkMode ? 'dark' : ''}`}>
            <div className="mobile-container">
                {/* Fixed Header */}
                <header className="layout-header">
                    <div style={{ flex: 1 }}> {/* Title takes available space */}
                        <h1 className="header-title">{title}</h1>
                        <p className="header-subtitle">{subtitle}</p>
                    </div>

                    {/* User Info Container */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                        {/* Email Display - Now explicit */}
                        <div className="header-user-info" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: darkMode ? '#D1D5DB' : '#4B5563' }}>
                                {userEmail}
                            </span>
                        </div>

                        <div className="user-avatar-container" onClick={() => navigate('/perfil')} data-tooltip="Meu Perfil">
                            <img
                                alt="User Profile Avatar"
                                className="user-avatar"
                                src={avatarUrl}
                                onError={(e) => e.target.src = '/Elifit_Coach.png'}
                            />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main
                    className="layout-content hide-scrollbar"
                    ref={mainContentRef}
                >
                    <Outlet />
                </main>

                {/* Bottom Navigation */}
                <nav className="bottom-nav">
                    <button
                        className={`nav-btn ${isActive('/') ? 'active' : ''}`}
                        onClick={() => handleNav('/')}
                        data-tooltip="Início"
                    >
                        <Home size={24} />
                        <span>Início</span>
                    </button>
                    <button
                        className={`nav-btn ${isActive('/treinos') ? 'active' : ''}`}
                        onClick={() => handleNav('/treinos')}
                        data-tooltip="Meus Planos"
                    >
                        <ClipboardList size={24} />
                        <span>Planos</span>
                    </button>
                    <button className="fab-btn" onClick={() => handleNav('/coach')} data-tooltip="Coach IA">
                        <Play size={28} fill="currentColor" />
                    </button>
                    <button
                        className={`nav-btn ${isActive('/exercicios') ? 'active' : ''}`}
                        onClick={() => handleNav('/exercicios')}
                        data-tooltip="Exercícios"
                    >
                        <BarChart2 size={24} />
                        <span>Exercícios</span>
                    </button>
                    <button
                        className={`nav-btn ${isActive('/perfil') ? 'active' : ''}`}
                        onClick={() => handleNav('/perfil')}
                        data-tooltip="Perfil"
                    >
                        <User size={24} />
                        <span>Perfil</span>
                    </button>
                </nav>
            </div>

            {/* Dark Mode Toggle (Floating) */}
            <div className="dark-mode-toggle">
                <button className="toggle-btn" onClick={toggleDarkMode} data-tooltip={darkMode ? "Modo Claro" : "Modo Escuro"}>
                    {darkMode ? <Sun size={24} /> : <Moon size={24} />}
                </button>
            </div>
        </div>
    );
};

export default DashboardLayout;
