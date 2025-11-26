-- ============================================================
-- VERIFICAR E CORRIGIR RELACIONAMENTOS
-- ============================================================

-- 1. Verificar se os IDs dos treinos estão corretos
SELECT 
    'b_workouts' as tabela,
    id,
    workout_key,
    title
FROM b_workouts;

-- 2. Verificar se os dias de treino estão linkados aos treinos
SELECT 
    'Dias sem treino' as problema,
    wd.id,
    wd.workout_id,
    wd.day_name
FROM b_workout_days wd
LEFT JOIN b_workouts w ON wd.workout_id = w.id
WHERE w.id IS NULL;

-- 3. Verificar se os exercícios dos dias estão linkados
SELECT 
    'Exercícios sem dia' as problema,
    we.id,
    we.workout_day_id,
    we.exercise_id
FROM b_workout_exercises we
LEFT JOIN b_workout_days wd ON we.workout_day_id = wd.id
WHERE wd.id IS NULL;

-- 4. Verificar se os exercícios existem
SELECT 
    'Exercícios sem cadastro' as problema,
    we.id,
    we.exercise_id
FROM b_workout_exercises we
LEFT JOIN b_exercises e ON we.exercise_id = e.id
WHERE e.id IS NULL;

-- 5. Ver estrutura completa de um treino
SELECT 
    w.title as treino,
    w.id as treino_id,
    wd.day_name as dia,
    wd.id as dia_id,
    e.name as exercicio,
    we.sets,
    we.reps
FROM b_workouts w
LEFT JOIN b_workout_days wd ON w.id = wd.workout_id
LEFT JOIN b_workout_exercises we ON wd.id = we.workout_day_id
LEFT JOIN b_exercises e ON we.exercise_id = e.id
ORDER BY w.title, wd.day_number, we.order_index;
