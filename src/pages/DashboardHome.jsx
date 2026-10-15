import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dumbbell, Flame, TrendingUp, Activity, ChevronRight, Calendar, Clock,
    Sparkles, Zap, Play, ChevronDown, CheckCircle2, History, Plus, Compass, MessageCircle
} from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import { useWorkouts, useUserRole } from '../hooks/useSupabase';
import { cacheGet, cacheInvalidate, swr } from '../lib/dataCache';
import { useCoach, useCoachScreen } from '../context/coach';
import MiniCalendar from '../components/MiniCalendar';
import './DashboardHome.css';

// Tela única de Início (v2): treino de hoje → semana → meus planos → explorar.
// Junta o antigo Início, a lista de Planos (/treinos) e o Meu Treino.

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Boa madrugada';
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
};

const STATUS_CONFIG = {
    'atribuido': { label: 'Atribuído', className: 'status-atribuido' },
    'em_andamento': { label: 'Em Andamento', className: 'status-em-andamento' },
    'concluido': { label: 'Concluído', className: 'status-concluido' }
};

const FEELING_MICROCOPY = {
    1: 'Exausto', 2: 'Muito Cansado', 3: 'Cansado', 4: 'Levemente Cansado',
    5: 'Normal', 6: 'Bem', 7: 'Muito Bem',
    8: 'Motivado', 9: 'Incrível', 10: 'Imparável'
};

const DIFFICULTY_COLORS = {
    'Iniciante': '#10B981',
    'Intermediário': '#F59E0B',
    'Avançado': '#EF4444'
};

const TIPS = [
    'Consistência supera intensidade. Treine ao menos 3x por semana para resultados duradouros.',
    'Proteína distribuída ao longo do dia ajuda mais a recuperação do que uma refeição gigante.',
    'Dormir bem também é treino: é no descanso que o músculo se reconstrói.',
    'Aumente a carga aos poucos. Técnica limpa vale mais que peso extra.',
    'Beba água antes, durante e depois do treino, principalmente nos dias quentes.',
    'Aquecer 5 minutos reduz o risco de lesão e melhora o rendimento da primeira série.',
    'Anote como se sentiu no fim do treino. O Benfit usa isso para ajustar suas sugestões.',
];

const isSameDay = (a, b) => (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
);

// Plano do treino de hoje: o do último treino (se ainda ativo), senão o em andamento, senão o mais recente.
const pickTodayPlan = (plans, lastSession) => {
    if (!plans.length) return null;
    return plans.find(p => p.workout_id === lastSession?.workout_id)
        || plans.find(p => p.status === 'em_andamento')
        || plans[0];
};

// Dia sugerido: continua a sequência do último treino; sem histórico, usa o dia da semana.
const pickTodayDay = (schedule, lastSession, workoutId) => {
    if (!schedule?.length) return { day: null, doneToday: false };
    if (lastSession?.workout_id === workoutId && lastSession.workout_day_id) {
        const idx = schedule.findIndex(d => d.id === lastSession.workout_day_id);
        if (idx >= 0) {
            const startedToday = lastSession.started_at && isSameDay(new Date(lastSession.started_at), new Date());
            if (startedToday) return { day: schedule[idx], doneToday: !!lastSession.ended_at };
            return { day: schedule[(idx + 1) % schedule.length], doneToday: false };
        }
    }
    const weekday = new Date().getDay() || 7;
    return { day: schedule.find(d => d.day_number === weekday) || schedule[0], doneToday: false };
};

