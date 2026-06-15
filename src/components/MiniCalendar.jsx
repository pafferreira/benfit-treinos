import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CircleDot, ChevronLeft, ChevronRight } from 'lucide-react';
import './MiniCalendar.css';

const MiniCalendar = ({
    finalizedDates = [],   // Treino finalizado (sessão com ended_at) → verde
    doneDates = [],        // Apenas exercícios "Feito" (sem finalizar) → azul
    completedDates = [],   // (legado) equivalente a finalizadas
    incompleteDates = [],
    completedByDayMap = {},
    currentDate = new Date(),
    variant = 'cards'
}) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [animDir, setAnimDir] = useState(null); // 'left' | 'right' | null
    const touchStartX = useRef(null);

    // Recalcula a weekStart base sempre que currentDate mudar
    // Normaliza currentDate para meia-noite local para evitar off-by-one em timezones
    const normalizedCurrent = new Date(currentDate);
    normalizedCurrent.setHours(0, 0, 0, 0);
    const baseWeekStart = getWeekStart(normalizedCurrent);

    // Deriva a weekStart real somando weekOffset * 7 dias
    const weekStart = new Date(baseWeekStart);
    weekStart.setDate(baseWeekStart.getDate() + weekOffset * 7);

    useEffect(() => {
        setWeekOffset(0);
    }, [currentDate]);

    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para segunda-feira
        return new Date(d.setDate(diff));
    }

    function getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function formatDate(date) {
        // Normalize to local date string at midnight to avoid timezone shifts
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function matchesAny(date, list) {
        const dateStr = formatDate(date);
        return (list || []).some((d) => formatDate(new Date(d)) === dateStr);
    }

    // Treino finalizado (ended_at) — inclui o prop legado completedDates e o map por dia
    function isDateFinalized(date) {
        const dateStr = formatDate(date);
        if (completedByDayMap && Object.keys(completedByDayMap).length > 0) {
            const vals = Object.values(completedByDayMap || {});
            for (let i = 0; i < vals.length; i++) {
                if (!vals[i]) continue;
                if (formatDate(new Date(vals[i])) === dateStr) return true;
            }
        }
        return matchesAny(date, finalizedDates) || matchesAny(date, completedDates);
    }

    // Apenas exercícios "Feito" naquele dia (sem sessão finalizada)
    function isDateDone(date) {
        return matchesAny(date, doneDates);
    }

    function isDateIncomplete(date) {
        return matchesAny(date, incompleteDates);
    }

    function isToday(date) {
        const today = new Date();
        return formatDate(date) === formatDate(today);
    }

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDays.push(date);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    const monthName = weekStart.toLocaleDateString('pt-BR', { month: 'long' }).toLowerCase();
    const year = weekStart.getFullYear();
    const monthYear = `${capitalizeFirstLetter(monthName)} de ${year}`;
    const weekNumber = getWeekNumber(weekStart);
    const isCurrentWeek = weekOffset === 0;

    // Navegação com animação
    const navigate = useCallback((dir) => {
        setAnimDir(dir);
        setWeekOffset(prev => prev + (dir === 'left' ? -1 : 1));
        setTimeout(() => setAnimDir(null), 300);
    }, []);

    const handlePrevWeek = () => navigate('left');
    const handleNextWeek = () => navigate('right');

    // Swipe touch handlers
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 50) return; // threshold mínimo
        if (delta < 0) handleNextWeek(); // swipe para esquerda → próxima semana
        else handlePrevWeek();           // swipe para direita → semana anterior
    };

    // ─── Variantes ────────────────────────────────────────────────────────────

    const renderPills = () => (
        <div className="calendar-days variant-pills">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => {
                const date = weekDays[idx];
                const isFinalized = isDateFinalized(date);
                const isDone = !isFinalized && isDateDone(date);
                const isIncomplete = !isFinalized && !isDone && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className="day-column">
                        <div className="day-label">{day}</div>
                        <div className={`day-pill ${isTodayDate ? 'today' : ''} ${isFinalized ? 'completed' : ''} ${isDone ? 'done' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                            <span className="day-number">{dayNumber}</span>
                            <div className="day-status-dot">
                                {isFinalized && <Check size={12} strokeWidth={4} />}
                                {isDone && <CircleDot size={10} strokeWidth={3} />}
                                {isIncomplete && <CircleDot size={10} strokeWidth={3} />}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderTimeline = () => (
        <div className="calendar-days variant-timeline">
            <div className="timeline-line"></div>
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => {
                const date = weekDays[idx];
                const isFinalized = isDateFinalized(date);
                const isDone = !isFinalized && isDateDone(date);
                const isIncomplete = !isFinalized && !isDone && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className="day-column">
                        <div className="day-label">{day}</div>
                        <div className={`day-node ${isTodayDate ? 'today' : ''} ${isFinalized ? 'completed' : ''} ${isDone ? 'done' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                            {isFinalized ? <Check size={14} strokeWidth={3} /> : <span className="day-number">{dayNumber}</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderCards = () => (
        <div className="calendar-days variant-cards">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => {
                const date = weekDays[idx];
                const isFinalized = isDateFinalized(date);
                const isDone = !isFinalized && isDateDone(date);
                const isIncomplete = !isFinalized && !isDone && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className={`day-card ${isTodayDate ? 'today' : ''} ${isFinalized ? 'completed' : ''} ${isDone ? 'done' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                        <div className="day-label">{day}</div>
                        <div className="day-number">{dayNumber}</div>
                        {isFinalized && (
                            <div className="day-check-icon">
                                <Check size={9} strokeWidth={3} />
                            </div>
                        )}
                        {isDone && (
                            <div className="day-dot-icon">
                                <CircleDot size={9} strokeWidth={3} />
                            </div>
                        )}
                        <div className="day-status-bar"></div>
                    </div>
                );
            })}
        </div>
    );

    const renderClassic = () => (
        <div className="calendar-days variant-classic">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => {
                const date = weekDays[idx];
                const isFinalized = isDateFinalized(date);
                const isDone = !isFinalized && isDateDone(date);
                const isIncomplete = !isFinalized && !isDone && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className="day-column">
                        <div className="day-label">{day}</div>
                        <div className={`day-circle ${isTodayDate ? 'today' : ''} ${isFinalized ? 'completed' : ''} ${isDone ? 'done' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                            <span className="day-number">{dayNumber}</span>
                            <div className="day-status-icon">
                                {isFinalized ? (
                                    <Check size={12} strokeWidth={3} />
                                ) : (isDone || isIncomplete) ? (
                                    <CircleDot size={10} strokeWidth={3} />
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div
            className={`mini-calendar-wrapper ${variant} ${animDir ? `anim-${animDir}` : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="calendar-header">
                <div className="calendar-header-left">
                    <h3 className="calendar-month">{monthYear}</h3>
                    <div className="week-badge">Semana {weekNumber}</div>
                </div>

                {!isCurrentWeek && (
                    <button
                        className="cal-today-btn"
                        onClick={() => { setAnimDir('left'); setWeekOffset(0); setTimeout(() => setAnimDir(null), 300); }}
                        aria-label="Ir para hoje"
                    >
                        Hoje
                    </button>
                )}
            </div>

            <div className="calendar-days-row">

                <button
                    className="cal-nav-btn"
                    onClick={handlePrevWeek}
                    aria-label="Semana anterior"
                >
                    <ChevronLeft size={16} strokeWidth={2} />
                </button>

                <div className="calendar-days-inner">
                    {variant === 'pills' && renderPills()}
                    {variant === 'timeline' && renderTimeline()}
                    {variant === 'cards' && renderCards()}
                    {variant === 'classic' && renderClassic()}
                </div>

                <button
                    className="cal-nav-btn"
                    onClick={handleNextWeek}
                    aria-label="Próxima semana"
                >
                    <ChevronRight size={16} strokeWidth={2} />
                </button>
            </div>

            <div className="calendar-legend">
                <span className="calendar-legend-item">
                    <span className="legend-dot legend-finalized" />
                    Treino finalizado
                </span>
                <span className="calendar-legend-item">
                    <span className="legend-dot legend-done" />
                    Exercícios feitos
                </span>
            </div>
        </div>
    );
};

export default MiniCalendar;
