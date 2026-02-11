import { Check, Circle } from 'lucide-react';
import './WeeklyCalendar.css';

const WeeklyCalendar = ({
    currentDate = new Date(),
    scheduledDays = [], // Array de números 0-6 (0=Domingo, 1=Segunda, etc)
    completedDates = [], // Array de Date objects
    onDayClick = () => { },
    selectedDate = null
}) => {
    // Calcula início da semana (domingo)
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0 = domingo
        const diff = -day; // volta ao domingo da mesma semana
        const result = new Date(d);
        result.setDate(d.getDate() + diff);
        return result;
    };

    const weekStart = getWeekStart(currentDate);

    // Gera array com os 7 dias da semana (Dom-Sáb)
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDays.push(date);
    }

    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const isDateCompleted = (date) => {
        const dateStr = formatDate(date);
        return completedDates.some(d => formatDate(new Date(d)) === dateStr);
    };

    const isToday = (date) => {
        const today = new Date();
        return formatDate(date) === formatDate(today);
    };

    const isSelected = (date) => {
        if (!selectedDate) return false;
        return formatDate(date) === formatDate(selectedDate);
    };

    const isDayScheduled = (date) => {
        const dayOfWeek = date.getDay();
        return scheduledDays.includes(dayOfWeek);
    };

    const monthName = weekStart.toLocaleDateString('pt-BR', { month: 'long' });
    const year = weekStart.getFullYear();
    // Capitalizar apenas a primeira letra do mês
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const monthYear = `${capitalizedMonth} de ${year}`;

    return (
        <div className="weekly-calendar">
            <div className="weekly-calendar-header">
                <h3 className="calendar-month-title">{monthYear}</h3>
            </div>

            <div className="weekly-days-grid">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, idx) => {
                    const date = weekDays[idx];
                    const completed = isDateCompleted(date);
                    const today = isToday(date);
                    const selected = isSelected(date);
                    const scheduled = isDayScheduled(date);

                    return (
                        <button
                            key={idx}
                            className={`day-card ${today ? 'is-today' : ''} ${selected ? 'is-selected' : ''} ${scheduled ? 'is-scheduled' : ''} ${completed ? 'is-completed' : ''}`}
                            onClick={() => onDayClick(date)}
                        >
                            <div className="day-name">{dayName}</div>
                            <div className="day-number-wrapper">
                                {completed ? (
                                    <div className="day-completed-icon">
                                        <Check size={18} strokeWidth={3} />
                                    </div>
                                ) : (
                                    <div className="day-number">{date.getDate()}</div>
                                )}
                                {scheduled && !completed && (
                                    <div className="day-scheduled-indicator">
                                        <Circle size={8} fill="currentColor" />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="calendar-legend">
                <div className="legend-item">
                    <Circle size={8} fill="var(--color-primary)" />
                    <span>Dia programado</span>
                </div>
                <div className="legend-item">
                    <Check size={14} />
                    <span>Concluído</span>
                </div>
            </div>
        </div>
    );
};

export default WeeklyCalendar;
