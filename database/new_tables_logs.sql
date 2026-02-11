-- Criação das tabelas de log solicitadas (b_daily_workout_logs e b_session_logs)

-- 1. Tabela de Logs Diários de Treino (Sessões)
CREATE TABLE IF NOT EXISTS public.b_daily_workout_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES public.b_workouts(id) ON DELETE SET NULL,
    workout_day_id UUID REFERENCES public.b_workout_days(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de Segurança (RLS) para b_daily_workout_logs
ALTER TABLE public.b_daily_workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios logs diários" 
ON public.b_daily_workout_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios logs diários" 
ON public.b_daily_workout_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios logs diários" 
ON public.b_daily_workout_logs FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios logs diários" 
ON public.b_daily_workout_logs FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Tabela de Logs de Sessão (Exercícios Realizados)
CREATE TABLE IF NOT EXISTS public.b_session_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    daily_log_id UUID NOT NULL REFERENCES public.b_daily_workout_logs(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.b_exercises(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sets_completed INT DEFAULT 1,
    reps_performed VARCHAR,
    weight_kg FLOAT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garante que um exercício só seja logado uma vez por sessão (ou remove se quiser permitir múltiplos sets separados)
    UNIQUE(daily_log_id, exercise_id)
);

-- Políticas de Segurança (RLS) para b_session_logs
ALTER TABLE public.b_session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus logs de sessão" 
ON public.b_session_logs FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.b_daily_workout_logs 
    WHERE b_daily_workout_logs.id = b_session_logs.daily_log_id 
    AND b_daily_workout_logs.user_id = auth.uid()
));

CREATE POLICY "Usuários podem criar logs de sessão" 
ON public.b_session_logs FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.b_daily_workout_logs 
    WHERE b_daily_workout_logs.id = daily_log_id 
    AND b_daily_workout_logs.user_id = auth.uid()
));

CREATE POLICY "Usuários podem atualizar logs de sessão" 
ON public.b_session_logs FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.b_daily_workout_logs 
    WHERE b_daily_workout_logs.id = daily_log_id 
    AND b_daily_workout_logs.user_id = auth.uid()
));

CREATE POLICY "Usuários podem deletar logs de sessão" 
ON public.b_session_logs FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.b_daily_workout_logs 
    WHERE b_daily_workout_logs.id = daily_log_id 
    AND b_daily_workout_logs.user_id = auth.uid()
));
