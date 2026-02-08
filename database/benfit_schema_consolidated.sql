/*
 * BENFIT TREINOS - CONSOLIDATED DATABASE SCHEMA
 * Data: 2026-02-05
 * 
 * Este arquivo contém a estrutura completa e atualizada do banco de dados Benfit.
 * Substitui todos os scripts de criação e correções anteriores.
 */

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS (Perfil Público/Aplicação)
CREATE TABLE IF NOT EXISTS "public"."b_users" (
    "id" UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    "email" TEXT UNIQUE,
    "name" TEXT,
    "avatar_url" TEXT,
    "plan_type" TEXT DEFAULT 'FREE', -- FREE, PRO, ELITE
    "role" TEXT DEFAULT 'user', -- user, admin
    "phone" TEXT,
    "birth_date" DATE,
    "gender" TEXT,
    "height_cm" NUMERIC,
    "weight_kg" NUMERIC,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE EXERCÍCIOS
CREATE TABLE IF NOT EXISTS "public"."b_exercises" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "exercise_key" TEXT UNIQUE,
    "name" TEXT NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "equipment" TEXT,
    "video_url" TEXT,
    "instructions" TEXT[],
    "tags" TEXT[],
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE PLANOS DE TREINO (WORKOUTS)
CREATE TABLE IF NOT EXISTS "public"."b_workouts" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "workout_key" TEXT UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" TEXT,
    "estimated_duration" INTEGER,
    "days_per_week" INTEGER,
    "cover_image" TEXT,
    "is_public" BOOLEAN DEFAULT FALSE,
    "creator_id" UUID REFERENCES "public"."b_users"("id"),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE DIAS DE TREINO
CREATE TABLE IF NOT EXISTS "public"."b_workout_days" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "workout_id" UUID REFERENCES "public"."b_workouts"("id") ON DELETE CASCADE,
    "day_number" INTEGER NOT NULL,
    "day_name" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE EXERCÍCIOS DO TREINO
CREATE TABLE IF NOT EXISTS "public"."b_workout_exercises" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "workout_day_id" UUID REFERENCES "public"."b_workout_days"("id") ON DELETE CASCADE,
    "exercise_id" UUID REFERENCES "public"."b_exercises"("id") ON DELETE SET NULL,
    "order_index" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" TEXT,
    "rest_seconds" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA DE ATRIBUIÇÕES DE TREINO
CREATE TABLE IF NOT EXISTS "public"."b_user_assignments" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID REFERENCES "public"."b_users"("id") ON DELETE CASCADE,
    "workout_id" UUID REFERENCES "public"."b_workouts"("id") ON DELETE CASCADE,
    "assigned_day" TEXT,
    "active" BOOLEAN DEFAULT TRUE,
    "assigned_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA DE SESSÕES REALIZADAS
CREATE TABLE IF NOT EXISTS "public"."b_workout_sessions" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID REFERENCES "public"."b_users"("id") ON DELETE CASCADE,
    "workout_id" UUID REFERENCES "public"."b_workouts"("id") ON DELETE SET NULL,
    "workout_day_id" UUID REFERENCES "public"."b_workout_days"("id") ON DELETE SET NULL,
    "started_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "ended_at" TIMESTAMP WITH TIME ZONE,
    "calories_burned" NUMERIC,
    "feeling" INTEGER,
    "notes" TEXT
);

-- 8. TABELA DE LOGS DE SÉRIES
CREATE TABLE IF NOT EXISTS "public"."b_session_logs" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "session_id" UUID REFERENCES "public"."b_workout_sessions"("id") ON DELETE CASCADE,
    "exercise_id" UUID REFERENCES "public"."b_exercises"("id") ON DELETE SET NULL,
    "set_number" INTEGER NOT NULL,
    "weight_kg" NUMERIC,
    "reps_completed" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABELA DE HISTÓRICO DO CHAT IA
CREATE TABLE IF NOT EXISTS "public"."b_ai_chat_history" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID REFERENCES "public"."b_users"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TABELA DE PROGRESSO DO USUÁRIO
CREATE TABLE IF NOT EXISTS "public"."b_user_progress" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID REFERENCES "public"."b_users"("id") ON DELETE CASCADE,
    "date" DATE DEFAULT CURRENT_DATE,
    "weight_kg" NUMERIC,
    "body_fat_percentage" NUMERIC,
    "muscle_mass_kg" NUMERIC,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TABELA DE METAS DO USUÁRIO
CREATE TABLE IF NOT EXISTS "public"."b_user_goals" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID REFERENCES "public"."b_users"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATE,
    "is_completed" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. TABELA DE LOGS DIÁRIOS (Calendário)
CREATE TABLE IF NOT EXISTS "public"."b_daily_workout_logs" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID REFERENCES "public"."b_users"("id") ON DELETE CASCADE,
    "workout_date" DATE NOT NULL,
    "workout_day_id" UUID REFERENCES "public"."b_workout_days"("id") ON DELETE SET NULL,
    "completed" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, workout_date)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE "public"."b_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_workouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_workout_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_workout_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_user_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_workout_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_session_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_ai_chat_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_user_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_user_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."b_daily_workout_logs" ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- b_users: Permite acesso pelo ID do Auth ou pelo Email no JWT (mais robusto)
CREATE POLICY "Users_Own_Data" ON "public"."b_users" FOR ALL USING (auth.uid() = id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Exercises_Public" ON "public"."b_exercises" FOR SELECT USING (true);

CREATE POLICY "Workouts_Public" ON "public"."b_workouts" FOR SELECT USING (is_public = true OR auth.uid() = creator_id);
CREATE POLICY "Workouts_Creator" ON "public"."b_workouts" FOR ALL USING (auth.uid() = creator_id);

-- Políticas genéricas para dados do próprio usuário
CREATE POLICY "User_Own_Assignments" ON "public"."b_user_assignments" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User_Own_Sessions" ON "public"."b_workout_sessions" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User_Own_Chat" ON "public"."b_ai_chat_history" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User_Own_Progress" ON "public"."b_user_progress" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User_Own_Goals" ON "public"."b_user_goals" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User_Own_Daily_Logs" ON "public"."b_daily_workout_logs" FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';
CREATE TRIGGER update_b_users_updated_at BEFORE UPDATE ON "public"."b_users" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_b_exercises_updated_at BEFORE UPDATE ON "public"."b_exercises" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_b_workouts_updated_at BEFORE UPDATE ON "public"."b_workouts" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();