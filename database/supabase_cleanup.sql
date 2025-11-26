-- ============================================================
-- BENFIT TREINOS - CLEANUP SCRIPT
-- Execute este script ANTES do supabase_database_script.sql
-- para limpar tabelas e índices existentes
-- ============================================================

-- Drop all indexes first (IF EXISTS prevents errors)
DROP INDEX IF EXISTS idx_b_users_email CASCADE;
DROP INDEX IF EXISTS idx_b_exercises_muscle_group CASCADE;
DROP INDEX IF EXISTS idx_b_exercises_equipment CASCADE;
DROP INDEX IF EXISTS idx_b_exercises_key CASCADE;
DROP INDEX IF EXISTS idx_b_workouts_public CASCADE;
DROP INDEX IF EXISTS idx_b_workouts_difficulty CASCADE;
DROP INDEX IF EXISTS idx_b_workout_days_workout CASCADE;
DROP INDEX IF EXISTS idx_b_workout_exercises_day CASCADE;
DROP INDEX IF EXISTS idx_b_workout_exercises_exercise CASCADE;
DROP INDEX IF EXISTS idx_b_user_assignments_user CASCADE;
DROP INDEX IF EXISTS idx_b_user_assignments_active CASCADE;
DROP INDEX IF EXISTS idx_b_workout_sessions_user CASCADE;
DROP INDEX IF EXISTS idx_b_workout_sessions_started CASCADE;
DROP INDEX IF EXISTS idx_b_workout_sessions_user_date CASCADE;
DROP INDEX IF EXISTS idx_b_session_logs_session CASCADE;
DROP INDEX IF EXISTS idx_b_session_logs_exercise CASCADE;
DROP INDEX IF EXISTS idx_b_ai_chat_user CASCADE;
DROP INDEX IF EXISTS idx_b_user_progress_user_date CASCADE;

-- Drop all tables in reverse order (CASCADE removes triggers automatically)
DROP TABLE IF EXISTS B_Session_Logs CASCADE;
DROP TABLE IF EXISTS B_Workout_Sessions CASCADE;
DROP TABLE IF EXISTS B_User_Assignments CASCADE;
DROP TABLE IF EXISTS B_Workout_Exercises CASCADE;
DROP TABLE IF EXISTS B_Workout_Days CASCADE;
DROP TABLE IF EXISTS B_Workouts CASCADE;
DROP TABLE IF EXISTS B_Exercises CASCADE;
DROP TABLE IF EXISTS B_AI_Chat_History CASCADE;
DROP TABLE IF EXISTS B_User_Progress CASCADE;
DROP TABLE IF EXISTS B_Users CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify cleanup - should return no rows
SELECT 
    tablename 
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename LIKE 'B_%'
ORDER BY 
    tablename;

-- Verify indexes cleanup - should return no rows
SELECT 
    indexname 
FROM 
    pg_indexes 
WHERE 
    schemaname = 'public' 
    AND indexname LIKE 'idx_b_%'
ORDER BY 
    indexname;

-- If both queries above return no rows, cleanup was successful!
-- Now you can run: supabase_database_script.sql
