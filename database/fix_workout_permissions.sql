-- ============================================================
-- FIX WORKOUT PERMISSIONS (RLS)
-- ============================================================

-- 1. Enable RLS on Workout tables (if not already enabled)
ALTER TABLE B_Workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE B_Workout_Days ENABLE ROW LEVEL SECURITY;
ALTER TABLE B_Workout_Exercises ENABLE ROW LEVEL SECURITY;

-- 2. Policies for B_Workouts

-- Allow authenticated users to create workouts
CREATE POLICY "Users can create workouts" ON B_Workouts
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Allow users to update their own workouts
CREATE POLICY "Users can update own workouts" ON B_Workouts
    FOR UPDATE USING (auth.uid() = creator_id);

-- Allow users to delete their own workouts
CREATE POLICY "Users can delete own workouts" ON B_Workouts
    FOR DELETE USING (auth.uid() = creator_id);

-- Ensure users can SEE the workouts they just created (already covered by "Anyone can view public workouts" if public, but we need one for private too)
-- The existing policy is: is_public = true OR creator_id = auth.uid()
-- So that should be fine for SELECT.

-- 3. Policies for B_Workout_Days

-- Allow users to manage days if they own the workout
CREATE POLICY "Users can manage workout days" ON B_Workout_Days
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM B_Workouts
            WHERE B_Workouts.id = B_Workout_Days.workout_id
            AND B_Workouts.creator_id = auth.uid()
        )
    );

-- 4. Policies for B_Workout_Exercises

-- Allow users to manage exercises if they own the workout (via workout_day)
CREATE POLICY "Users can manage workout exercises" ON B_Workout_Exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM B_Workout_Days
            JOIN B_Workouts ON B_Workout_Days.workout_id = B_Workouts.id
            WHERE B_Workout_Days.id = B_Workout_Exercises.workout_day_id
            AND B_Workouts.creator_id = auth.uid()
        )
    );
