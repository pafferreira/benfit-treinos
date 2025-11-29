-- ============================================================
-- FIX: Add missing exercises to Supabase
-- This script adds the 2 missing exercises that were not inserted
-- ============================================================

-- Check current count
SELECT COUNT(*) as current_count FROM B_Exercises;

-- Check if the missing exercises exist
SELECT exercise_key, name FROM B_Exercises 
WHERE exercise_key IN ('leg_press_45', 'cadeira_abdutora_45');

-- Insert missing exercises if they don't exist
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) 
SELECT 'leg_press_45', 'Leg Press 45º', 'Pernas (Geral)', 'Leg Press', '', 
    ARRAY['Apoie os pés na plataforma na largura dos ombros.', 'Desça até formar 90 graus ou mais.', 'Empurre sem travar os joelhos.'], 
    ARRAY['perna', 'composto']
WHERE NOT EXISTS (
    SELECT 1 FROM B_Exercises WHERE exercise_key = 'leg_press_45'
);

INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) 
SELECT 'cadeira_abdutora_45', 'Cadeira Abdutora 45º', 'Glúteo', 'Máquina', '', 
    ARRAY['Tronco inclinado à frente ou ajuste da máquina.'], 
    ARRAY['abdutor', 'gluteo']
WHERE NOT EXISTS (
    SELECT 1 FROM B_Exercises WHERE exercise_key = 'cadeira_abdutora_45'
);

-- Verify final count
SELECT COUNT(*) as final_count FROM B_Exercises;

-- List all exercises to verify
SELECT exercise_key, name, muscle_group FROM B_Exercises ORDER BY name;
