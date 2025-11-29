import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not found in .env file')
    console.warn('Expected variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Create Supabase client with explicit configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: {
        schema: 'public'
    },
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
})

// Test connection and log table info
if (supabaseUrl && supabaseAnonKey) {
    supabase
        .from('b_exercises')
        .select('count', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                console.error('❌ Supabase connection error:', error.message)
                console.error('Error details:', error)
                console.warn('💡 Make sure you have executed the SQL scripts in Supabase Dashboard')
                console.warn('📁 Scripts location: database/supabase_database_script.sql')
            } else {
                console.log('✅ Supabase connected successfully!')
                console.log(`📊 Found ${count} exercises in B_Exercises table`)
            }
        })
}

// Helper functions for common queries
export const supabaseHelpers = {
    // Exercises
    async getAllExercises() {
        const { data, error } = await supabase
            .from('b_exercises')
            .select('*')
            .order('name')

        if (error) throw error
        return data
    },

    async getExercisesByMuscleGroup(muscleGroup) {
        const { data, error } = await supabase
            .from('b_exercises')
            .select('*')
            .eq('muscle_group', muscleGroup)
            .order('name')

        if (error) throw error
        return data
    },

    async getExercisesByEquipment(equipment) {
        const { data, error } = await supabase
            .from('b_exercises')
            .select('*')
            .eq('equipment', equipment)
            .order('name')

        if (error) throw error
        return data
    },

    async searchExercises(searchTerm) {
        const { data, error } = await supabase
            .from('b_exercises')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,muscle_group.ilike.%${searchTerm}%`)
            .order('name')

        if (error) throw error
        return data
    },

    async createExercise(exerciseData) {
        // Generate a unique exercise_key from the name
        const exercise_key = exerciseData.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, '_') // Replace spaces with underscore
            .substring(0, 50); // Limit length

        const { data, error } = await supabase
            .from('b_exercises')
            .insert({
                exercise_key,
                name: exerciseData.name,
                muscle_group: exerciseData.muscle_group,
                equipment: exerciseData.equipment,
                video_url: exerciseData.video_url || '',
                instructions: exerciseData.instructions || [],
                tags: exerciseData.tags || []
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateExercise(id, exerciseData) {
        const { data, error } = await supabase
            .from('b_exercises')
            .update({
                name: exerciseData.name,
                muscle_group: exerciseData.muscle_group,
                equipment: exerciseData.equipment,
                video_url: exerciseData.video_url || '',
                instructions: exerciseData.instructions || [],
                tags: exerciseData.tags || []
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteExercise(id) {
        const { error } = await supabase
            .from('b_exercises')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    },

    // Workouts
    async getAllWorkouts() {
        const { data, error } = await supabase
            .from('b_workouts')
            .select(`
        *,
        b_workout_days (
          *,
          b_workout_exercises (
            *,
            b_exercises (*)
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
            .from('b_workouts')
            .select(`
        *,
        b_workout_days (
          *,
          b_workout_exercises (
            *,
            b_exercises (*)
          )
        )
      `)
            .eq('id', workoutId)
            .single()

        if (error) throw error
        return data
    },

    async createWorkout(workoutData) {
        // Generate a unique workout_key
        const workout_key = 'wk_' + Date.now().toString(36);

        const { data, error } = await supabase
            .from('b_workouts')
            .insert({
                workout_key,
                title: workoutData.title,
                description: workoutData.description,
                difficulty: workoutData.difficulty,
                estimated_duration: workoutData.estimated_duration,
                days_per_week: workoutData.days_per_week,
                is_public: workoutData.is_public
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateWorkout(id, workoutData) {
        const { data, error } = await supabase
            .from('b_workouts')
            .update({
                title: workoutData.title,
                description: workoutData.description,
                difficulty: workoutData.difficulty,
                estimated_duration: workoutData.estimated_duration,
                days_per_week: workoutData.days_per_week,
                is_public: workoutData.is_public
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteWorkout(id) {
        const { error } = await supabase
            .from('b_workouts')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    },

    // User Sessions
    async createWorkoutSession(userId, workoutId, workoutDayId) {
        const { data, error } = await supabase
            .from('b_workout_sessions')
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
            .from('b_workout_sessions')
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
            .from('b_session_logs')
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
            .from('b_workout_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('started_at', startDate.toISOString())

        if (error) throw error
        return count || 0
    },

    async getUserTotalCalories(userId) {
        const { data, error } = await supabase
            .from('b_workout_sessions')
            .select('calories_burned')
            .eq('user_id', userId)

        if (error) throw error
        return data.reduce((sum, session) => sum + (session.calories_burned || 0), 0)
    },

    async getUserTotalVolume(userId) {
        const { data, error } = await supabase
            .from('b_session_logs')
            .select(`
        weight_kg,
        reps_completed,
        b_workout_sessions!inner(user_id)
      `)
            .eq('b_workout_sessions.user_id', userId)

        if (error) throw error
        return data.reduce((sum, log) => sum + (log.weight_kg * log.reps_completed), 0)
    },

    // AI Chat History
    async saveChatMessage(userId, role, content) {
        const { data, error } = await supabase
            .from('b_ai_chat_history')
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
            .from('b_ai_chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(limit)

        if (error) throw error
        return data
    }
}
