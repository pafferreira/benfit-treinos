import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Play, BarChart2, User, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const [darkMode, setDarkMode] = useState(false);
    const lastScrollY = useRef(0);
    const mainContentRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const disableAuth = import.meta.env.VITE_DISABLE_AUTH === 'true';

    useEffect(() => {
        // Allow disabling auth checks for development or emergency bypass
        if (disableAuth) return;

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                navigate('/login');
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                navigate('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Header remains fixed for PAF

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
                    <div>
                        <h1 className="header-title">{title}</h1>
                        <p className="header-subtitle">{subtitle}</p>
                    </div>
                    <div className="user-avatar-container" onClick={() => navigate('/perfil')} data-tooltip="Meu Perfil">
                        <img
                            alt="User Profile Avatar"
                            className="user-avatar"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJT4i3SHiSRnhWT1Zip9JVLP_VPLghVxnwIznSdKURKN-1x3d-jNQu8jvDK6o6tpMqkBeSRI8Yxu-NCBeK689wVbcKphtk40Ss65S0GFoARgCa96yZm2QavXee2kVHjQlYPX8y2fVu5JVay_dnYK9yyi-ZrQvxHfFIDabFykKFINC6TND3deT2G0XHeRqwtTyRoOB0KhztI2F4OIZofGNh_sgXLylj4KP-KRm8PLzUb5-gmOx6TNHKEJAV-Vb03pXZn7PYCHtpovc"
                        />
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