const DashboardHome = () => {
    const navigate = useNavigate();
    const { openCoach } = useCoach();
    const { workouts, reload: reloadWorkouts } = useWorkouts();
    const { isAdmin, isPersonal, isUser } = useUserRole();

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [plans, setPlans] = useState([]);
    const [stats, setStats] = useState({ sessionsThisWeek: 0, completedThisWeek: 0, caloriesThisWeek: 0, lastSession: null });
    const cachedCalendar = cacheGet('workouts:calendar')?.value;
    const [finalizedDates, setFinalizedDates] = useState(cachedCalendar?.finalizedDates || []);
    const [doneDates, setDoneDates] = useState(cachedCalendar?.doneDates || []);
    const [lastSession, setLastSession] = useState(() => cacheGet('workouts:lastSession')?.value || null);
    const [chosenDayId, setChosenDayId] = useState(null);
    const [assigningId, setAssigningId] = useState(null);

    const loadDashboardData = async () => {
        try {
            const currentUser = await supabaseHelpers.getCurrentUser();
            if (!currentUser) return;
            setUser(currentUser);

            const [activePlans, dashStats] = await Promise.all([
                supabaseHelpers.getUserActivePlans(currentUser.id),
                supabaseHelpers.getDashboardStats(currentUser.id),
                // Dados opcionais: se falharem, não derrubam planos e números.
                swr('workouts:lastSession', () => supabaseHelpers.getLastWorkoutSession(currentUser.id), {
                    onData: setLastSession,
                }).catch(err => console.error('Erro ao carregar último treino:', err)),
                swr('workouts:calendar', async () => {
                    // Mesma lógica do Histórico: finalizados (verde) e só exercícios "Feito" (azul).
                    const res = await supabaseHelpers.getExerciseDoneCalendarDates(currentUser.id);
                    return { finalizedDates: res.finalizedDates || [], doneDates: res.doneDates || [] };
                }, {
                    onData: (res) => {
                        setFinalizedDates(res.finalizedDates);
                        setDoneDates(res.doneDates);
                    },
                }).catch(err => console.error('Erro ao carregar calendário:', err)),
            ]);

            setPlans(activePlans || []);
            setStats(dashStats);
        } catch (error) {
            console.error('Erro ao carregar o Início:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const workoutsById = useMemo(() => new Map(workouts.map(w => [w.id, w])), [workouts]);
    const activeIds = useMemo(() => new Set(plans.map(p => p.workout_id)), [plans]);
    const explorePlans = useMemo(() => workouts.filter(w => !activeIds.has(w.id)), [workouts, activeIds]);

    // Leva o aluno até "Explorar planos" e destaca a seção por alguns segundos.
    // A rolagem é feita só no conteúdo (.layout-content): um link #âncora rolaria
    // também o container do app, que tem overflow hidden, e tiraria o rodapé do lugar.
    const exploreRef = useRef(null);
    const highlightTimerRef = useRef(null);
    const [highlightExplore, setHighlightExplore] = useState(false);

    useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

    const goToExplore = () => {
        const section = exploreRef.current;
        if (!section) {
            navigate('/treinos');
            return;
        }
        const scroller = section.closest('.layout-content');
        if (scroller) {
            const top = scroller.scrollTop + section.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12;
            const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            scroller.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
        setHighlightExplore(false);
        clearTimeout(highlightTimerRef.current);
        requestAnimationFrame(() => setHighlightExplore(true));
        highlightTimerRef.current = setTimeout(() => setHighlightExplore(false), 2600);
    };

    const todayPlan = pickTodayPlan(plans, lastSession);
    const todayWorkout = todayPlan ? workoutsById.get(todayPlan.workout_id) : null;
    const schedule = todayWorkout?.schedule || [];
    const suggested = pickTodayDay(schedule, lastSession, todayPlan?.workout_id);
    const chosenDay = chosenDayId ? schedule.find(d => d.id === chosenDayId) : null;
    const todayDay = chosenDay || suggested.day;
    const doneToday = !chosenDay && suggested.doneToday;
    const todayTitle = todayWorkout?.title || todayPlan?.b_workouts?.title || 'Plano ativo';
    const todayDayName = todayDay ? (todayDay.day_name || `Dia ${todayDay.day_number}`) : null;

    useCoachScreen({
        label: 'Início',
        details: [
            todayDayName ? `Treino sugerido para hoje: ${todayDayName} do plano "${todayTitle}"${doneToday ? ' (já concluído hoje)' : ''}.` : 'O aluno ainda não tem plano ativo.',
            `Semana: ${stats.sessionsThisWeek} sessões, ${stats.completedThisWeek} concluídas, ${stats.caloriesThisWeek} kcal.`,
        ].join('\n'),
        suggestions: todayDayName
            ? [`Como me preparar para o ${todayDayName}?`, 'Como está minha semana de treinos?', 'O que comer antes do treino?']
            : ['Qual plano combina comigo?', 'Como começar a treinar com segurança?'],
    });

    const handleAssign = async (e, workout) => {
        e.stopPropagation();
        if (!user) return;
        try {
            setAssigningId(workout.id);
            await supabaseHelpers.assignPlanToUser(user.id, workout.id);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Plano "${workout.title}" escolhido!`, type: 'success' } }));
            cacheInvalidate('workouts:activePlans');
            setPlans(await supabaseHelpers.getUserActivePlans(user.id));
            reloadWorkouts();
        } catch (err) {
            console.error('Erro ao escolher plano:', err);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err.message || 'Erro ao escolher plano.', type: 'error' } }));
        } finally {
            setAssigningId(null);
        }
    };

    const openPlan = (workoutId) => {
        sessionStorage.setItem('benfit_lastVisitedPlan', workoutId);
        navigate(`/treino/${workoutId}`);
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="skeleton-welcome" />
                <div className="skeleton-stats" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
            </div>
        );
    }

    const firstName = user?.name?.split(' ')[0]
        || user?.full_name?.split(' ')[0]
        || user?.display_name
        || user?.email?.split('@')[0]
        || 'Atleta';

    const getDynamicSubtitle = () => {
        if (plans.length === 0) return 'Escolha um plano abaixo para começar.';
        if (doneToday) return 'Ótimo trabalho hoje! Descanse e recupere-se bem. 🔋';

        if (stats.lastSession?.ended_at) {
            const lastDate = new Date(stats.lastSession.ended_at);
            const today = new Date();
            const diffDays = Math.floor(
                (new Date(today.getFullYear(), today.getMonth(), today.getDate())
                    - new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())) / 86400000
            );
            const feelingScore = stats.lastSession.feeling;
            const feelingText = feelingScore ? (FEELING_MICROCOPY[feelingScore] || `nota ${feelingScore}`).toLowerCase() : '';

            if (diffDays === 0) return 'Ótimo trabalho hoje! Descanse e recupere-se bem. 🔋';
            if (diffDays === 1) return feelingText ? `Pronto para hoje? No último treino você estava ${feelingText}. 🔥` : 'Pronto para o treino de hoje? 🔥';
            if (diffDays === 2) return 'Já descansou? Bora voltar pro treino! 💪';
            return `Faz ${diffDays} dias desde seu último treino. Vamos voltar à ativa? 💪`;
        }
        return 'O momento perfeito para treinar é agora. ⚡';
    };

    const tip = TIPS[new Date().getDate() % TIPS.length];

    return (
        <div className="dashboard-home">
            {/* Saudação + Treino de hoje */}
            <section className="welcome-banner home-hero">
                <div className="welcome-content">
                    <div className="welcome-greeting">
                        <h2 className="welcome-title">{getGreeting()}, {firstName}!</h2>
                        <p className="welcome-subtitle">{getDynamicSubtitle()}</p>
                    </div>
                </div>

                {todayPlan && todayDay ? (
                    <div className="today-card">
                        <span className="today-label">
                            {doneToday ? <CheckCircle2 size={12} /> : <Dumbbell size={12} />}
                            {doneToday ? 'Treino de hoje concluído' : 'Treino de hoje'}
                        </span>
                        <h3 className="today-title">{todayDayName}</h3>
                        <p className="today-plan">{todayTitle}</p>
                        <div className="today-meta">
                            <span><Dumbbell size={12} /> {todayDay.exercises?.length || 0} exercícios</span>
                            {todayWorkout?.estimated_duration && (
                                <span><Clock size={12} /> ~{todayWorkout.estimated_duration} min</span>
                            )}
                        </div>
                        <div className="today-actions">
                            <button
                                type="button"
                                className="today-start-btn"
                                onClick={() => navigate(`/treino/${todayPlan.workout_id}/dia/${todayDay.id}`)}
                            >
                                {doneToday ? <History size={16} /> : <Play size={16} fill="currentColor" />}
                                {doneToday ? 'Ver sessão' : 'Começar treino'}
                            </button>
                            {schedule.length > 1 && (
                                <label className="today-day-select">
                                    <span>Trocar dia</span>
                                    <ChevronDown size={14} />
                                    <select
                                        value={todayDay.id}
                                        onChange={(e) => setChosenDayId(e.target.value)}
                                        aria-label="Trocar dia do treino"
                                    >
                                        {schedule.map(d => (
                                            <option key={d.id} value={d.id}>{d.day_name || `Dia ${d.day_number}`}</option>
                                        ))}
                                    </select>
                                </label>
                            )}
                        </div>
                    </div>
                ) : todayPlan ? (
                    <button type="button" className="today-start-btn today-start-btn--inline" onClick={() => openPlan(todayPlan.workout_id)}>
                        <ChevronRight size={16} /> Abrir {todayTitle}
                    </button>
                ) : (
                    <button type="button" className="today-start-btn today-start-btn--inline" onClick={goToExplore}>
                        <Compass size={16} /> Escolher meu primeiro plano
                    </button>
                )}
                <div className="welcome-decoration" />
            </section>

            {/* Semana */}
            <section className="dash-section">
                <MiniCalendar
                    finalizedDates={finalizedDates}
                    doneDates={doneDates}
                    currentDate={new Date()}
                    onDoubleClick={() => navigate('/historico')}
                />
                <div className="quick-stats">
                    <div className="quick-stat-item">
                        <div className="qs-icon qs-blue"><Activity size={16} /></div>
                        <div className="qs-info">
                            <span className="qs-value">{stats.sessionsThisWeek}</span>
                            <span className="qs-label">Sessões</span>
                        </div>
                    </div>
                    <div className="quick-stat-divider" />
                    <div className="quick-stat-item">
                        <div className="qs-icon qs-green"><TrendingUp size={16} /></div>
                        <div className="qs-info">
                            <span className="qs-value">{stats.completedThisWeek}</span>
                            <span className="qs-label">Concluídas</span>
                        </div>
                    </div>
                    <div className="quick-stat-divider" />
                    <div className="quick-stat-item">
                        <div className="qs-icon qs-orange"><Flame size={16} /></div>
                        <div className="qs-info">
                            <span className="qs-value">{stats.caloriesThisWeek}</span>
                            <span className="qs-label">kcal</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Meus planos */}
            <section className="dash-section">
                <div className="dash-section-header">
                    <h3 className="dash-section-title">
                        <Dumbbell size={18} />
                        Meus planos
                    </h3>
                    {(isAdmin || isPersonal) && (
                        <button type="button" className="dash-see-all" onClick={() => navigate('/treinos/novo')}>
                            <Plus size={14} /> Novo
                        </button>
                    )}
                </div>

                {plans.length === 0 ? (
                    <div className="dash-empty-state">
                        <div className="dash-empty-icon"><Sparkles size={28} /></div>
                        <h4>Nenhum plano ativo</h4>
                        <p>Escolha um plano em Explorar planos para começar.</p>
                    </div>
                ) : (
                    <div className="dash-plans-list">
                        {plans.map(plan => {
                            const workout = plan.b_workouts;
                            const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG['atribuido'];
                            const diffColor = DIFFICULTY_COLORS[workout?.difficulty] || '#6B7280';
                            const isLastExecuted = plan.workout_id === lastSession?.workout_id;

                            return (
                                <div
                                    key={plan.id}
                                    className={`dash-plan-card ${isLastExecuted ? 'dash-plan-card--last' : ''}`}
                                    onClick={() => openPlan(plan.workout_id)}
                                >
                                    <div className="dpc-cover">
                                        {workout?.cover_image ? (
                                            <img
                                                src={workout.cover_image}
                                                alt={workout?.title}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="dpc-cover-fallback"><Dumbbell size={24} /></div>
                                        )}
                                    </div>

                                    <div className="dpc-info">
                                        {isLastExecuted && (
                                            <span className="dpc-last-label">
                                                <History size={11} /> Último treino
                                            </span>
                                        )}
                                        <div className="dpc-header">
                                            <h4 className="dpc-title">{workout?.title || 'Treino'}</h4>
                                            <span className={`dpc-status ${statusCfg.className}`}>{statusCfg.label}</span>
                                        </div>
                                        <div className="dpc-meta">
                                            {workout?.difficulty && (
                                                <span className="dpc-meta-tag" style={{ color: diffColor }}>
                                                    <Zap size={11} /> {workout.difficulty}
                                                </span>
                                            )}
                                            {workout?.estimated_duration && (
                                                <span className="dpc-meta-tag"><Clock size={11} /> {workout.estimated_duration} min</span>
                                            )}
                                            {workout?.days_per_week && (
                                                <span className="dpc-meta-tag"><Calendar size={11} /> {workout.days_per_week}x/sem</span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight size={18} className="dpc-arrow" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Explorar planos */}
            {explorePlans.length > 0 && (
                <section
                    ref={exploreRef}
                    className={`dash-section explore-section ${highlightExplore ? 'explore-section--highlight' : ''}`}
                    id="explorar-planos"
                >
                    <div className="dash-section-header">
                        <h3 className="dash-section-title">
                            <Compass size={18} />
                            Explorar planos
                        </h3>
                        <button type="button" className="dash-see-all" onClick={() => navigate('/treinos')}>
                            Ver todos <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="explore-carousel">
                        {explorePlans.map(w => (
                            <div key={w.id} className="explore-card" onClick={() => openPlan(w.id)}>
                                <h4 className="explore-title">{w.title}</h4>
                                <span className="explore-meta">
                                    {w.difficulty}{w.days_per_week ? ` · ${w.days_per_week}x/sem` : ''}
                                </span>
                                {isUser && (
                                    <button
                                        type="button"
                                        className="explore-choose-btn"
                                        onClick={(e) => handleAssign(e, w)}
                                        disabled={!!assigningId}
                                    >
                                        {assigningId === w.id ? 'Escolhendo...' : 'Escolher'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Dica do dia: toque leva ao Coach */}
            <button type="button" className="dash-tip dash-tip--action" onClick={() => openCoach()}>
                <div className="dash-tip-icon"><Sparkles size={16} /></div>
                <p className="dash-tip-text">
                    <strong>Dica Benfit:</strong> {tip}
                    <span className="dash-tip-cta"><MessageCircle size={12} /> Pergunte ao Benfit</span>
                </p>
            </button>
        </div>
    );
};

export default DashboardHome;
