-- ============================================================
-- MEU TREINO - DAILY WORKOUT LOGS TABLE
-- Tracks which days users completed workouts (for calendar highlighting)
-- ============================================================

CREATE TABLE B_Daily_Workout_Logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES B_Users(id) ON DELETE CASCADE,
    workout_date DATE NOT NULL,
    workout_day_id UUID REFERENCES B_Workout_Days(id) ON DELETE SET NULL,
    completed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workout_date)
);

-- Index for user date lookups
CREATE INDEX idx_b_daily_workout_logs_user_date ON B_Daily_Workout_Logs(user_id, workout_date DESC);

-- Enable RLS
ALTER TABLE B_Daily_Workout_Logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs
CREATE POLICY "Users can view own daily logs" ON B_Daily_Workout_Logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own daily logs" ON B_Daily_Workout_Logs
    FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE B_Daily_Workout_Logs IS 'Tracks which days users completed workouts for calendar highlighting';
