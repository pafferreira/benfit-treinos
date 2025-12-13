-- ============================================================
-- FIX ORPHAN WORKOUTS PERMISSIONS
-- ============================================================

-- 1. Allow updating workouts that have no creator (orphan)
-- This allows users to "claim" workouts by updating them (setting creator_id)
CREATE POLICY "Allow update on orphan workouts" ON B_Workouts
    FOR UPDATE USING (creator_id IS NULL);

-- 2. Allow deleting orphan workouts
CREATE POLICY "Allow delete on orphan workouts" ON B_Workouts
    FOR DELETE USING (creator_id IS NULL);

-- 3. Allow managing days for orphan workouts
CREATE POLICY "Allow manage days for orphan workouts" ON B_Workout_Days
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM B_Workouts
            WHERE B_Workouts.id = B_Workout_Days.workout_id
            AND B_Workouts.creator_id IS NULL
        )
    );

-- 4. Allow managing exercises for orphan workouts
CREATE POLICY "Allow manage exercises for orphan workouts" ON B_Workout_Exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM B_Workout_Days
            JOIN B_Workouts ON B_Workout_Days.workout_id = B_Workouts.id
            WHERE B_Workout_Days.id = B_Workout_Exercises.workout_day_id
            AND B_Workouts.creator_id IS NULL
        )
    );
