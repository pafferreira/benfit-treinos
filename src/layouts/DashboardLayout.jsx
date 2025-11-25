import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, User, LogOut, Menu, X, BrainCircuit, Library } from 'lucide-react';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="dashboard-layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <div className="brand-name">Benfit</div>
                <button className="icon-btn" onClick={toggleSidebar}>
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Dumbbell className="logo-icon" size={32} />
                    <span className="brand-name">Benfit Treinos</span>
                </div>

                <nav className="nav-menu">
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/treinos"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <Dumbbell size={20} />
                        <span>Meus Treinos</span>
                    </NavLink>

                    <NavLink
                        to="/exercicios"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <Library size={20} />
                        <span>Lista de Exercícios</span>
                    </NavLink>

                    <NavLink
                        to="/coach"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <BrainCircuit size={20} />
                        <span>Benfit Coach AI</span>
                    </NavLink>

                    <NavLink
                        to="/perfil"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <User size={20} />
                        <span>Perfil</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile-mini">
                        <img src="/avatar-male.png" alt="User Avatar" className="avatar-mini" />
                        <div className="user-info">
                            <span className="user-name">João Silva</span>
                            <span className="user-plan">Plano Pro</span>
                        </div>
                    </div>

                    <button className="logout-btn">
                        <LogOut size={20} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>

            {/* Overlay for mobile when sidebar is open */}
            {isSidebarOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 40
                    }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden"
                />
            )}
        </div>
    );
};

export default DashboardLayout;
