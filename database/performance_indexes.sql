-- Índices de performance para queries do dashboard e histórico.
-- Executar no SQL Editor do Supabase.

-- getUserActivePlans: filtra user_id + status em b_daily_workout_logs
CREATE INDEX IF NOT EXISTS idx_b_daily_workout_logs_user_status
    ON b_daily_workout_logs (user_id, status);

-- context.js / planos do usuário: b_workouts filtrado por creator_id
CREATE INDEX IF NOT EXISTS idx_b_workouts_creator_created
    ON b_workouts (creator_id, created_at DESC);

-- getDashboardStats / histórico: sessões concluídas por usuário
CREATE INDEX IF NOT EXISTS idx_b_workout_sessions_user_ended
    ON b_workout_sessions (user_id, ended_at DESC)
    WHERE ended_at IS NOT NULL;

-- Busca vetorial: memórias privadas filtradas por user_id
CREATE INDEX IF NOT EXISTS idx_b_benfit_embeddings_user
    ON b_benfit_embeddings (user_id);
