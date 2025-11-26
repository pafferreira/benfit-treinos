-- ============================================================
-- BENFIT TREINOS - DATABASE SCHEMA FOR SUPABASE
-- Project: benfit
-- Prefix: B_
-- Created: 2025-11-25
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE (B_Users)
-- Stores user account and profile information
-- ============================================================
CREATE TABLE B_Users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    plan_type VARCHAR(20) DEFAULT 'FREE' CHECK (plan_type IN ('FREE', 'PRO', 'ELITE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_b_users_email ON B_Users(email);

-- ============================================================
-- 2. EXERCISES TABLE (B_Exercises)
-- Catalog of all available exercises in the system
-- ============================================================
CREATE TABLE B_Exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'panturrilha_em_pe_livre'
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100) NOT NULL,
    equipment VARCHAR(100) NOT NULL,
    video_url VARCHAR(500),
    instructions TEXT[],
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for filtering
CREATE INDEX idx_b_exercises_muscle_group ON B_Exercises(muscle_group);
CREATE INDEX idx_b_exercises_equipment ON B_Exercises(equipment);
CREATE INDEX idx_b_exercises_key ON B_Exercises(exercise_key);

-- ============================================================
-- 3. WORKOUTS TABLE (B_Workouts)
-- Workout plans/programs (e.g., "Treino 01 - Adaptação e Base")
-- ============================================================
CREATE TABLE B_Workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'wk_01'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(50) CHECK (difficulty IN ('Iniciante', 'Intermediário', 'Avançado', 'Iniciante / Intermediário')),
    estimated_duration INTEGER, -- in minutes
    days_per_week INTEGER,
    cover_image VARCHAR(500),
    is_public BOOLEAN DEFAULT true,
    creator_id UUID REFERENCES B_Users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for public workouts
CREATE INDEX idx_b_workouts_public ON B_Workouts(is_public);
CREATE INDEX idx_b_workouts_difficulty ON B_Workouts(difficulty);

-- ============================================================
-- 4. WORKOUT_DAYS TABLE (B_Workout_Days)
-- Individual training days within a workout plan
-- ============================================================
CREATE TABLE B_Workout_Days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES B_Workouts(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL, -- Order of the day (1, 2, 3...)
    day_name VARCHAR(255) NOT NULL, -- e.g., "Dia 1 - Inferior (Foco Quadríceps)"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workout_id, day_number)
);

-- Index for workout lookups
CREATE INDEX idx_b_workout_days_workout ON B_Workout_Days(workout_id);

-- ============================================================
-- 5. WORKOUT_EXERCISES TABLE (B_Workout_Exercises)
-- Links exercises to workout days with prescription details
-- ============================================================
CREATE TABLE B_Workout_Exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_day_id UUID NOT NULL REFERENCES B_Workout_Days(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES B_Exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL, -- Order within the day
    sets INTEGER NOT NULL,
    reps VARCHAR(50) NOT NULL, -- e.g., "10-12", "15-20"
    rest_seconds INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workout_day_id, order_index)
);

-- Index for workout day lookups
CREATE INDEX idx_b_workout_exercises_day ON B_Workout_Exercises(workout_day_id);
CREATE INDEX idx_b_workout_exercises_exercise ON B_Workout_Exercises(exercise_id);

-- ============================================================
-- 6. USER_ASSIGNMENTS TABLE (B_User_Assignments)
-- Assigns workouts to users (their active training plan)
-- ============================================================
CREATE TABLE B_User_Assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES B_Users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES B_Workouts(id) ON DELETE CASCADE,
    assigned_day VARCHAR(50), -- e.g., "Segunda", "Terça"
    active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for user lookups
CREATE INDEX idx_b_user_assignments_user ON B_User_Assignments(user_id);
CREATE INDEX idx_b_user_assignments_active ON B_User_Assignments(user_id, active);

