import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CircleDot, ChevronLeft, ChevronRight } from 'lucide-react';
import './MiniCalendar.css';

const MiniCalendar = ({
    completedDates = [],
    incompleteDates = [],
    currentDate = new Date(),
    variant = 'cards'
}) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [animDir, setAnimDir] = useState(null); // 'left' | 'right' | null
    const touchStartX = useRef(null);

    // Recalcula a weekStart base sempre que currentDate mudar
    const baseWeekStart = getWeekStart(currentDate);

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
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function isDateCompleted(date) {
        const dateStr = formatDate(date);
        return completedDates.some((d) => formatDate(new Date(d)) === dateStr);
    }

    function isDateIncomplete(date) {
        const dateStr = formatDate(date);
        return incompleteDates.some((d) => formatDate(new Date(d)) === dateStr);
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
                const isCompleted = isDateCompleted(date);
                const isIncomplete = !isCompleted && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className="day-column">
                        <div className="day-label">{day}</div>
                        <div className={`day-pill ${isTodayDate ? 'today' : ''} ${isCompleted ? 'completed' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                            <span className="day-number">{dayNumber}</span>
                            <div className="day-status-dot">
                                {isCompleted && <Check size={12} strokeWidth={4} />}
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
                const isCompleted = isDateCompleted(date);
                const isIncomplete = !isCompleted && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className="day-column">
                        <div className="day-label">{day}</div>
                        <div className={`day-node ${isTodayDate ? 'today' : ''} ${isCompleted ? 'completed' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                            {isCompleted ? <Check size={14} strokeWidth={3} /> : <span className="day-number">{dayNumber}</span>}
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
                const isCompleted = isDateCompleted(date);
                const isIncomplete = !isCompleted && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className={`day-card ${isTodayDate ? 'today' : ''} ${isCompleted ? 'completed' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                        <div className="day-label">{day}</div>
                        <div className="day-number">{dayNumber}</div>
                        {isCompleted && (
                            <div className="day-check-icon">
                                <Check size={9} strokeWidth={3} />
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
                const isCompleted = isDateCompleted(date);
                const isIncomplete = !isCompleted && isDateIncomplete(date);
                const isTodayDate = isToday(date);
                const dayNumber = date.getDate();

                return (
                    <div key={day} className="day-column">
                        <div className="day-label">{day}</div>
                        <div className={`day-circle ${isTodayDate ? 'today' : ''} ${isCompleted ? 'completed' : ''} ${isIncomplete ? 'incomplete' : ''}`}>
                            <span className="day-number">{dayNumber}</span>
                            <div className="day-status-icon">
                                {isCompleted ? (
                                    <Check size={12} strokeWidth={3} />
                                ) : isIncomplete ? (
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
        </div>
    );
};

export default MiniCalendar;
