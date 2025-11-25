import { useState } from 'react';
import { workouts } from '../data/workouts';
import { exercises } from '../data/exercises';
import { Calendar, Clock, ChevronLeft, Dumbbell, Info } from 'lucide-react';
import './Workouts.css';

const Workouts = () => {
    const [selectedWorkout, setSelectedWorkout] = useState(null);

    const getExerciseDetails = (id) => {
        return exercises.find(ex => ex.id === id) || { name: 'Exercício não encontrado', muscle_group: '-' };
    };

    if (selectedWorkout) {
        return (
            <div className="workouts-container">
                <button className="back-btn" onClick={() => setSelectedWorkout(null)}>
                    <ChevronLeft size={20} />
                    Voltar para lista
                </button>

                <div className="workout-details">
                    <div className="workouts-header">
                        <h1>{selectedWorkout.title}</h1>
                        <p>{selectedWorkout.description}</p>
                        <div className="plan-meta" style={{ marginTop: '1rem' }}>
                            <div className="meta-item">
                                <Clock size={16} />
                                {selectedWorkout.estimated_duration} min/sessão
                            </div>
                            <div className="meta-item">
                                <Calendar size={16} />
                                {selectedWorkout.days_per_week} dias/semana
                            </div>
                        </div>
                    </div>

                    <div className="days-list">
                        {selectedWorkout.schedule.map((day, index) => (
                            <div key={index} className="day-card">
                                <div className="day-title">
                                    <Dumbbell size={20} />
                                    {day.day_name}
                                </div>
                                <div className="exercises-list">
                                    {day.exercises.map((exItem, idx) => {
                                        const details = getExerciseDetails(exItem.exercise_id);
                                        return (
                                            <div key={idx} className="exercise-item">
                                                <div className="exercise-info">
                                                    <h4>{details.name}</h4>
                                                    <span>{details.muscle_group}</span>
                                                </div>
                                                <div className="exercise-sets">
                                                    {exItem.sets} séries
                                                </div>
                                                <div className="exercise-reps">
                                                    {exItem.reps} reps
                                                </div>
                                                {exItem.notes && (
                                                    <div className="exercise-notes">
                                                        <Info size={12} style={{ display: 'inline', marginRight: 4 }} />
                                                        {exItem.notes}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="workouts-container">
            <div className="workouts-header">
                <h1>Meus Treinos</h1>
                <p>Selecione um programa para ver os detalhes.</p>
            </div>

            <div className="plans-grid">
                {workouts.map(workout => (
                    <div
                        key={workout.id}
                        className="plan-card"
                        onClick={() => setSelectedWorkout(workout)}
                    >
                        <div className="plan-header">
                            <h3 className="plan-title">{workout.title}</h3>
                            <span className="plan-difficulty">{workout.difficulty}</span>
                        </div>
                        <p className="plan-description">
                            {workout.description.length > 100
                                ? workout.description.substring(0, 100) + '...'
                                : workout.description}
                        </p>
                        <div className="plan-meta">
                            <div className="meta-item">
                                <Clock size={14} />
                                {workout.estimated_duration} min
                            </div>
                            <div className="meta-item">
                                <Calendar size={14} />
                                {workout.days_per_week} dias/sem
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Workouts;
