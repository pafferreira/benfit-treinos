import { useState, useEffect } from 'react';
import Modal from './Modal';
import { X, Plus, Trash2, Dumbbell } from 'lucide-react';
import { useExercises } from '../hooks/useSupabase';

const WorkoutModal = ({ isOpen, onClose, onSave, workout = null, isLoading = false }) => {
    const { exercises } = useExercises();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'Iniciante',
        estimated_duration: 60,
        days_per_week: 3,
        is_public: true
    });

    const [schedule, setSchedule] = useState([]);

    useEffect(() => {
        if (workout) {
            setFormData({
                title: workout.title || '',
                description: workout.description || '',
                difficulty: workout.difficulty || 'Iniciante',
                estimated_duration: workout.estimated_duration || 60,
                days_per_week: workout.days_per_week || 3,
                is_public: workout.is_public !== undefined ? workout.is_public : true
            });
            setSchedule(workout.schedule || []);
        } else {
            setFormData({
                title: '',
                description: '',
                difficulty: 'Iniciante',
                estimated_duration: 60,
                days_per_week: 3,
                is_public: true
            });
            setSchedule([{ day_name: 'Dia 1', exercises: [] }]);
        }
    }, [workout, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Schedule Management
    const addDay = () => {
        setSchedule([...schedule, { day_name: `Dia ${schedule.length + 1}`, exercises: [] }]);
    };

    const removeDay = (index) => {
        const newSchedule = schedule.filter((_, i) => i !== index);
        setSchedule(newSchedule);
    };

    const updateDayName = (index, name) => {
        const newSchedule = [...schedule];
        newSchedule[index].day_name = name;
        setSchedule(newSchedule);
    };

    const addExerciseToDay = (dayIndex) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].exercises.push({
            exercise_id: '',
            sets: 3,
            reps: '10',
            notes: ''
        });
        setSchedule(newSchedule);
    };

    const removeExerciseFromDay = (dayIndex, exerciseIndex) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].exercises = newSchedule[dayIndex].exercises.filter((_, i) => i !== exerciseIndex);
        setSchedule(newSchedule);
    };

    const updateExercise = (dayIndex, exerciseIndex, field, value) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].exercises[exerciseIndex][field] = value;
        setSchedule(newSchedule);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert('Por favor, preencha o título do treino.');
            return;
        }

        // Validate schedule
        for (const day of schedule) {
            for (const ex of day.exercises) {
                if (!ex.exercise_id) {
                    alert(`Por favor, selecione um exercício para todos os itens no ${day.day_name}.`);
                    return;
                }
            }
        }

        onSave({ ...formData, schedule });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={workout ? 'Editar Treino' : 'Novo Treino'} size="large">
            <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>
                        Título do Treino <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Ex: Treino de Hipertrofia ABC"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Descrição</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Descreva o objetivo e detalhes do treino..."
                    />
                </div>

                <div className="form-group">
                    <label>Dificuldade</label>
                    <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleChange}
                    >
                        <option value="Iniciante">Iniciante</option>
                        <option value="Intermediário">Intermediário</option>
                        <option value="Avançado">Avançado</option>
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Duração Estimada (min)</label>
                        <input
                            type="number"
                            name="estimated_duration"
                            value={formData.estimated_duration}
                            onChange={handleChange}
                            min="10"
                        />
                    </div>

                    <div className="form-group">
                        <label>Dias por Semana</label>
                        <input
                            type="number"
                            name="days_per_week"
                            value={formData.days_per_week}
                            onChange={handleChange}
                            min="1"
                            max="7"
                        />
                    </div>
                </div>

                {/* Workout Builder Section */}
                <div className="workout-builder">
                    <h3>Estrutura do Treino</h3>
                    <div className="days-container">
                        {schedule.map((day, dayIndex) => (
                            <div key={dayIndex} className="day-block">
                                <div className="day-header">
                                    <input
                                        type="text"
                                        value={day.day_name}
                                        onChange={(e) => updateDayName(dayIndex, e.target.value)}
                                        className="day-name-input"
                                        placeholder="Nome do Dia (ex: Treino A)"
                                    />
                                    <button type="button" onClick={() => removeDay(dayIndex)} className="btn-icon-danger" title="Remover Dia">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="day-exercises">
                                    {day.exercises.map((ex, exIndex) => (
                                        <div key={exIndex} className="exercise-row">
                                            <select
                                                value={ex.exercise_id}
                                                onChange={(e) => updateExercise(dayIndex, exIndex, 'exercise_id', e.target.value)}
                                                className="exercise-select"
                                                required
                                            >
                                                <option value="">Selecione um exercício...</option>
                                                {exercises.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                ))}
                                            </select>

                                            <input
                                                type="number"
                                                value={ex.sets}
                                                onChange={(e) => updateExercise(dayIndex, exIndex, 'sets', e.target.value)}
                                                placeholder="Séries"
                                                className="sets-input"
                                                min="1"
                                            />

                                            <input
                                                type="text"
                                                value={ex.reps}
                                                onChange={(e) => updateExercise(dayIndex, exIndex, 'reps', e.target.value)}
                                                placeholder="Reps"
                                                className="reps-input"
                                            />

                                            <button type="button" onClick={() => removeExerciseFromDay(dayIndex, exIndex)} className="btn-icon-danger">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <button type="button" onClick={() => addExerciseToDay(dayIndex)} className="btn-add-exercise">
                                        <Plus size={16} /> Adicionar Exercício
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addDay} className="btn-secondary btn-full-width">
                        <Plus size={18} /> Adicionar Dia de Treino
                    </button>
                </div>

                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            name="is_public"
                            checked={formData.is_public}
                            onChange={handleChange}
                        />
                        Tornar este treino público
                    </label>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : workout ? 'Salvar Alterações' : 'Criar Treino'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default WorkoutModal;
