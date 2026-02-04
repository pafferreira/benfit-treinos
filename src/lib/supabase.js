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

// Custom Auth Implementation (No Supabase Auth, b_users only)
const STORAGE_KEY = 'benfit_user';

// Helper to get stored user
const getStoredUser = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

// Helper to create a fake session object
const createMockSession = (user) => {
    if (!user) return null;
    // CRITICAL: Use the ANON KEY as the token so the server accepts the header.
    // 'mock-token' causes "Expected 3 parts in JWT" error.
    return {
        access_token: import.meta.env.VITE_SUPABASE_ANON_KEY,
        token_type: 'bearer',
        user: {
            id: user.id,
            email: user.email,
            user_metadata: { ...user },
            app_metadata: {},
            aud: 'authenticated'
        }
    };
};

// Override Auth Methods
supabase.auth.getSession = async () => {
    const user = getStoredUser();
    return { data: { session: createMockSession(user) }, error: null };
};

supabase.auth.getUser = async () => {
    const user = getStoredUser();
    // Transform b_users record to Auth User shape
    const authUser = user ? {
        id: user.id,
        email: user.email,
        user_metadata: { ...user },
        app_metadata: {},
        aud: 'authenticated'
    } : null;
    return { data: { user: authUser }, error: null };
};

supabase.auth.signInWithPassword = async ({ email }) => {
    try {
        const cleanEmail = email.trim();
        console.log('🔍 Attempting B_Users login for:', cleanEmail);

        // Query b_users directly (RLS is disabled so this works publicly now)
        const { data, error } = await supabase
            .from('b_users')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();

        console.log('🔍 Login Query Result:', { data, error });

        if (error) throw error;
        if (!data) {
            return { data: { user: null, session: null }, error: { message: 'Usuário não encontrado.' } };
        }

        const user = data; // Queries return object directly when using single/maybeSingle
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

        // Notify Listeners
        if (supabase.auth.onAuthStateChangeCallback) {
            supabase.auth.onAuthStateChangeCallback('SIGNED_IN', createMockSession(user));
        }

        return { data: { user, session: createMockSession(user) }, error: null };
    } catch (err) {
        return { data: { user: null, session: null }, error: err };
    }
};

supabase.auth.signOut = async () => {
    localStorage.removeItem(STORAGE_KEY);
    if (supabase.auth.onAuthStateChangeCallback) {
        supabase.auth.onAuthStateChangeCallback('SIGNED_OUT', null);
    }
    return { error: null };
};

// Hook into onAuthStateChange
const originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);
supabase.auth.onAuthStateChange = (callback) => {
    supabase.auth.onAuthStateChangeCallback = callback;
    // Initial check
    const user = getStoredUser();
    if (user) {
        setTimeout(() => callback('SIGNED_IN', createMockSession(user)), 0);
    }
    return { data: { subscription: { unsubscribe: () => { supabase.auth.onAuthStateChangeCallback = null; } } } };
};

