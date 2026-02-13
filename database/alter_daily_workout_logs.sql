-- Migration: alter_daily_workout_logs_and_drop_assignments
-- Date: 2026-02-12
-- Description: 
--   1. Tornar started_at nullable em b_daily_workout_logs
--   2. Adicionar coluna status ('atribuido', 'em_andamento', 'concluido')
--   3. Adicionar RLS policy para UPDATE
--   4. Remover tabela b_user_assignments (não utilizada)

-- 1. Tornar started_at nullable
ALTER TABLE public.b_daily_workout_logs ALTER COLUMN started_at DROP NOT NULL;

-- 2. Adicionar coluna status
ALTER TABLE public.b_daily_workout_logs ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'atribuido'
  CHECK (status IN ('atribuido', 'em_andamento', 'concluido'));

-- 3. RLS: permitir update próprio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'b_daily_workout_logs' AND policyname = 'b_daily_workout_logs_update_own'
  ) THEN
    CREATE POLICY "b_daily_workout_logs_update_own" ON public.b_daily_workout_logs
      FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END;
$$;

-- 4. Remover tabela não utilizada
DROP TABLE IF EXISTS public.b_user_assignments;
