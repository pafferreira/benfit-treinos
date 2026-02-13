import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ SUPABASE ENV VARS MISSING! Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.')
}

// Create Supabase client — always initialize to avoid null reference crashes
// If env vars are missing, API calls will fail gracefully instead of crashing React
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        db: { schema: 'public' },
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        }
    }
)

// Custom Auth Implementation REMOVED.
// We are now using native Supabase Auth.

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

        // Check authenticated user's role: allow admins and personals to create exercises
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const { data: currentProfile, error: profileErr } = await supabase
            .from('b_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileErr) {
            console.error('Error fetching current profile role:', profileErr);
            throw profileErr;
        }

        const allowedRoles = ['admin', 'personal'];
        if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
            throw new Error('Sem permissão para criar exercício. Requer papel admin ou personal.');
        }

        const { data, error } = await supabase
            .from('b_exercises')
            .insert({
                exercise_key,
                name: exerciseData.name,
                muscle_group: exerciseData.muscle_group,
                equipment: exerciseData.equipment,
                image_url: exerciseData.image_url || null,
                video_url: exerciseData.video_url || '',
                instructions: exerciseData.instructions || [],
                tags: exerciseData.tags || []
            })
            .select()
            .maybeSingle()

        if (error) throw error
        if (!data) {
            throw new Error('Falha ao criar exercício: Sem permissão.')
        }
        return data
    },

    async updateExercise(id, exerciseData) {
        const { data, error } = await supabase
            .from('b_exercises')
            .update({
                name: exerciseData.name,
                muscle_group: exerciseData.muscle_group,
                equipment: exerciseData.equipment,
                image_url: exerciseData.image_url || null,
                video_url: exerciseData.video_url || '',
                instructions: exerciseData.instructions || [],
                tags: exerciseData.tags || []
            })
            .eq('id', id)
            .select()
            .maybeSingle()

        if (error) throw error
        if (!data) {
            throw new Error('Falha ao atualizar exercício: Sem permissão. Verifique se seu usuário é admin.')
        }
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
            // Convert empty strings to NULL for optional fields to avoid DB type errors
            phone: profileData.phone || null,
            birth_date: profileData.birth_date || null,
            gender: profileData.gender || null,
            height_cm: profileData.height_cm ? parseInt(profileData.height_cm) : null,
            weight_kg: profileData.weight_kg ? parseFloat(profileData.weight_kg) : null,
            avatar_url: profileData.avatar_url || null,
            updated_at: new Date().toISOString()
        };

        // Ensure email is present from Auth if missing in profileData
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado.");

        // STRICT SECURITY: Always use the Authenticated User's ID.
        // The database trigger handles syncing b_users ID with Auth ID.
        // We must NOT lookup by email to "find" an ID, as that causes RLS mismatches.
        targetId = user.id;

        if (!upsertData.email && user.email) {
            upsertData.email = user.email;
        }

        upsertData.id = targetId;

        // If role change is requested, only allow when authenticated user is admin
        try {
            if (profileData.role) {
                // Fetch current authenticated user's role from b_users
                const { data: currentProfile, error: profileErr } = await supabase
                    .from('b_users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!profileErr && currentProfile && currentProfile.role === 'admin') {
                    upsertData.role = profileData.role;
                } else {
                    // Do not allow non-admins to set role via this method
                    console.warn('Role change ignored: authenticated user is not admin.');
                }
            }

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

            return data;
        } catch (err) {
            console.error('Error in updateUserProfile:', err);
            throw err;
        }

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
        // Validate required fields
        if (!userId || !goalData.title) {
            console.error('Missing required fields for creating goal:', { userId, goalData });
            throw new Error('Título da meta é obrigatório.');
        }

        const { data, error } = await supabase
            .from('b_user_goals')
            .insert({
                user_id: userId,
                title: goalData.title,
                description: goalData.description || '', // Default to empty string if undefined
                deadline: goalData.deadline || null,    // Default to NULL if undefined or empty
                status: 'active'
            })
            .select()
            .single();

        if (error) {
            console.error('Error in createUserGoal:', error);
            throw error;
        }
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
    },

    // Avatars
    async getAllAvatars() {
        const { data, error } = await supabase
            .from('b_avatars')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching avatars from DB, falling back to local list:', error);
            // Fallback list
            return [
                // User Avatars (category='Avatar')
                { id: '1', public_url: '/Elifit_Coach.png', name: 'Coach 1', category: 'Avatar' },
                { id: '2', public_url: '/avatar-female.png', name: 'Female 1', category: 'Avatar' },
                { id: '3', public_url: '/avatar-male.png', name: 'Male 1', category: 'Avatar' },
                { id: '4', public_url: '/benfit_fem.png', name: 'Female 2', category: 'Avatar' },
                { id: '5', public_url: '/benfit_mas.png', name: 'Male 2', category: 'Avatar' },
                // Exercise Images (category='exercicio')
                { id: 'ex1', public_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', name: 'Supino', category: 'exercicio' },
                { id: 'ex2', public_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', name: 'Agachamento', category: 'exercicio' },
                { id: 'ex3', public_url: 'https://images.unsplash.com/photo-1538805060518-7beebe9d1798?w=400', name: 'Cardio', category: 'exercicio' },
                { id: 'ex4', public_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400', name: 'Halteres', category: 'exercicio' }
            ];
        }

        // Check if data is empty, if so, return fallback to allow immediate usage
        if (!data || data.length === 0) {
            return [
                // User Avatars
                { id: '1', public_url: '/Elifit_Coach.png', name: 'Coach 1', category: 'Avatar' },
                { id: '2', public_url: '/avatar-female.png', name: 'Female 1', category: 'Avatar' },
                { id: '3', public_url: '/avatar-male.png', name: 'Male 1', category: 'Avatar' },
                { id: '4', public_url: '/benfit_fem.png', name: 'Female 2', category: 'Avatar' },
                { id: '5', public_url: '/benfit_mas.png', name: 'Male 2', category: 'Avatar' },
                // Exercise Images
                { id: 'ex1', public_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', name: 'Supino', category: 'exercicio' },
                { id: 'ex2', public_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', name: 'Agachamento', category: 'exercicio' },
                { id: 'ex3', public_url: 'https://images.unsplash.com/photo-1538805060518-7beebe9d1798?w=400', name: 'Cardio', category: 'exercicio' },
                { id: 'ex4', public_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400', name: 'Halteres', category: 'exercicio' }
            ];
        }

        return data;
    },

    async createAvatar(avatarData) {
        const { data, error } = await supabase
            .from('b_avatars')
            .insert({
                storage_path: avatarData.storage_path || '',
                public_url: avatarData.public_url,
                name: avatarData.name,
                category: avatarData.category || '3D',
                tags: avatarData.tags || [],
                gender: avatarData.gender || null,
                is_active: avatarData.is_active !== undefined ? avatarData.is_active : true
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateAvatar(id, avatarData) {
        // Build update payload with only defined fields to avoid nullifying existing data
        const updatePayload = {};
        if (avatarData.name !== undefined) updatePayload.name = avatarData.name;
        if (avatarData.category !== undefined) updatePayload.category = avatarData.category;
        if (avatarData.tags !== undefined) updatePayload.tags = avatarData.tags;
        if (avatarData.gender !== undefined) updatePayload.gender = avatarData.gender;
        if (avatarData.is_active !== undefined) updatePayload.is_active = avatarData.is_active;
        if (avatarData.public_url !== undefined) updatePayload.public_url = avatarData.public_url;
        if (avatarData.storage_path !== undefined) updatePayload.storage_path = avatarData.storage_path;

        console.log('updateAvatar payload:', { id, updatePayload }); // Debug

        const { data, error } = await supabase
            .from('b_avatars')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('updateAvatar error:', error);
            throw error;
        }
        return data;
    },

    async deleteAvatar(id) {
        const { error } = await supabase
            .from('b_avatars')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // ==========================================
    // Planos do Usuário (Daily Workout Logs)
    // ==========================================

    // Atribuir um plano ao usuário (sem data de início)
    async assignPlanToUser(userId, workoutId) {
        // Verificar se o plano já está atribuído ao usuário
        const { data: existing } = await supabase
            .from('b_daily_workout_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('workout_id', workoutId)
            .in('status', ['atribuido', 'em_andamento'])
            .maybeSingle();

        if (existing) {
            throw new Error('Este plano já está atribuído a você.');
        }

        const { data, error } = await supabase
            .from('b_daily_workout_logs')
            .insert({
                user_id: userId,
                workout_id: workoutId,
                started_at: null,
                status: 'atribuido'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Buscar planos ativos do usuário (com dados do workout)
    async getUserActivePlans(userId) {
        const { data, error } = await supabase
            .from('b_daily_workout_logs')
            .select(`
                *,
                b_workouts (
                    id, title, description, difficulty, estimated_duration, days_per_week, cover_image, is_public
                )
            `)
            .eq('user_id', userId)
            .neq('status', 'concluido')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Iniciar sessão de treino (primeiro exercício concluído)
    async startWorkoutSession(userId, workoutId, workoutDayId) {
        const now = new Date().toISOString();

        // 1. Criar sessão em b_workout_sessions
        const { data: session, error: sessionError } = await supabase
            .from('b_workout_sessions')
            .insert({
                user_id: userId,
                workout_id: workoutId,
                workout_day_id: workoutDayId,
                started_at: now
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // 2. Atualizar b_daily_workout_logs com started_at e status
        const { error: logError } = await supabase
            .from('b_daily_workout_logs')
            .update({
                started_at: now,
                workout_day_id: workoutDayId,
                status: 'em_andamento'
            })
            .eq('user_id', userId)
            .eq('workout_id', workoutId)
            .eq('status', 'atribuido');

        if (logError) {
            console.error('Erro ao atualizar daily_workout_log:', logError);
        }

        return session;
    },

    // Registrar exercício concluído em b_session_logs
    async logExerciseComplete(sessionId, userId, exerciseId) {
        const { data, error } = await supabase
            .from('b_session_logs')
            .insert({
                session_id: sessionId,
                user_id: userId,
                exercise_id: exerciseId,
                set_number: 1,
                reps_completed: 1,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Remover registro de exercício concluído
    async removeExerciseLog(sessionId, userId, exerciseId) {
        const { error } = await supabase
            .from('b_session_logs')
            .delete()
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .eq('exercise_id', exerciseId);

        if (error) throw error;
        return true;
    },

    // ==========================================
    // Histórico de Atividades
    // ==========================================

    // Buscar histórico completo de sessões de treino do usuário
    async getUserActivityHistory(userId) {
        // Buscar sessões de b_workout_sessions com dados do workout e dia
        const { data: sessions, error: sessionsError } = await supabase
            .from('b_workout_sessions')
            .select(`
                id, user_id, workout_id, workout_day_id,
                started_at, ended_at, calories_burned, feeling,
                b_workouts (id, title, difficulty, estimated_duration, cover_image),
                b_workout_days (id, day_name, day_number)
            `)
            .eq('user_id', userId)
            .order('started_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        // Buscar planos atribuídos de b_daily_workout_logs (status atribuido/em_andamento/concluido)
        const { data: plans, error: plansError } = await supabase
            .from('b_daily_workout_logs')
            .select(`
                id, user_id, workout_id, workout_day_id,
                started_at, ended_at, calories_burned, feeling, notes, status, created_at,
                b_workouts (id, title, difficulty, estimated_duration, cover_image)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (plansError) throw plansError;

        return { sessions: sessions || [], plans: plans || [] };
    },

    // Buscar exercícios concluídos em uma sessão específica
    async getSessionExercises(sessionId) {
        const { data, error } = await supabase
            .from('b_session_logs')
            .select(`
                id, session_id, exercise_id, set_number, weight_kg, reps_completed, created_at,
                b_exercises (id, name, muscle_group, equipment, image_url)
            `)
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // ==========================================
    // Dashboard Stats
    // ==========================================

    async getDashboardStats(userId) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Sessões da semana
        const { data: weeklySessions, error: sessionsErr } = await supabase
            .from('b_workout_sessions')
            .select('id, started_at, ended_at, calories_burned')
            .eq('user_id', userId)
            .gte('started_at', weekAgo.toISOString())
            .order('started_at', { ascending: false });

        if (sessionsErr) throw sessionsErr;

        const completedThisWeek = (weeklySessions || []).filter(s => s.ended_at).length;
        const caloriesThisWeek = (weeklySessions || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0);
        const lastSession = (weeklySessions || [])[0] || null;

        return {
            sessionsThisWeek: (weeklySessions || []).length,
            completedThisWeek,
            caloriesThisWeek,
            lastSession
        };
    }
}

