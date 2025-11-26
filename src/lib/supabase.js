import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not found in .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common queries
export const supabaseHelpers = {
    // Exercises
    async getAllExercises() {
        const { data, error } = await supabase
            .from('B_Exercises')
            .select('*')
            .order('name')

        if (error) throw error
        return data
    },

    async getExercisesByMuscleGroup(muscleGroup) {
        const { data, error } = await supabase
            .from('B_Exercises')
            .select('*')
            .eq('muscle_group', muscleGroup)
            .order('name')

        if (error) throw error
        return data
    },

    async getExercisesByEquipment(equipment) {
        const { data, error } = await supabase
            .from('B_Exercises')
            .select('*')
            .eq('equipment', equipment)
            .order('name')

        if (error) throw error
        return data
    },

    async searchExercises(searchTerm) {
        const { data, error } = await supabase
            .from('B_Exercises')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,muscle_group.ilike.%${searchTerm}%`)
            .order('name')

        if (error) throw error
        return data
    },

    // Workouts
    async getAllWorkouts() {
        const { data, error } = await supabase
            .from('B_Workouts')
            .select(`
        *,
        B_Workout_Days (
          *,
          B_Workout_Exercises (
            *,
            B_Exercises (*)
          )
        )
      `)
            .eq('is_public', true)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async getWorkoutById(workoutId) {
        const { data, error } = await supabase
            .from('B_Workouts')
            .select(`
        *,
        B_Workout_Days (
          *,
          B_Workout_Exercises (
            *,
            B_Exercises (*)
          )
        )
      `)
            .eq('id', workoutId)
            .single()

        if (error) throw error
        return data
    },

    // User Sessions
    async createWorkoutSession(userId, workoutId, workoutDayId) {
        const { data, error } = await supabase
            .from('B_Workout_Sessions')
            .insert({
                user_id: userId,
                workout_id: workoutId,
                workout_day_id: workoutDayId,
                started_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async endWorkoutSession(sessionId, caloriesBurned, feeling) {
        const { data, error } = await supabase
            .from('B_Workout_Sessions')
            .update({
                ended_at: new Date().toISOString(),
                calories_burned: caloriesBurned,
                feeling: feeling
            })
            .eq('id', sessionId)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async logSet(sessionId, exerciseId, setNumber, weightKg, repsCompleted) {
        const { data, error } = await supabase
            .from('B_Session_Logs')
            .insert({
                session_id: sessionId,
                exercise_id: exerciseId,
                set_number: setNumber,
                weight_kg: weightKg,
                reps_completed: repsCompleted
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    // Dashboard Stats
    async getUserFrequency(userId, days = 7) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { count, error } = await supabase
            .from('B_Workout_Sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('started_at', startDate.toISOString())

        if (error) throw error
        return count || 0
    },

    async getUserTotalCalories(userId) {
        const { data, error } = await supabase
            .from('B_Workout_Sessions')
            .select('calories_burned')
            .eq('user_id', userId)

        if (error) throw error
        return data.reduce((sum, session) => sum + (session.calories_burned || 0), 0)
    },

    async getUserTotalVolume(userId) {
        const { data, error } = await supabase
            .from('B_Session_Logs')
            .select(`
        weight_kg,
        reps_completed,
        B_Workout_Sessions!inner(user_id)
      `)
            .eq('B_Workout_Sessions.user_id', userId)

        if (error) throw error
        return data.reduce((sum, log) => sum + (log.weight_kg * log.reps_completed), 0)
    },

    // AI Chat History
    async saveChatMessage(userId, role, content) {
        const { data, error } = await supabase
            .from('B_AI_Chat_History')
            .insert({
                user_id: userId,
                role: role,
                content: content
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async getChatHistory(userId, limit = 50) {
        const { data, error } = await supabase
            .from('B_AI_Chat_History')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(limit)

        if (error) throw error
        return data
    }
}
