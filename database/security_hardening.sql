-- ==============================================================================
-- HARDENING DE SEGURANÇA E AUTHENTICATION MIGRATION (CORRIGIDO)
-- Versão 2: Garante que as tabelas existem (CREATE IF NOT EXISTS) e usa nomes minúsculos
-- ==============================================================================

-- 1. GARANTIR TABELAS PRINCIPAIS (Schema Base)
-- Muitas vezes o erro ocorre porque tabelas de features ainda não foram criadas.

-- Tabela: b_users (Perfil)
CREATE TABLE IF NOT EXISTS b_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id), -- Agora link estrito com Auth
    email TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    birth_date DATE,
    gender TEXT,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Tabela: b_user_goals (Metas)
CREATE TABLE IF NOT EXISTS b_user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    deadline DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Tabela: b_workouts (Treinos)
CREATE TABLE IF NOT EXISTS b_workouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_key TEXT,
    title TEXT,
    description TEXT,
    difficulty TEXT,
    estimated_duration INTEGER, -- minutos
    days_per_week INTEGER,
    is_public BOOLEAN DEFAULT false,
    creator_id UUID REFERENCES auth.users(id), -- Link com Auth
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Tabela: b_workout_days
CREATE TABLE IF NOT EXISTS b_workout_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_id UUID REFERENCES b_workouts(id) ON DELETE CASCADE,
    day_number INTEGER,
    day_name TEXT
);

-- Tabela: b_workout_exercises
CREATE TABLE IF NOT EXISTS b_workout_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_day_id UUID REFERENCES b_workout_days(id) ON DELETE CASCADE,
    exercise_id UUID, -- Referência solta ou para b_exercises se existir
    order_index INTEGER,
    sets INTEGER,
    reps TEXT,
    notes TEXT
);

-- Tabela: b_workout_sessions (Sessões Realizadas)
CREATE TABLE IF NOT EXISTS b_workout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES b_workouts(id),
    workout_day_id UUID REFERENCES b_workout_days(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    calories_burned NUMERIC,
    feeling TEXT
);

-- Tabela: b_session_logs (Logs de Sets)
CREATE TABLE IF NOT EXISTS b_session_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES b_workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID,
    set_number INTEGER,
    weight_kg NUMERIC,
    reps_completed INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Tabela: b_ai_chat_history
CREATE TABLE IF NOT EXISTS b_ai_chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);


-- 2. HABILITAR RLS (Segurança)
ALTER TABLE b_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_ai_chat_history ENABLE ROW LEVEL SECURITY;

-- 3. LIMPAR POLÍTICAS ANTIGAS (Evitar conflitos)
DO $$ 
BEGIN
    -- b_users
    DROP POLICY IF EXISTS "Users can update own profile" ON b_users;
    DROP POLICY IF EXISTS "Public Read Users" ON b_users;
    DROP POLICY IF EXISTS "Admins can do everything on users" ON b_users;
    -- b_user_goals
    DROP POLICY IF EXISTS "Users can create own goals" ON b_user_goals;
    DROP POLICY IF EXISTS "Users can manage own goals" ON b_user_goals;
    DROP POLICY IF EXISTS "Public access to goals" ON b_user_goals;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;


-- 4. CRIAR NOVAS POLÍTICAS SEGURAS (auth.uid())

-- [b_users]
-- Leitura pública (para ver coach, ranking, etc)
CREATE POLICY "Public Read Users" ON b_users FOR SELECT USING (true);
-- Update apenas dono
CREATE POLICY "Users can update own profile" ON b_users FOR UPDATE USING (auth.uid() = id);
-- Insert via Trigger apenas (geralmente) ou pelo próprio user no cadastro
CREATE POLICY "Users can insert own profile" ON b_users FOR INSERT WITH CHECK (auth.uid() = id);

-- [b_user_goals]
CREATE POLICY "Users can create own goals" ON b_user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON b_user_goals FOR ALL USING (auth.uid() = user_id);

-- [b_workouts]
-- Leitura: Publicos ou Meus
CREATE POLICY "Read Public or Own Workouts" ON b_workouts 
    FOR SELECT USING (is_public = true OR auth.uid() = creator_id);
-- Escrita: Apenas meus
CREATE POLICY "Manage Own Workouts" ON b_workouts 
    FOR ALL USING (auth.uid() = creator_id);

-- [b_workout_sessions]
CREATE POLICY "Manage Own Sessions" ON b_workout_sessions 
    FOR ALL USING (auth.uid() = user_id);

-- [b_session_logs]
-- Logs dependem da sessão. Usamos uma subquery ou check simples se session pertence ao user.
-- Postgres RLS com JOINs pode ser pesado, mas seguro.
CREATE POLICY "Manage Own Logs" ON b_session_logs 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM b_workout_sessions 
            WHERE b_workout_sessions.id = session_id 
            AND b_workout_sessions.user_id = auth.uid()
        )
    );

-- [b_ai_chat_history]
CREATE POLICY "Manage Own Chat" ON b_ai_chat_history 
    FOR ALL USING (auth.uid() = user_id);


-- 5. TRIGGER DE MIGRAÇÃO (Auth Hook)
-- Cria o perfil em b_users automaticamente ao registrar no Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.b_users (id, email, name, avatar_url, role)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
        COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url;
        
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associar Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