-- ============================================================
-- 7. WORKOUT_SESSIONS TABLE (B_Workout_Sessions)
-- Records each time a user completes a workout
-- ============================================================
CREATE TABLE B_Workout_Sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES B_Users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES B_Workouts(id) ON DELETE CASCADE,
    workout_day_id UUID REFERENCES B_Workout_Days(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    calories_burned INTEGER,
    feeling INTEGER CHECK (feeling >= 1 AND feeling <= 10), -- 1-10 scale
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics
CREATE INDEX idx_b_workout_sessions_user ON B_Workout_Sessions(user_id);
CREATE INDEX idx_b_workout_sessions_started ON B_Workout_Sessions(started_at);
CREATE INDEX idx_b_workout_sessions_user_date ON B_Workout_Sessions(user_id, started_at);

-- ============================================================
-- 8. SESSION_LOGS TABLE (B_Session_Logs)
-- Detailed logs of each set performed during a session
-- ============================================================
CREATE TABLE B_Session_Logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES B_Workout_Sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES B_Exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight_kg DECIMAL(6, 2), -- e.g., 100.50 kg
    reps_completed INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for session lookups
CREATE INDEX idx_b_session_logs_session ON B_Session_Logs(session_id);
CREATE INDEX idx_b_session_logs_exercise ON B_Session_Logs(exercise_id);

-- ============================================================
-- 9. AI_CHAT_HISTORY TABLE (B_AI_Chat_History)
-- Stores AI Coach conversation history
-- ============================================================
CREATE TABLE B_AI_Chat_History (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES B_Users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for user chat history
CREATE INDEX idx_b_ai_chat_user ON B_AI_Chat_History(user_id, created_at);

-- ============================================================
-- 10. USER_PROGRESS TABLE (B_User_Progress)
-- Tracks user progress metrics over time
-- ============================================================
CREATE TABLE B_User_Progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES B_Users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight_kg DECIMAL(5, 2),
    body_fat_percentage DECIMAL(4, 2),
    muscle_mass_kg DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Index for user progress tracking
CREATE INDEX idx_b_user_progress_user_date ON B_User_Progress(user_id, date DESC);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- Automatically update the updated_at timestamp
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_b_users_updated_at BEFORE UPDATE ON B_Users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_b_exercises_updated_at BEFORE UPDATE ON B_Exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_b_workouts_updated_at BEFORE UPDATE ON B_Workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for user data protection
-- ============================================================

-- Enable RLS on user-specific tables
ALTER TABLE B_Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE B_User_Assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE B_Workout_Sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE B_Session_Logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE B_AI_Chat_History ENABLE ROW LEVEL SECURITY;
ALTER TABLE B_User_Progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON B_Users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON B_Users
    FOR UPDATE USING (auth.uid() = id);

-- User assignments policies
CREATE POLICY "Users can view own assignments" ON B_User_Assignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own assignments" ON B_User_Assignments
    FOR ALL USING (auth.uid() = user_id);

-- Workout sessions policies
CREATE POLICY "Users can view own sessions" ON B_Workout_Sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON B_Workout_Sessions
    FOR ALL USING (auth.uid() = user_id);

-- Session logs policies
CREATE POLICY "Users can view own session logs" ON B_Session_Logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM B_Workout_Sessions
            WHERE B_Workout_Sessions.id = B_Session_Logs.session_id
            AND B_Workout_Sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own session logs" ON B_Session_Logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM B_Workout_Sessions
            WHERE B_Workout_Sessions.id = B_Session_Logs.session_id
            AND B_Workout_Sessions.user_id = auth.uid()
        )
    );

-- AI Chat history policies
CREATE POLICY "Users can view own chat history" ON B_AI_Chat_History
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat history" ON B_AI_Chat_History
    FOR ALL USING (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users can view own progress" ON B_User_Progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON B_User_Progress
    FOR ALL USING (auth.uid() = user_id);

-- Public tables (exercises and workouts) - everyone can read
CREATE POLICY "Anyone can view exercises" ON B_Exercises
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view public workouts" ON B_Workouts
    FOR SELECT USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Anyone can view workout days" ON B_Workout_Days
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view workout exercises" ON B_Workout_Exercises
    FOR SELECT USING (true);

-- ============================================================
-- SAMPLE QUERIES FOR DASHBOARD
-- ============================================================

-- Query 1: Frequency (Last 7 days)
-- SELECT COUNT(*) as frequency
-- FROM B_Workout_Sessions
-- WHERE user_id = 'USER_UUID'
-- AND started_at >= NOW() - INTERVAL '7 days';

-- Query 2: Total Calories Burned
-- SELECT SUM(calories_burned) as total_calories
-- FROM B_Workout_Sessions
-- WHERE user_id = 'USER_UUID';

-- Query 3: Total Volume (Weight * Reps)
-- SELECT SUM(weight_kg * reps_completed) as total_volume
-- FROM B_Session_Logs sl
-- JOIN B_Workout_Sessions ws ON sl.session_id = ws.id
-- WHERE ws.user_id = 'USER_UUID';

-- Query 4: Next Workout
-- SELECT w.title, w.estimated_duration, ua.assigned_day
-- FROM B_User_Assignments ua
-- JOIN B_Workouts w ON ua.workout_id = w.id
-- WHERE ua.user_id = 'USER_UUID'
-- AND ua.active = true
-- ORDER BY ua.assigned_at DESC
-- LIMIT 1;

-- Query 5: Recent Sessions
-- SELECT ws.*, w.title
-- FROM B_Workout_Sessions ws
-- JOIN B_Workouts w ON ws.workout_id = w.id
-- WHERE ws.user_id = 'USER_UUID'
-- ORDER BY ws.started_at DESC
-- LIMIT 10;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE B_Users IS 'User accounts and profiles';
COMMENT ON TABLE B_Exercises IS 'Exercise library catalog';
COMMENT ON TABLE B_Workouts IS 'Workout plans and programs';
COMMENT ON TABLE B_Workout_Days IS 'Individual training days within workout plans';
COMMENT ON TABLE B_Workout_Exercises IS 'Exercise prescriptions for workout days';
COMMENT ON TABLE B_User_Assignments IS 'User workout assignments';
COMMENT ON TABLE B_Workout_Sessions IS 'Completed workout sessions';
COMMENT ON TABLE B_Session_Logs IS 'Detailed set-by-set logs';
COMMENT ON TABLE B_AI_Chat_History IS 'AI Coach conversation history';
COMMENT ON TABLE B_User_Progress IS 'User body composition and progress tracking';

-- ============================================================
-- END OF SCRIPT
-- ============================================================
