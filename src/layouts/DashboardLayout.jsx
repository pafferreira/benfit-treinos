import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Play, BarChart2, User } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { ActionProvider, useAction } from '../context/ActionContext';
import { useUserRole } from '../hooks/useSupabase';
import './DashboardLayout.css';

const DashboardLayoutContent = () => {

    const mainContentRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const disableAuth = import.meta.env.VITE_DISABLE_AUTH === 'true';
    const { isImpersonating, role } = useUserRole();

    const [avatarUrl, setAvatarUrl] = useState('/avatar_skeleton.png');
    const [userName, setUserName] = useState('Usuário');

    const getRoleLabel = (roleValue) => {
        switch (roleValue) {
            case 'admin':
                return 'Administrador';
            case 'personal':
                return 'Personal';
            case 'user':
            default:
                return 'Usuário';
        }
    };

    // Ensure light mode on mount
    useEffect(() => {
        document.documentElement.classList.remove('dark');
    }, []);

    useEffect(() => {
        // Allow disabling auth checks for development or emergency bypass
        if (disableAuth) return;

        const loadUser = async () => {
            try {
                const userData = await supabaseHelpers.getCurrentUser();
                console.log('🔄 Dashboard Refreshed User:', userData);
                if (userData) {
                    setAvatarUrl(userData.avatar_url || '/avatar_skeleton.png');
                    const resolvedName = userData.name
                        || userData.full_name
                        || userData.display_name
                        || userData.email?.split('@')[0]
                        || 'Usuário';
                    setUserName(resolvedName);
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
        if (pathname === '/treinos/novo') {
            return { title: 'Novo Plano', subtitle: 'Monte a estrutura completa do treino' };
        }
        if (pathname.startsWith('/treinos/') && pathname.endsWith('/editar')) {
            return { title: 'Editar Plano', subtitle: 'Atualize dias, exercícios e parâmetros' };
        }
        if (pathname.startsWith('/treino/') && pathname.includes('/dia/')) {
            return { title: 'Sessão do Dia', subtitle: 'Detalhes completos dos exercícios' };
        }
        if (pathname.startsWith('/treino/')) {
            return { title: 'Plano de Treino', subtitle: 'Escolha uma sessão para abrir' };
        }

        switch (pathname) {
            case '/treinos':
                return { title: 'Meus Treinos', subtitle: 'Seus programas personalizados' };
            case '/meu-treino':
                return { title: 'Meu Treino', subtitle: 'Seu treino de hoje' };
            case '/exercicios':
                return { title: 'Exercícios', subtitle: 'Biblioteca completa' };
            case '/coach':
                return { title: 'Benfit Coach', subtitle: 'Memória vetorial ativa • powered by Gemini' };
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

    const { action } = useAction(); // Consume context

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const [showInterface, setShowInterface] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!mainContentRef.current) return;
            const currentScrollY = mainContentRef.current.scrollTop;

            // Sempre mostra quando está no topo
            if (currentScrollY <= 10) {
                setShowInterface(true);
                lastScrollY.current = currentScrollY;
                return;
            }

            // Threshold para evitar jitter em pequenos movimentos
            if (Math.abs(currentScrollY - lastScrollY.current) < 8) return;

            // Esconde ao rolar para baixo, mostra ao rolar para cima
            const scrollingDown = currentScrollY > lastScrollY.current;
            setShowInterface(!scrollingDown);
            lastScrollY.current = currentScrollY;
        };

        const mainElement = mainContentRef.current;
        if (mainElement) {
            mainElement.addEventListener('scroll', handleScroll, { passive: true });
        }

        // Escuta eventos de scroll interno (ex: messages-area do AICoach)
        const handleInnerScroll = (e) => {
            const { scrollTop, direction } = e.detail || {};
            if (scrollTop <= 10) {
                setShowInterface(true);
                lastScrollY.current = scrollTop;
                return;
            }
            if (Math.abs(scrollTop - lastScrollY.current) < 8) return;
            setShowInterface(direction !== 'down');
            lastScrollY.current = scrollTop;
        };
        window.addEventListener('app-inner-scroll', handleInnerScroll, { passive: true });

        return () => {
            if (mainElement) {
                mainElement.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('app-inner-scroll', handleInnerScroll);
        };
    }, []);

    // Rotas que não usam padding superior do layout (para que seu fundo cole no topo)
    const isZeroPaddingRoute = (
        location.pathname === '/perfil' ||
        location.pathname === '/coach' ||
        location.pathname.includes('/historico') ||
        (location.pathname.startsWith('/treino/') && location.pathname.includes('/dia/'))
    );
    const mainPaddingTop = isZeroPaddingRoute ? '0' : '6rem';

    // Em rotas customizadas (workout-day, historico), esconde o layout global SEMPRE.
    // A rota /coach usa scroll interno próprio - controlado via evento customizado.
    const isCustomHeaderRoute = (
        (location.pathname.startsWith('/treino/') && location.pathname.includes('/dia/')) ||
        location.pathname.includes('/historico')
    );

    const isHeaderHidden = isCustomHeaderRoute ? true : !showInterface;
    const isNavHidden = isCustomHeaderRoute ? true : !showInterface;

    return (
        <div className="dashboard-layout">
            <div className={`mobile-container ${(!showInterface && !isCustomHeaderRoute) ? 'ui-hidden' : ''}`}>
                <a href="#main-content" className="skip-link">
                    Pular para o conteúdo principal
                </a>
                {/* Fixed Header */}
                <header className={`layout-header ${isHeaderHidden ? 'header-hidden' : ''}`}>
                    <div style={{ flex: 1 }}> {/* Title takes available space */}
                        <h1 className="header-title">{title}</h1>
                        <p className="header-subtitle">{subtitle}</p>
                    </div>

                    {/* User Info Container */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                        <div className="header-user-info">
                            <span className="header-user-name">{userName}</span>
                            <span className={`header-user-role ${isImpersonating ? 'is-impersonating' : ''}`}>
                                {getRoleLabel(role)}
                            </span>
                        </div>

                        <div
                            className={`user-avatar-container ${isImpersonating ? 'impersonating' : ''}`}
                            onClick={() => navigate('/perfil')}
                            data-tooltip="Meu Perfil"
                        >
                            <img
                                alt="User Profile Avatar"
                                className="user-avatar"
                                src={avatarUrl}
                                onError={(e) => e.target.src = '/avatar_skeleton.png'}
                            />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main
                    id="main-content"
                    className="layout-content hide-scrollbar"
                    ref={mainContentRef}
                    tabIndex={-1}
                    style={location.pathname === '/coach'
                        ? { padding: 0, gap: 0 }
                        : { paddingTop: mainPaddingTop }
                    }
                >
                    <Outlet />
                </main>

                {/* Bottom Navigation */}
                <nav className={`bottom-nav ${isNavHidden ? 'nav-hidden' : ''}`}>
                    <span className="app-version">v{__APP_VERSION__}</span>
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

                    <button
                        className="fab-btn"
                        onClick={() => {
                            if (action && action.onClick) {
                                action.onClick();
                            } else {
                                handleNav('/coach');
                            }
                        }}
                        data-tooltip={action?.label || "Benfit Coach"}
                        style={{ display: (location.pathname === '/' || action?.visible) ? 'flex' : 'none' }}
                    >
                        {action?.icon ? action.icon : <Play size={28} fill="currentColor" />}
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
        </div>
    );
};

const DashboardLayout = () => {
    return (
        <ActionProvider>
            <DashboardLayoutContent />
        </ActionProvider>
    );
};

export default DashboardLayout;
