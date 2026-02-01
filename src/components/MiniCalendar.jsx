import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import './MiniCalendar.css';

const MiniCalendar = ({ completedDates = [], currentDate = new Date() }) => {
    const [weekStart, setWeekStart] = useState(getWeekStart(currentDate));

    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
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
        return date.toISOString().split('T')[0];
    }

    function isDateCompleted(date) {
        const dateStr = formatDate(date);
        return completedDates.some(d => formatDate(new Date(d)) === dateStr);
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

    const monthYear = weekStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const weekNumber = getWeekNumber(weekStart);

    return (
        <div className="mini-calendar">
            <div className="calendar-header">
                <h3 className="calendar-month">{monthYear}</h3>
                <div className="week-badge">Semana {weekNumber}</div>
            </div>

            <div className="calendar-days">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => (
                    <div key={day} className="day-column">
                        <div className="day-label">{day}</div>
                        <div className={`day-circle ${isToday(weekDays[idx]) ? 'today' : ''} ${isDateCompleted(weekDays[idx]) ? 'completed' : ''}`}>
                            {isDateCompleted(weekDays[idx]) ? (
                                <Check size={16} />
                            ) : (
                                weekDays[idx].getDate()
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MiniCalendar;
