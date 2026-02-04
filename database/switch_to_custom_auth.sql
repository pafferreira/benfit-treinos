-- ==============================================================================
-- SWITCH TO B_USERS ONLY AUTH (Disable RLS, Custom Login)
-- ==============================================================================

-- 1. Create RPC function to get user by email (Security Definer to bypass any remaining checks)
CREATE OR REPLACE FUNCTION public.get_user_by_email(email_input TEXT)
RETURNS SETOF public.b_users
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.b_users WHERE email = email_input;
$$;

-- 2. DISABLE RLS on all relevant tables
-- Since we are abandoning Supabase Auth tokens, we cannot checks auth.uid().
-- We will rely on the Application Logic to filter data by user_id.

ALTER TABLE public.b_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_user_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_workout_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_session_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_exercises DISABLE ROW LEVEL SECURITY; -- Generally public anyway
ALTER TABLE public.b_ai_chat_history DISABLE ROW LEVEL SECURITY;

-- 3. Grant Permissions to Anon (Public) role so the client can read/write without a token
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
