import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { useExercises, useUserRole } from '../hooks/useSupabase';
import { supabase, supabaseHelpers } from '../lib/supabase';
import SearchableExerciseSelect from '../components/SearchableExerciseSelect';
import ExerciseModal from '../components/ExerciseModal';
import './WorkoutEditor.css';

const EMPTY_EXERCISE = {
    exercise_id: '',
    sets: 3,
    reps: '10',
    rest_seconds: 60,
    notes: ''
};

const WorkoutEditorSkeleton = () => (
    <div className="workout-editor-skeleton" aria-hidden="true">
        <div className="sk-line sk-title shimmer"></div>
        <div className="sk-line sk-input shimmer"></div>
        <div className="sk-line sk-textarea shimmer"></div>
        <div className="sk-grid-row">
            <div className="sk-line sk-field shimmer"></div>
            <div className="sk-line sk-field shimmer"></div>
            <div className="sk-line sk-field shimmer"></div>
        </div>
        <div className="sk-card shimmer"></div>
        <div className="sk-card shimmer"></div>
        <div className="sk-actions">
            <div className="sk-line sk-btn shimmer"></div>
            <div className="sk-line sk-btn shimmer"></div>
        </div>
    </div>
);

const WorkoutEditor = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { exercises, reload: reloadExercises } = useExercises();
    const { isAdmin, isPersonal, loading: roleLoading } = useUserRole();

    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Exercise Modal State
    const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
    const [pendingNewExerciseName, setPendingNewExerciseName] = useState('');
    const [pendingExerciseLocation, setPendingExerciseLocation] = useState(null);
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'Iniciante',
        estimated_duration: 60,
        days_per_week: 3,
        is_public: true
    });

    const [schedule, setSchedule] = useState([{ day_name: 'Dia 1', exercises: [] }]);
    const [openDays, setOpenDays] = useState([0]);

    const forcePublic = isPersonal && !isAdmin;

    const handleCancel = useCallback(() => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/treinos');
    }, [navigate]);

    useEffect(() => {
        if (roleLoading) return;

        if (!isAdmin && !isPersonal) {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Apenas admin e personal podem gerenciar planos.', type: 'error' } }));
            navigate('/treinos', { replace: true });
            return;
        }

        if (isEditMode) {
            loadWorkout();
        }
    }, [roleLoading, isAdmin, isPersonal, isEditMode, id]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape' || event.key === 'Esc') {
                event.preventDefault();
                handleCancel();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleCancel]);

    const loadWorkout = async () => {
        try {
            setLoading(true);
            setSubmitError('');

            const workout = await supabaseHelpers.getWorkoutById(id);
            if (!workout) {
                throw new Error('Plano não encontrado.');
            }

            if (isPersonal && !isAdmin && workout.is_public !== true) {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Personal só pode editar planos públicos.', type: 'error' } }));
                navigate('/treinos', { replace: true });
                return;
            }

            const transformedSchedule = (workout.b_workout_days || [])
                .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))
                .map((day, dayIndex) => ({
                    day_name: day.day_name || `Dia ${dayIndex + 1}`,
                    exercises: (day.b_workout_exercises || [])
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                        .map((we) => ({
                            exercise_id: we.exercise_id || we.b_exercises?.id || '',
                            sets: we.sets ?? 3,
                            reps: we.reps ?? '10',
                            rest_seconds: we.rest_seconds ?? 60,
                            notes: we.notes || ''
                        }))
                }));

            setFormData({
                title: workout.title || '',
                description: workout.description || '',
                difficulty: workout.difficulty || 'Iniciante',
                estimated_duration: workout.estimated_duration || 60,
                days_per_week: workout.days_per_week || Math.max(transformedSchedule.length, 1),
                is_public: forcePublic ? true : (workout.is_public !== undefined ? workout.is_public : true)
            });
            setSchedule(transformedSchedule.length > 0 ? transformedSchedule : [{ day_name: 'Dia 1', exercises: [] }]);
            setOpenDays([0]);
        } catch (err) {
            console.error('Erro ao carregar plano para edição:', err);
            setSubmitError(err?.message || 'Erro ao carregar plano.');
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = useMemo(() => {
        return formData.title.trim().length > 0 && !saving;
    }, [formData.title, saving]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSubmitError('');
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleDay = (index) => {
        setOpenDays((prev) => (prev.includes(index) ? [] : [index]));
    };

    const addDay = () => {
        const newIndex = schedule.length;
        setSchedule((prev) => [...prev, { day_name: `Dia ${newIndex + 1}`, exercises: [] }]);
        setOpenDays([newIndex]);
    };

    const removeDay = (index, e) => {
        e.stopPropagation();
        setSchedule((prev) => prev.filter((_, i) => i !== index));
        setOpenDays([]);
    };

    const updateDayName = (index, name) => {
        setSchedule((prev) => {
            const next = [...prev];
            const day = next[index];
            if (!day) return prev;
            next[index] = { ...day, day_name: name };
            return next;
        });
    };

    const addExerciseToDay = (dayIndex) => {
        setSchedule((prev) => {
            const next = [...prev];
            const day = next[dayIndex];
            if (!day) return prev;
            next[dayIndex] = {
                ...day,
                exercises: [...(day.exercises || []), { ...EMPTY_EXERCISE }]
            };
            return next;
        });
    };

    const removeExerciseFromDay = (dayIndex, exerciseIndex) => {
        setSchedule((prev) => {
            const next = [...prev];
            const day = next[dayIndex];
            if (!day) return prev;
            next[dayIndex] = {
                ...day,
                exercises: (day.exercises || []).filter((_, i) => i !== exerciseIndex)
            };
            return next;
        });
    };

    const updateExercise = (dayIndex, exerciseIndex, field, value) => {
        setSchedule((prev) => {
            const next = [...prev];
            const day = next[dayIndex];
            if (!day) return prev;

            const exercises = [...(day.exercises || [])];
            const exercise = exercises[exerciseIndex];
            if (!exercise) return prev;

            exercises[exerciseIndex] = {
                ...exercise,
                [field]: value
            };
            next[dayIndex] = {
                ...day,
                exercises
            };
            return next;
        });
    };

    const normalizeExercise = (exercise) => {
        const normalizedRest = exercise.rest_seconds === '' || exercise.rest_seconds === null || exercise.rest_seconds === undefined
            ? null
            : parseInt(exercise.rest_seconds, 10);

        return {
            exercise_id: exercise.exercise_id,
            sets: parseInt(exercise.sets, 10) || 3,
            reps: exercise.reps || '10',
            rest_seconds: Number.isNaN(normalizedRest) ? null : normalizedRest,
            notes: exercise.notes || ''
        };
    };

    const handleCreateNewExercise = (name, dayIndex, exerciseIndex) => {
        setPendingNewExerciseName(name);
        setPendingExerciseLocation({ dayIndex, exerciseIndex });
        setExerciseModalOpen(true);
    };

    const handleSaveNewExercise = async (exerciseData) => {
        try {
            setIsCreatingExercise(true);
            const newExercise = await supabaseHelpers.createExercise(exerciseData);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Exercício criado com sucesso!', type: 'success' } }));

            await reloadExercises();

            if (pendingExerciseLocation) {
                const { dayIndex, exerciseIndex } = pendingExerciseLocation;
                updateExercise(dayIndex, exerciseIndex, 'exercise_id', newExercise.id);
            }

            setExerciseModalOpen(false);
            setPendingExerciseLocation(null);
            setPendingNewExerciseName('');
        } catch (err) {
            console.error('Erro ao criar exercício:', err);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Erro ao criar exercício: ${err.message}`, type: 'error' } }));
        } finally {
            setIsCreatingExercise(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!formData.title.trim()) {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Por favor, preencha o título do treino.', type: 'error' } }));
            return;
        }

        for (const day of schedule) {
            for (const ex of day.exercises) {
                if (!ex.exercise_id) {
                    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Por favor, selecione um exercício para todos os itens no ${day.day_name}.`, type: 'error' } }));
                    return;
                }
            }
        }

        const normalized = {
            ...formData,
            estimated_duration: parseInt(formData.estimated_duration, 10) || 0,
            days_per_week: parseInt(formData.days_per_week, 10) || 1,
            is_public: forcePublic ? true : !!formData.is_public
        };

        const normalizedSchedule = schedule.map((day) => ({
            day_name: day.day_name || '',
            exercises: (day.exercises || []).map(normalizeExercise)
        }));

        while (normalizedSchedule.length < normalized.days_per_week) {
            const newIndex = normalizedSchedule.length + 1;
            normalizedSchedule.push({ day_name: `Dia ${newIndex}`, exercises: [] });
        }
        if (normalizedSchedule.length > normalized.days_per_week) {
            normalizedSchedule.length = normalized.days_per_week;
        }

        try {
            setSaving(true);

            if (isEditMode) {
                await supabaseHelpers.updateWorkout(id, { ...normalized, schedule: normalizedSchedule });
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Treino atualizado com sucesso!', type: 'success' } }));
            } else {
                const newWorkout = await supabaseHelpers.createWorkout({ ...normalized, schedule: normalizedSchedule });
                const { data: { user } } = await supabase.auth.getUser();

                if (user && newWorkout) {
                    try {
                        await supabaseHelpers.assignPlanToUser(user.id, newWorkout.id);
                    } catch (assignErr) {
                        console.error('Erro ao atribuir plano automaticamente:', assignErr);
                    }
                }

                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Treino criado e atribuído com sucesso! 🎉', type: 'success' } }));
            }

            navigate('/treinos');
        } catch (err) {
            console.error('Erro ao salvar plano:', err);
            setSubmitError(err?.message || 'Erro ao salvar treino.');
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Erro ao salvar treino: ${err?.message || ''}`, type: 'error' } }));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="workout-editor-page">
            <div className="workout-editor-topbar">
                <button type="button" className="btn-secondary workout-editor-back" onClick={handleCancel}>
                    <ChevronLeft size={16} /> Voltar
                </button>
                <h2 className="workout-editor-title">{isEditMode ? 'Editar Plano de Treino' : 'Novo Plano de Treino'}</h2>
            </div>

            <div className="workout-editor-content">
                {loading ? (
                    <WorkoutEditorSkeleton />
                ) : (
                    <form className="modal-form workout-editor-form" onSubmit={handleSubmit}>
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
                                rows={3}
                            />
                        </div>

                        <div className="modal-grid-fields">
                            <div className="form-group">
                                <label className="modal-field-label">Dificuldade</label>
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

                            <div className="form-group">
                                <label className="modal-field-label">Duração (min)</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    name="estimated_duration"
                                    value={formData.estimated_duration}
                                    onChange={handleChange}
                                    min="10"
                                />
                            </div>

                            <div className="form-group">
                                <label className="modal-field-label">Dias/Semana</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    name="days_per_week"
                                    value={formData.days_per_week}
                                    onChange={handleChange}
                                    min="1"
                                    max="7"
                                />
                            </div>
                        </div>

                        <div className="workout-builder">
                            <h3>Estrutura do Treino</h3>
                            <div className="days-container">
                                {schedule.map((day, dayIndex) => {
                                    const isOpen = openDays.includes(dayIndex);
                                    return (
                                        <div key={dayIndex} className={`day-block ${isOpen ? 'open' : ''}`}>
                                            <div className="day-header" onClick={() => toggleDay(dayIndex)}>
                                                <div className="day-header-content w-full">
                                                    <div className="flex justify-between items-center w-full mb-1">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <ChevronDown size={20} className={`day-toggle-icon ${isOpen ? 'rotate-180' : ''}`} />
                                                            <input
                                                                type="text"
                                                                value={day.day_name}
                                                                onChange={(e) => updateDayName(dayIndex, e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="day-name-input"
                                                                placeholder="Nome do Dia"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => removeDay(dayIndex, e)}
                                                            className="day-remove-btn ml-2"
                                                            data-tooltip="Remover Dia"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                    <div className="day-summary-text text-left">
                                                        {day.exercises.length} exercícios
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="day-content">
                                                {day.exercises.map((ex, exIndex) => (
                                                    <div key={exIndex} className="exercise-row-card">
                                                        <div className="flex gap-3 mb-3 items-end">
                                                            <div className="exercise-field flex-1">
                                                                <label className="mb-1 block">Exercício</label>
                                                                <SearchableExerciseSelect
                                                                    exercises={exercises}
                                                                    value={ex.exercise_id}
                                                                    onChange={(newId) => updateExercise(dayIndex, exIndex, 'exercise_id', newId)}
                                                                    onCreateNew={(name) => handleCreateNewExercise(name, dayIndex, exIndex)}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                                                                className="exercise-remove-btn"
                                                                title="Remover Exercício"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                                            <div className="exercise-field">
                                                                <label className="mb-1 block">Séries</label>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    value={ex.sets}
                                                                    onChange={(e) => updateExercise(dayIndex, exIndex, 'sets', e.target.value)}
                                                                    placeholder="3"
                                                                    className="sets-input text-center"
                                                                    min="1"
                                                                />
                                                            </div>

                                                            <div className="exercise-field">
                                                                <label className="mb-1 block">Reps</label>
                                                                <input
                                                                    type="text"
                                                                    value={ex.reps}
                                                                    onChange={(e) => updateExercise(dayIndex, exIndex, 'reps', e.target.value)}
                                                                    placeholder="10-12"
                                                                    className="reps-input text-center"
                                                                />
                                                            </div>

                                                            <div className="exercise-field">
                                                                <label className="mb-1 block whitespace-nowrap">Descanso (s)</label>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    value={ex.rest_seconds || ''}
                                                                    onChange={(e) => updateExercise(dayIndex, exIndex, 'rest_seconds', e.target.value)}
                                                                    placeholder="60"
                                                                    className="rest-input text-center"
                                                                    min="0"
                                                                    step="5"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="exercise-field w-full">
                                                            <label className="mb-1 block">Notas</label>
                                                            <input
                                                                type="text"
                                                                value={ex.notes || ''}
                                                                onChange={(e) => updateExercise(dayIndex, exIndex, 'notes', e.target.value)}
                                                                placeholder="Ex: Drop-set na última"
                                                                className="notes-input w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}

                                                <button type="button" onClick={() => addExerciseToDay(dayIndex)} className="exercise-add-btn mt-2">
                                                    <Plus size={16} /> Adicionar Exercício
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button type="button" onClick={addDay} className="day-add-btn">
                                <Plus size={20} /> Adicionar Dia de Treino
                            </button>
                        </div>

                        <div className="form-group public-toggle-row">
                            <label>
                                <input
                                    type="checkbox"
                                    name="is_public"
                                    checked={formData.is_public}
                                    onChange={handleChange}
                                    disabled={forcePublic}
                                />
                                Tornar este treino público
                            </label>
                            {forcePublic && (
                                <p className="public-note">
                                    Perfil personal só pode criar e editar planos públicos.
                                </p>
                            )}
                        </div>

                        {submitError && (
                            <div className="modal-error-banner" role="alert">
                                {submitError}
                            </div>
                        )}

                        <div className="modal-footer-actions workout-editor-actions">
                            <button type="button" onClick={handleCancel} className="btn-secondary" disabled={saving}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary" disabled={!canSubmit}>
                                {saving ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Treino'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <ExerciseModal
                isOpen={exerciseModalOpen}
                onClose={() => setExerciseModalOpen(false)}
                onSave={handleSaveNewExercise}
                exercise={pendingNewExerciseName ? { name: pendingNewExerciseName } : null}
                isLoading={isCreatingExercise}
            />
        </div>
    );
};

export default WorkoutEditor;
