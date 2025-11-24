import { Activity, Flame, Calendar, Play, ChevronRight, Timer, Dumbbell } from 'lucide-react';
import './DashboardHome.css';

const DashboardHome = () => {
    return (
        <div className="page-container">
            {/* Hero Section - Action Oriented */}
            <div className="dashboard-hero">
                <div className="hero-content">
                    <div className="hero-greeting">Bom dia, João</div>
                    <h1 className="hero-title">Hora de esmagar<br />esse treino! 🔥</h1>
                    <p className="hero-subtitle">Seu foco hoje é: <strong>Superiores A (Peito e Tríceps)</strong></p>

                    <button className="hero-cta">
                        <Play size={20} fill="currentColor" />
                        Começar Treino Agora
                    </button>
                </div>

                <div className="hero-image-container">
                    <img
                        src="/benfit-hero.jpg"
                        alt="Hero Fitness"
                        className="hero-image"
                    />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div>
                            <div className="stat-title">Frequência</div>
                            <div className="stat-value">4 Dias</div>
                        </div>
                        <div className="stat-icon-wrapper blue">
                            <Calendar size={24} />
                        </div>
                    </div>
                    <div className="stat-desc">Seguindo o plano perfeitamente!</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div>
                            <div className="stat-title">Calorias</div>
                            <div className="stat-value">2,450</div>
                        </div>
                        <div className="stat-icon-wrapper orange">
                            <Flame size={24} />
                        </div>
                    </div>
                    <div className="stat-desc">Kcal queimadas essa semana</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div>
                            <div className="stat-title">Volume Total</div>
                            <div className="stat-value">12.5t</div>
                        </div>
                        <div className="stat-icon-wrapper green">
                            <Activity size={24} />
                        </div>
                    </div>
                    <div className="stat-desc">+2.5% vs semana passada</div>
                </div>
            </div>

            {/* Quick Access / Workouts */}
            <div className="section-header">
                <h2 className="section-title">Seus Treinos</h2>
                <a href="/treinos" className="view-all">Ver todos <ChevronRight size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /></a>
            </div>

            <div className="workouts-list">
                {/* Workout Card 1 */}
                <div className="workout-card">
                    <div className="workout-image" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)' }}>
                        <div className="workout-tag">Hoje</div>
                        <Dumbbell size={48} color="white" style={{ opacity: 0.2, position: 'absolute', bottom: 10, right: 10 }} />
                    </div>
                    <div className="workout-content">
                        <h3 className="workout-title">Superiores A</h3>
                        <div className="workout-meta">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={14} /> 60 min</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={14} /> Intenso</span>
                        </div>
                    </div>
                </div>

                {/* Workout Card 2 */}
                <div className="workout-card">
                    <div className="workout-image" style={{ background: 'linear-gradient(to bottom right, #10b981, #047857)' }}>
                        <Dumbbell size={48} color="white" style={{ opacity: 0.2, position: 'absolute', bottom: 10, right: 10 }} />
                    </div>
                    <div className="workout-content">
                        <h3 className="workout-title">Inferiores B</h3>
                        <div className="workout-meta">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={14} /> 45 min</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={14} /> Moderado</span>
                        </div>
                    </div>
                </div>

                {/* Workout Card 3 */}
                <div className="workout-card">
                    <div className="workout-image" style={{ background: 'linear-gradient(to bottom right, #f59e0b, #b45309)' }}>
                        <Dumbbell size={48} color="white" style={{ opacity: 0.2, position: 'absolute', bottom: 10, right: 10 }} />
                    </div>
                    <div className="workout-content">
                        <h3 className="workout-title">Cardio + Core</h3>
                        <div className="workout-meta">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={14} /> 30 min</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={14} /> Leve</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
