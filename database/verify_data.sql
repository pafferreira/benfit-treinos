-- ============================================================
-- VERIFICAR DADOS POPULADOS
-- Execute para ver quantos registros existem em cada tabela
-- ============================================================

-- Contar exercícios
SELECT 'b_exercises' as tabela, COUNT(*) as total FROM b_exercises;

-- Contar treinos
SELECT 'b_workouts' as tabela, COUNT(*) as total FROM b_workouts;

-- Contar dias de treino
SELECT 'b_workout_days' as tabela, COUNT(*) as total FROM b_workout_days;

-- Contar exercícios dos treinos
SELECT 'b_workout_exercises' as tabela, COUNT(*) as total FROM b_workout_exercises;

-- Ver detalhes dos exercícios (primeiros 5)
SELECT id, exercise_key, name, muscle_group, equipment 
FROM b_exercises 
ORDER BY name 
LIMIT 5;

-- Ver detalhes dos treinos
SELECT id, workout_key, title, difficulty, days_per_week, is_public 
FROM b_workouts;

-- Ver dias de cada treino
SELECT 
    w.title as treino,
    wd.day_number,
    wd.day_name,
    COUNT(we.id) as num_exercicios
FROM b_workouts w
LEFT JOIN b_workout_days wd ON w.id = wd.workout_id
LEFT JOIN b_workout_exercises we ON wd.id = we.workout_day_id
GROUP BY w.title, wd.day_number, wd.day_name
ORDER BY w.title, wd.day_number;
