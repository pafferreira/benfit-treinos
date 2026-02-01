import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Play, BarChart2, User, Moon, Sun } from 'lucide-react';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const mainContentRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Scroll Handler for Retractable Header/Footer
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = mainContentRef.current.scrollTop;

            // Always show if at the very top (or close to it)
            if (currentScrollY < 10) {
                setIsHeaderVisible(true);
                lastScrollY.current = currentScrollY;
                return;
            }

            // Determine direction
            if (currentScrollY > lastScrollY.current) {
                // Scrolling Down -> Hide
                setIsHeaderVisible(false);
            } else {
                // Scrolling Up -> Show
                setIsHeaderVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        const mainElement = mainContentRef.current;
        if (mainElement) {
            mainElement.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (mainElement) {
                mainElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    // Determine Header Content based on Route
    const getHeaderContent = (pathname) => {
        switch (pathname) {
            case '/treinos':
                return { title: 'Meus Treinos', subtitle: 'Seus programas personalizados' };
            case '/meu-treino':
                return { title: 'My Training', subtitle: 'Seu treino de hoje' };
            case '/exercicios':
                return { title: 'Exercícios', subtitle: 'Biblioteca completa' };
            case '/coach':
                return { title: 'AI Coach', subtitle: 'Seu assistente pessoal' };
            case '/perfil':
                return { title: 'Perfil', subtitle: 'Suas configurações' };
            case '/diagnostic':
                return { title: 'Diagnóstico', subtitle: 'Verificação do sistema' };
            default:
                return { title: 'BENFIT', subtitle: "Let's get moving!" };
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
                {/* Header */}
                <header className={`layout-header ${!isHeaderVisible ? 'header-hidden' : ''}`}>
                    <div>
                        <h1 className="header-title">{title}</h1>
                        <p className="header-subtitle">{subtitle}</p>
                    </div>
                    <div className="user-avatar-container" onClick={() => navigate('/perfil')}>
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
                <nav className={`bottom-nav ${!isHeaderVisible ? 'nav-hidden' : ''}`}>
                    <button
                        className={`nav-btn ${isActive('/') ? 'active' : ''}`}
                        onClick={() => handleNav('/')}
                    >
                        <Home size={24} />
                        <span>Home</span>
                    </button>
                    <button
                        className={`nav-btn ${isActive('/treinos') ? 'active' : ''}`}
                        onClick={() => handleNav('/treinos')}
                    >
                        <ClipboardList size={24} />
                        <span>Plans</span>
                    </button>
                    <button className="fab-btn" onClick={() => handleNav('/coach')}>
                        <Play size={28} fill="currentColor" />
                    </button>
                    <button
                        className={`nav-btn ${isActive('/exercicios') ? 'active' : ''}`}
                        onClick={() => handleNav('/exercicios')}
                    >
                        <BarChart2 size={24} /> {/* Using BarChart2 for Exercises temporarily or Stats if preferred */}
                        <span>Exercises</span>
                    </button>
                    <button
                        className={`nav-btn ${isActive('/perfil') ? 'active' : ''}`}
                        onClick={() => handleNav('/perfil')}
                    >
                        <User size={24} />
                        <span>Profile</span>
                    </button>
                </nav>
            </div>

            {/* Dark Mode Toggle (Floating) */}
            <div className={`dark-mode-toggle ${!isHeaderVisible ? 'nav-hidden' : ''}`}>
                <button className="toggle-btn" onClick={toggleDarkMode}>
                    {darkMode ? <Sun size={24} /> : <Moon size={24} />}
                </button>
            </div>
        </div>
    );
};

export default DashboardLayout;