// Helper functions for common queries
export const supabaseHelpers = {
    // Custom Login Helper
    async login(email) {
        return await supabase.auth.signInWithPassword({ email });
    },

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
            .maybeSingle()

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
            .maybeSingle()

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
        // Get current user for creator_id
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('Usuário não autenticado');

        // Generate a unique workout_key
        const workout_key = 'wk_' + Date.now().toString(36);

        const { data: workoutResult, error: workoutError } = await supabase
            .from('b_workouts')
            .insert({
                workout_key,
                title: workoutData.title,
                description: workoutData.description,
                difficulty: workoutData.difficulty,
                estimated_duration: workoutData.estimated_duration,
                days_per_week: workoutData.days_per_week,
                is_public: workoutData.is_public,
                creator_id: user.id
            })
            .select()

        const workout = workoutResult ? workoutResult[0] : null;

        if (workoutError) throw workoutError
        if (!workout) throw new Error('Falha ao criar treino: Nenhum dado retornado. Verifique as permissões (RLS).');

        // If there is a schedule, save days and exercises
        if (workoutData.schedule && workoutData.schedule.length > 0) {
            for (let i = 0; i < workoutData.schedule.length; i++) {
                const day = workoutData.schedule[i];

                // Create Day
                const { data: dayDataResult, error: dayError } = await supabase
                    .from('b_workout_days')
                    .insert({
                        workout_id: workout.id,
                        day_number: i + 1,
                        day_name: day.day_name
                    })
                    .select();

                const dayData = dayDataResult ? dayDataResult[0] : null;

                if (dayError) {
                    console.error('Error creating workout day:', dayError);
                    continue; // Skip exercises if day creation failed
                }

                if (!dayData) {
                    console.error('Error creating workout day: No data returned (RLS?)');
                    continue;
                }

                // Create Exercises for this Day
                if (day.exercises && day.exercises.length > 0) {
                    const exercisesToInsert = day.exercises.map((ex, index) => ({
                        workout_day_id: dayData.id,
                        exercise_id: ex.exercise_id,
                        order_index: index + 1,
                        sets: parseInt(ex.sets) || 3,
                        reps: ex.reps || '10',
                        notes: ex.notes || ''
                    }));

                    const { error: exercisesError } = await supabase
                        .from('b_workout_exercises')
                        .insert(exercisesToInsert);

                    if (exercisesError) {
                        console.error('Error creating workout exercises:', exercisesError);
                    }
                }
            }
        }

        return workout
    },

    async updateWorkout(id, workoutData) {
        // Get current user to ensure ownership
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Update Workout Details
        const { data: workoutResult, error: workoutError } = await supabase
            .from('b_workouts')
            .update({
                title: workoutData.title,
                description: workoutData.description,
                difficulty: workoutData.difficulty,
                estimated_duration: workoutData.estimated_duration,
                days_per_week: workoutData.days_per_week,
                is_public: workoutData.is_public,
                creator_id: user ? user.id : undefined // Claim ownership if possible
            })
            .eq('id', id)
            .select()

        const workout = workoutResult ? workoutResult[0] : null;

        if (workoutError) throw workoutError
        if (!workout) throw new Error('Falha ao atualizar treino: Nenhum dado retornado. Verifique as permissões (RLS).');

        // 2. Update Schedule (Delete existing and re-create)
        // This is the simplest strategy to handle reordering, additions, and removals
        if (workoutData.schedule) {
            // Delete existing days (Cascade will delete exercises)
            const { error: deleteError } = await supabase
                .from('b_workout_days')
                .delete()
                .eq('workout_id', id);

            if (deleteError) throw deleteError;

            // Re-create Days and Exercises
            if (workoutData.schedule.length > 0) {
                for (let i = 0; i < workoutData.schedule.length; i++) {
                    const day = workoutData.schedule[i];

                    // Create Day
                    const { data: dayDataResult, error: dayError } = await supabase
                        .from('b_workout_days')
                        .insert({
                            workout_id: id,
                            day_number: i + 1,
                            day_name: day.day_name
                        })
                        .select();

                    const dayData = dayDataResult ? dayDataResult[0] : null;

                    if (dayError) {
                        console.error('Error creating workout day:', dayError);
                        continue;
                    }

                    if (!dayData) {
                        console.error('Error creating workout day: No data returned (RLS?)');
                        continue;
                    }

                    // Create Exercises
                    if (day.exercises && day.exercises.length > 0) {
                        const exercisesToInsert = day.exercises.map((ex, index) => ({
                            workout_day_id: dayData.id,
                            exercise_id: ex.exercise_id,
                            order_index: index + 1,
                            sets: parseInt(ex.sets) || 3,
                            reps: ex.reps || '10',
                            notes: ex.notes || ''
                        }));

                        const { error: exercisesError } = await supabase
                            .from('b_workout_exercises')
                            .insert(exercisesToInsert);

                        if (exercisesError) {
                            console.error('Error creating workout exercises:', exercisesError);
                        }
                    }
                }
            }
        }

        return workout
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
    },

    // User Profile
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) return null;

        // Fetch profile data from B_Users
        // First, try by ID
        let { data: profile, error: profileError } = await supabase
            .from('b_users')
            .select('*')
            .eq('id', user.id)
            .single();

        // If not found by ID, try by Email (fallback for inconsistent IDs)
        if (!profile && user.email) {
            const { data: profileByEmail, error: emailError } = await supabase
                .from('b_users')
                .select('*')
                .eq('email', user.email)
                .single();

            if (profileByEmail) {
                profile = profileByEmail;
            }
        }

        if (profileError && profileError.code !== 'PGRST116' && !profile) {
            console.error('Error fetching profile:', profileError);
        }

        return { ...user, ...profile };
    },

    async updateUserProfile(userId, profileData) {
        // Prepare data for Upsert
        let targetId = userId;
        const upsertData = {
            name: profileData.name || 'Usuário',
            phone: profileData.phone,
            birth_date: profileData.birth_date,
            gender: profileData.gender,
            height_cm: profileData.height_cm,
            weight_kg: profileData.weight_kg,
            avatar_url: profileData.avatar_url,
            updated_at: new Date().toISOString()
        };

        // Ensure email is present
        if (!upsertData.email) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email) {
                upsertData.email = user.email;
            }
        }

        // CRITICAL: Check if a user with this email already exists to determine the correct ID
        // This prevents "duplicate key value" errors if we try to insert with a new ID when the email exists
        if (upsertData.email) {
            const { data: existingUser } = await supabase
                .from('b_users')
                .select('id')
                .eq('email', upsertData.email)
                .maybeSingle();

            if (existingUser) {
                targetId = existingUser.id; // Use the EXISTING database ID, not the Auth ID if they differ
            }
        }

        upsertData.id = targetId;

        // Perform UPSERT (Insert or Update)
        const { data, error } = await supabase
            .from('b_users')
            .upsert(upsertData)
            .select()
            .single();

        if (error) {
            console.error('Upsert failed:', error);
            throw error;
        }

        // SYNC LOCAL STORAGE: Update the stored user if it matches
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const currentUser = JSON.parse(stored);
            if (currentUser.id === targetId) {
                const merged = { ...currentUser, ...data };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                // Notify session listeners manually
                if (supabase.auth.onAuthStateChangeCallback) {
                    supabase.auth.onAuthStateChangeCallback('USER_UPDATED', createMockSession(merged));
                }
            }
        }

        return data;
    },

    // User Goals
    async getUserGoals(userId) {
        const { data, error } = await supabase
            .from('b_user_goals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createUserGoal(userId, goalData) {
        const { data, error } = await supabase
            .from('b_user_goals')
            .insert({
                user_id: userId,
                title: goalData.title,
                description: goalData.description,
                deadline: goalData.deadline,
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateUserGoal(goalId, goalData) {
        const { data, error } = await supabase
            .from('b_user_goals')
            .update({
                title: goalData.title,
                description: goalData.description,
                deadline: goalData.deadline,
                status: goalData.status
            })
            .eq('id', goalId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteUserGoal(goalId) {
        const { error } = await supabase
            .from('b_user_goals')
            .delete()
            .eq('id', goalId);

        if (error) throw error;
        return true;
    }
}

