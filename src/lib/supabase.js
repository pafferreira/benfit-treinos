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

const normalizeWorkoutExercisePayload = (exercise, index, workoutDayId) => {
    const parsedSets = parseInt(exercise.sets, 10)
    const parsedRest = exercise.rest_seconds === '' || exercise.rest_seconds === null || exercise.rest_seconds === undefined
        ? null
        : parseInt(exercise.rest_seconds, 10)

    return {
        workout_day_id: workoutDayId,
        exercise_id: exercise.exercise_id,
        order_index: index + 1,
        sets: Number.isNaN(parsedSets) ? 3 : parsedSets,
        reps: exercise.reps || '10',
        rest_seconds: Number.isNaN(parsedRest) ? null : parsedRest,
        notes: exercise.notes || ''
    }
}

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
        const { data: { user } } = await supabase.auth.getUser();

        // Check for impersonation (admin testing as another role)
        // localStorage is only available in browser environments
        const impersonatedRole = typeof localStorage !== 'undefined'
            ? localStorage.getItem('impersonated_role')
            : null;

        let role = 'user';
        if (impersonatedRole) {
            // Use the impersonated role directly — skip DB lookup
            role = impersonatedRole;
        } else if (user) {
            const { data: profile } = await supabase
                .from('b_users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            role = profile?.role || 'user';
        }

        let query = supabase
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
            .order('created_at', { ascending: false })

        if (role === 'admin') {
            // Admin sees everything — no filter
        } else if (role === 'personal' && user) {
            // Personal sees public workouts + their own private ones
            query = query.or(`is_public.eq.true,creator_id.eq.${user.id}`)
        } else {
            // Regular user sees only public workouts
            query = query.eq('is_public', true)
        }

        const { data, error } = await query

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
                    const exercisesToInsert = day.exercises.map((ex, index) =>
                        normalizeWorkoutExercisePayload(ex, index, dayData.id)
                    );

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
        if (!user) throw new Error('Usuário não autenticado');

        // 1. Update Workout Details
        // Build an update payload and avoid touching creator_id to prevent accidental ownership changes
        const updatePayload = {
            title: workoutData.title,
            description: workoutData.description,
            difficulty: workoutData.difficulty,
            estimated_duration: workoutData.estimated_duration ? parseInt(workoutData.estimated_duration, 10) : null,
            days_per_week: workoutData.days_per_week ? parseInt(workoutData.days_per_week, 10) : null,
            is_public: workoutData.is_public,
            updated_at: new Date().toISOString()
        };

        const { data: workoutResult, error: workoutError } = await supabase
            .from('b_workouts')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .maybeSingle();

        const workout = workoutResult || null;

        if (workoutError) {
            console.error('updateWorkout - error updating b_workouts:', workoutError);
            throw workoutError;
        }
        if (!workout) {
            throw new Error('Sem permissão para atualizar este treino. Verifique se o plano pertence ao usuário logado e se as políticas RLS de treino estão aplicadas.');
        }

        // 2. Update Schedule (Smart Upsert — preserves existing day IDs to avoid FK violations)
        // b_workout_sessions references b_workout_days, so we CANNOT delete days that have sessions.
        // Strategy:
        //   - First set all existing day_numbers to negative temps to avoid UNIQUE constraint conflicts during reorder
        //   - Days with an existing `id` → UPDATE in place
        //   - Days without an `id` → INSERT new
        //   - Days that were removed → try DELETE; if FK blocks it, skip gracefully
        if (workoutData.schedule) {
            try {
                // Fetch current days from DB
                const { data: existingDays } = await supabase
                    .from('b_workout_days')
                    .select('id')
                    .eq('workout_id', id);

                const existingDayIds = new Set((existingDays || []).map(d => d.id));
                const keptDayIds = new Set();

                // Step A: Set all existing day_numbers to negative temps to free up the unique slots
                // This prevents duplicate key errors when reordering days
                if (existingDays && existingDays.length > 0) {
                    for (let i = 0; i < existingDays.length; i++) {
                        await supabase
                            .from('b_workout_days')
                            .update({ day_number: -(i + 1) })
                            .eq('id', existingDays[i].id);
                    }
                }

                // Step B: Upsert each day with its final day_number
                for (let i = 0; i < workoutData.schedule.length; i++) {
                    const day = workoutData.schedule[i];
                    let dayId = day.id || null;

                    if (dayId && existingDayIds.has(dayId)) {
                        // UPDATE existing day with final values
                        const { error: updateDayError } = await supabase
                            .from('b_workout_days')
                            .update({ day_name: day.day_name, day_number: i + 1 })
                            .eq('id', dayId);

                        if (updateDayError) {
                            console.error('updateWorkout - Error updating workout day:', updateDayError);
                            throw updateDayError;
                        }
                        keptDayIds.add(dayId);
                    } else {
                        // INSERT new day
                        const { data: newDayResult, error: insertDayError } = await supabase
                            .from('b_workout_days')
                            .insert({ workout_id: id, day_number: i + 1, day_name: day.day_name })
                            .select()
                            .maybeSingle();

                        if (insertDayError) {
                            console.error('updateWorkout - Error inserting workout day:', insertDayError);
                            throw insertDayError;
                        }
                        if (!newDayResult) {
                            throw new Error('Falha ao criar dia do treino: Sem permissão (RLS) ou erro no banco.');
                        }
                        dayId = newDayResult.id;
                        keptDayIds.add(dayId);
                    }

                    // Recreate exercises for this day (safe: sessions reference days, not exercises)
                    await supabase.from('b_workout_exercises').delete().eq('workout_day_id', dayId);

                    if (day.exercises && day.exercises.length > 0) {
                        const exercisesToInsert = day.exercises.map((ex, index) =>
                            normalizeWorkoutExercisePayload(ex, index, dayId)
                        );
                        const { error: exercisesError } = await supabase
                            .from('b_workout_exercises')
                            .insert(exercisesToInsert);

                        if (exercisesError) {
                            console.error('updateWorkout - Error creating workout exercises:', exercisesError);
                            throw exercisesError;
                        }
                    }
                }

                // Step C: Try to delete removed days — skip gracefully if FK blocks it
                for (const oldId of existingDayIds) {
                    if (!keptDayIds.has(oldId)) {
                        const { error: delError } = await supabase
                            .from('b_workout_days')
                            .delete()
                            .eq('id', oldId);

                        if (delError) {
                            // FK violation: day has sessions — keep it
                            if (delError.code === '23503') {
                                console.warn(`updateWorkout - Day ${oldId} has sessions, cannot delete. Keeping it.`);
                            } else {
                                console.error('updateWorkout - Error deleting removed day:', delError);
                                throw delError;
                            }
                        }
                    }
                }
            } catch (scheduleErr) {
                console.error('updateWorkout - schedule update failed:', scheduleErr);
                if (scheduleErr?.code === '42501' || String(scheduleErr?.message || '').toLowerCase().includes('row-level security')) {
                    throw new Error('Falha ao atualizar estrutura do treino (dias/exercícios) por permissão RLS. Aplique as políticas de b_workout_days e b_workout_exercises para permitir edição.');
                }
                throw scheduleErr;
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

    async finalizeWorkoutSession({
        sessionId,
        userId,
        workoutId,
        workoutDayId,
        caloriesBurned,
        feeling,
        isFullyCompleted = true
    }) {
        if (!sessionId) {
            throw new Error('Sessão inválida para finalização.');
        }

        const session = await this.endWorkoutSession(sessionId, caloriesBurned, feeling);

        if (!userId || !workoutId || !workoutDayId) {
            return session;
        }

        const now = new Date().toISOString();
        const { error: logError } = await supabase
            .from('b_daily_workout_logs')
            .update({
                ended_at: now,
                calories_burned: caloriesBurned,
                feeling,
                status: isFullyCompleted ? 'concluido' : 'em_andamento'
            })
            .eq('user_id', userId)
            .eq('workout_id', workoutId)
            .eq('workout_day_id', workoutDayId)
            .in('status', ['atribuido', 'em_andamento']);

        if (logError) {
            // Não bloquear a finalização da sessão caso o log diário falhe por estrutura/política.
            console.error('Erro ao atualizar daily_workout_log na finalização:', logError);
        }

        return session;
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

    // ── Conversations ──────────────────────────────────────────────
    async getConversations(userId) {
        const { data, error } = await supabase
            .from('b_ai_conversations')
            .select('*')
            .eq('user_id', userId)
            .order('last_message_at', { ascending: false })

        if (error) throw error
        return data
    },

    async createConversation(userId, title = 'Nova conversa') {
        const { data, error } = await supabase
            .from('b_ai_conversations')
            .insert({ user_id: userId, title })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateConversationTitle(conversationId, title) {
        const { error } = await supabase
            .from('b_ai_conversations')
            .update({ title })
            .eq('id', conversationId)

        if (error) throw error
    },

    async touchConversation(conversationId) {
        const { error } = await supabase
            .from('b_ai_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId)

        if (error) throw error
    },

    async deleteConversation(conversationId) {
        const { error } = await supabase
            .from('b_ai_conversations')
            .delete()
            .eq('id', conversationId)

        if (error) throw error
    },

    // ── AI Chat History ────────────────────────────────────────────
    async saveChatMessage(userId, role, content, conversationId = null) {
        const { data, error } = await supabase
            .from('b_ai_chat_history')
            .insert({
                user_id: userId,
                role: role,
                content: content,
                ...(conversationId ? { conversation_id: conversationId } : {})
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

    async getConversationMessages(conversationId) {
        const { data, error } = await supabase
            .from('b_ai_chat_history')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data
    },

    // ── Shared Knowledge ───────────────────────────────────────────
    async listSharedKnowledge(filters = {}) {
        let query = supabase
            .from('b_shared_knowledge')
            .select('id, knowledge_type, content, metadata, created_at')
            .order('created_at', { ascending: false })

        if (filters.type) query = query.eq('knowledge_type', filters.type)
        if (filters.search) query = query.ilike('content', `%${filters.search}%`)

        const { data, error } = await query.limit(100)
        if (error) throw error
        return data
    },

    async addSharedKnowledge(entry) {
        const { data, error } = await supabase
            .from('b_shared_knowledge')
            .insert(entry)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateSharedKnowledge(id, updates) {
        const { data, error } = await supabase
            .from('b_shared_knowledge')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteSharedKnowledge(id) {
        const { error } = await supabase
            .from('b_shared_knowledge')
            .delete()
            .eq('id', id)

        if (error) throw error
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
            const { data: profileByEmail } = await supabase
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

    // Update another user's role - only allowed if the authenticated user is admin
    async updateUserRoleAsAdmin(targetUserId, newRole) {
        // Prefer calling server-side RPC which enforces admin checks and can bypass RLS when defined as SECURITY DEFINER
        try {
            const { data, error } = await supabase.rpc('admin_update_user_role', { target_user_id: targetUserId, new_role: newRole });
            if (error) throw error;
            return data;
        } catch (rpcErr) {
            // RPC might not be deployed in some environments; fall back to client-side update with admin verification
            console.warn('RPC admin_update_user_role failed, falling back to client-side update:', rpcErr.message || rpcErr);

            const { data: { user }, error: userErr } = await supabase.auth.getUser();
            if (userErr) throw userErr;
            if (!user) throw new Error('Usuário não autenticado.');

            // Verify authenticated user's role in b_users
            const { data: currentProfile, error: profileErr } = await supabase
                .from('b_users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileErr) throw profileErr;
            if (!currentProfile || currentProfile.role !== 'admin') {
                throw new Error('Permissão negada: apenas administradores podem alterar papéis de outros usuários.');
            }

            // Perform the update (may be blocked by RLS depending on policies)
            const { data, error } = await supabase
                .from('b_users')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('id', targetUserId)
                .select()
                .single();

            if (error) throw error;
            return data;
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
                { id: '1', public_url: '/avatar_skeleton.png', name: 'Coach 1', category: 'Avatar' },
                { id: '2', public_url: '/avatar-female.png', name: 'Female 1', category: 'Avatar' },
                { id: '3', public_url: '/avatar-male.png', name: 'Male 1', category: 'Avatar' },
                { id: '4', public_url: '/benfit_fem.png', name: 'Female 2', category: 'Avatar' },
                { id: '5', public_url: '/benfit_mas.png', name: 'Male 2', category: 'Avatar' },
                // Exercise Images (category='exercicio')
                { id: 'ex1', public_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', name: 'Supino', category: 'exercicio' },
                { id: 'ex2', public_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', name: 'Agachamento', category: 'exercicio' },
                { id: 'ex3', public_url: 'https://images.unsplash.com/photo-1538805060518-7beebe9d1798?w=400', name: 'Cardio', category: 'exercicio' },
                { id: 'ex4', public_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400', name: 'Halteres', category: 'exercicio' },
                // Generic 3D Images
                { id: 'gen1', public_url: '/exercicios/exerc_generico_1.png', name: 'Barra', category: 'exercicio' },
                { id: 'gen2', public_url: '/exercicios/exerc_generico_2.png', name: 'Halteres 3D', category: 'exercicio' },
                { id: 'gen3', public_url: '/exercicios/exerc_generico_3.png', name: 'Kettlebell', category: 'exercicio' }
            ];
        }

        // Check if data is empty, if so, return fallback to allow immediate usage
        if (!data || data.length === 0) {
            return [
                // User Avatars
                { id: '1', public_url: '/avatar_skeleton.png', name: 'Coach 1', category: 'Avatar' },
                { id: '2', public_url: '/avatar-female.png', name: 'Female 1', category: 'Avatar' },
                { id: '3', public_url: '/avatar-male.png', name: 'Male 1', category: 'Avatar' },
                { id: '4', public_url: '/benfit_fem.png', name: 'Female 2', category: 'Avatar' },
                { id: '5', public_url: '/benfit_mas.png', name: 'Male 2', category: 'Avatar' },
                // Exercise Images
                { id: 'ex1', public_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', name: 'Supino', category: 'exercicio' },
                { id: 'ex2', public_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', name: 'Agachamento', category: 'exercicio' },
                { id: 'ex3', public_url: 'https://images.unsplash.com/photo-1538805060518-7beebe9d1798?w=400', name: 'Cardio', category: 'exercicio' },
                { id: 'ex4', public_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400', name: 'Halteres', category: 'exercicio' },
                // Generic 3D Images
                { id: 'gen1', public_url: '/exercicios/exerc_generico_1.png', name: 'Barra', category: 'exercicio' },
                { id: 'gen2', public_url: '/exercicios/exerc_generico_2.png', name: 'Halteres 3D', category: 'exercicio' },
                { id: 'gen3', public_url: '/exercicios/exerc_generico_3.png', name: 'Kettlebell', category: 'exercicio' }
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

    // Remover plano do usuário — somente se ainda estiver no status 'atribuido'
    async unassignPlanFromUser(userId, workoutId) {
        // Buscar entry que possa ser removida
        const { data: existing, error: fetchErr } = await supabase
            .from('b_daily_workout_logs')
            .select('id, status')
            .eq('user_id', userId)
            .eq('workout_id', workoutId)
            .in('status', ['atribuido'])
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!existing) {
            throw new Error('Plano não encontrado ou não pode ser removido (já iniciado ou inexistente).');
        }

        const { error: delErr } = await supabase
            .from('b_daily_workout_logs')
            .delete()
            .eq('id', existing.id);

        if (delErr) throw delErr;
        return true;
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
                b_workout_days (id, day_name, day_number),
                b_session_logs (
                    id, exercise_id, set_number, weight_kg, reps_completed, created_at,
                    b_exercises (id, name, muscle_group, equipment, image_url)
                )
            `)
            .eq('user_id', userId)
            .order('started_at', { ascending: false });

        if (sessionsError) throw sessionsError;
        // Normalize and attach a date-only key (workout_date) to each session to centralize date handling
        const normalizeToDateKey = (iso) => {
            if (!iso) return null;
            const d = new Date(iso);
            d.setHours(0, 0, 0, 0);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Debug: log raw sessions retrieved from DB (ids, started_at, ended_at, nested logs count)
        try {
            console.debug('[supabaseHelpers] getUserActivityHistory - raw sessions:', (sessions || []).map(s => ({
                id: s.id,
                started_at: s.started_at,
                ended_at: s.ended_at,
                workout_day_id: s.workout_day_id,
                logs_count: (s.b_session_logs || []).length
            })));
        } catch { /* debug logging only */ }

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

        // Attach workout_date to sessions using the most relevant timestamp:
        // prefer latest nested log created_at, then ended_at, then started_at, then created_at
        const normSessions = (sessions || []).map(s => {
            let latestLogDate = null;
            if (s.b_session_logs && Array.isArray(s.b_session_logs) && s.b_session_logs.length > 0) {
                latestLogDate = s.b_session_logs.reduce((acc, l) => {
                    const t = l && l.created_at ? new Date(l.created_at) : null;
                    if (!t) return acc;
                    if (!acc) return t;
                    return t > acc ? t : acc;
                }, null);
            }

            const refIso = (latestLogDate ? latestLogDate.toISOString() : null) || s.ended_at || s.started_at || s.created_at || null;
            const sessionWithDate = { ...s, workout_date: normalizeToDateKey(refIso) };

            // Also attach workout_date to nested logs if present
            if (sessionWithDate.b_session_logs && Array.isArray(sessionWithDate.b_session_logs)) {
                sessionWithDate.b_session_logs = sessionWithDate.b_session_logs.map(l => ({ ...l, workout_date: normalizeToDateKey(l.created_at) }));
            }

            return sessionWithDate;
        });

        return { sessions: normSessions, plans: plans || [] };
    },

    // Retorna a maior data (mais recente) em que o usuário concluiu ("Feito") um dia do treino
    // Resultado: objeto { [workout_day_id]: 'YYYY-MM-DD' }
    async getLatestCompletedDatePerDay(userId, workoutId, dayIds = []) {
        if (!userId || !workoutId || !Array.isArray(dayIds) || dayIds.length === 0) return {};

        // 1) Obter quantidade de exercícios requeridos por dia
        const exercisesByDay = {};
        const { data: workoutExercises, error: exercisesError } = await supabase
            .from('b_workout_exercises')
            .select('workout_day_id')
            .in('workout_day_id', dayIds);

        if (exercisesError) {
            console.error('getLatestCompletedDatePerDay - exercises fetch error:', exercisesError);
            throw exercisesError;
        }
        (workoutExercises || []).forEach(item => {
            exercisesByDay[item.workout_day_id] = (exercisesByDay[item.workout_day_id] || 0) + 1;
        });

        // 2) Buscar sessões finalizadas para esses dias com logs embutidos
        const { data: sessions, error: sessionsError } = await supabase
            .from('b_workout_sessions')
            .select('id, workout_day_id, ended_at, started_at, b_session_logs (exercise_id, created_at)')
            .eq('user_id', userId)
            .eq('workout_id', workoutId)
            .in('workout_day_id', dayIds)
            .not('ended_at', 'is', null)
            .order('ended_at', { ascending: false });

        if (sessionsError) {
            console.error('getLatestCompletedDatePerDay - sessions fetch error:', sessionsError);
            throw sessionsError;
        }

        const result = {};

        // 3) Para cada sessão (já ordenada por ended_at desc) ver se logs distintos >= required exercises
        for (const s of (sessions || [])) {
            const dayId = s.workout_day_id;
            if (!dayId) continue;

            const required = exercisesByDay[dayId] || 0;
            const logs = s.b_session_logs || [];
            const distinct = new Set(logs.map(l => l.exercise_id).filter(Boolean));
            const loggedCount = distinct.size;

            const completedByExercises = required > 0 ? (loggedCount >= required) : true; // if no definition, consider completed if session ended
            if (s.ended_at && completedByExercises) {
                // Use ended_at as completion moment
                const d = new Date(s.ended_at);
                d.setHours(0,0,0,0);
                const y = d.getFullYear();
                const m = String(d.getMonth()+1).padStart(2,'0');
                const day = String(d.getDate()).padStart(2,'0');
                const key = `${y}-${m}-${day}`;
                if (!result[dayId]) {
                    result[dayId] = key; // first (most recent) encountered due to ordering
                }
            }
        }

        return result;
    },

    // Retorna datas e mapas por exercício e por dia dos últimos logs do usuário
    // Resultado: { completedDates: [], incompleteDates: [], perExerciseLatest: { [workout_day_id]: { [exercise_id]: 'YYYY-MM-DD' } }, perDayLatest: { [workout_day_id]: 'YYYY-MM-DD' } }
    async getUserExerciseDoneDates(userId, days = 45) {
        if (!userId) return { completedDates: [], incompleteDates: [], perExerciseLatest: {}, perDayLatest: {} };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch session logs with nested session info
        const { data: logs, error: logsError } = await supabase
            .from('b_session_logs')
            .select('id, exercise_id, created_at, session_id, b_workout_sessions ( workout_id, workout_day_id )')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });

        if (logsError) {
            console.error('getUserExerciseDoneDates - logs fetch error:', logsError);
            throw logsError;
        }

        // Aggregate per workout_day_id and per exercise the latest date
        const perExerciseLatest = {}; // workout_day_id -> exercise_id -> dateKey
        const perDayLastDone = {}; // workout_day_id -> dateKey (último exercício "Feito", sem exigir dia completo)
        const perDayExerciseSetsByDate = {}; // workout_day_id -> dateKey -> Set(exercise_id)
        const dateKeyOf = (iso) => {
            const d = new Date(iso);
            d.setHours(0,0,0,0);
            const y = d.getFullYear();
            const m = String(d.getMonth()+1).padStart(2,'0');
            const day = String(d.getDate()).padStart(2,'0');
            return `${y}-${m}-${day}`;
        };

        const involvedDayIds = new Set();

        (logs || []).forEach(l => {
            const dayId = l.b_workout_sessions?.workout_day_id || null;
            const exId = l.exercise_id;
            const key = l.created_at ? dateKeyOf(l.created_at) : null;
            if (!dayId || !exId || !key) return;
            involvedDayIds.add(dayId);

            perExerciseLatest[dayId] = perExerciseLatest[dayId] || {};
            // only set if not present (we iterated descending), so first is latest
            if (!perExerciseLatest[dayId][exId]) perExerciseLatest[dayId][exId] = key;

            // primeiro key por dia = data do último exercício feito (logs em ordem desc)
            if (!perDayLastDone[dayId]) perDayLastDone[dayId] = key;

            perDayExerciseSetsByDate[dayId] = perDayExerciseSetsByDate[dayId] || {};
            perDayExerciseSetsByDate[dayId][key] = perDayExerciseSetsByDate[dayId][key] || new Set();
            perDayExerciseSetsByDate[dayId][key].add(exId);
        });

        // Fetch required exercises per day
        const exercisesByDay = {};
        const dayIdsArr = Array.from(involvedDayIds);
        if (dayIdsArr.length > 0) {
            const { data: workoutExercises, error: weError } = await supabase
                .from('b_workout_exercises')
                .select('workout_day_id')
                .in('workout_day_id', dayIdsArr);
            if (weError) {
                console.error('getUserExerciseDoneDates - workout_exercises fetch error:', weError);
                throw weError;
            }
            (workoutExercises || []).forEach(w => {
                exercisesByDay[w.workout_day_id] = (exercisesByDay[w.workout_day_id] || 0) + 1;
            });
        }

        const completedSet = new Set();
        const incompleteSet = new Set();
        const perDayLatest = {};

        // Evaluate each day/date set
        Object.keys(perDayExerciseSetsByDate).forEach(dayId => {
            const dateMap = perDayExerciseSetsByDate[dayId];
            Object.keys(dateMap).forEach(dateKey => {
                const loggedCount = dateMap[dateKey].size;
                const required = exercisesByDay[dayId] || 0;
                const completedByExercises = required > 0 ? (loggedCount >= required) : true;
                if (completedByExercises) {
                    completedSet.add(dateKey);
                    // set perDayLatest if not set (we want most recent -> logs were ordered desc)
                    if (!perDayLatest[dayId]) perDayLatest[dayId] = dateKey;
                } else {
                    if (!completedSet.has(dateKey)) incompleteSet.add(dateKey);
                }
            });
        });

        return {
            completedDates: Array.from(completedSet),
            incompleteDates: Array.from(incompleteSet),
            perExerciseLatest,
            perDayLatest,
            perDayLastDone
        };
    },

    // Datas para o minicalendário, derivadas da MESMA query usada na tela
    // "Histórico de Atividades" (getUserActivityHistory). Distingue dois estados:
    //   - finalizedDates: datas com uma sessão de treino FINALIZADA (ended_at preenchido)
    //   - doneDates: datas em que houve AO MENOS UM exercício "Feito" mas SEM sessão
    //                finalizada naquele dia (treino em andamento / não finalizado)
    // Resultado: { finalizedDates: [], doneDates: [], completedDates: [], incompleteDates: [], perDayLatest: {} }
    async getExerciseDoneCalendarDates(userId) {
        if (!userId) return { finalizedDates: [], doneDates: [], completedDates: [], incompleteDates: [], perDayLatest: {} };

        const dateKeyOf = (iso) => {
            if (!iso) return null;
            const d = new Date(iso);
            d.setHours(0, 0, 0, 0);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const { sessions } = await this.getUserActivityHistory(userId);
        const finalizedSet = new Set(); // datas com sessão finalizada (ended_at)
        const doneSet = new Set();      // datas com qualquer exercício feito
        const perDayLatest = {};

        (sessions || []).forEach((session) => {
            // Data de finalização da sessão (usa ended_at)
            if (session.ended_at) {
                const fkey = dateKeyOf(session.ended_at);
                if (fkey) finalizedSet.add(fkey);
            }

            (session.b_session_logs || []).forEach((log) => {
                const key = log.workout_date;
                if (!key) return;
                doneSet.add(key);

                const dayId = session.workout_day_id;
                if (dayId && (!perDayLatest[dayId] || key > perDayLatest[dayId])) {
                    perDayLatest[dayId] = key;
                }
            });
        });

        // "apenas feito" = dias com exercício feito mas sem sessão finalizada
        const doneOnlyDates = Array.from(doneSet).filter((k) => !finalizedSet.has(k));
        const finalizedDates = Array.from(finalizedSet);

        return {
            finalizedDates,
            doneDates: doneOnlyDates,
            // compat: completedDates = união (todas as datas com atividade)
            completedDates: Array.from(new Set([...finalizedDates, ...doneOnlyDates])),
            incompleteDates: [],
            perDayLatest
        };
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
            .select('id, started_at, ended_at, calories_burned, feeling')
            .eq('user_id', userId)
            .gte('started_at', weekAgo.toISOString())
            .order('started_at', { ascending: false });

        if (sessionsErr) throw sessionsErr;

        // Última sessão absoluta (ignorando a semana)
        const { data: absoluteLastSession } = await supabase
            .from('b_workout_sessions')
            .select('id, started_at, ended_at, calories_burned, feeling')
            .eq('user_id', userId)
            .not('ended_at', 'is', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        const completedThisWeek = (weeklySessions || []).filter(s => s.ended_at).length;
        const caloriesThisWeek = (weeklySessions || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0);
        const lastSession = absoluteLastSession || null;

        return {
            sessionsThisWeek: (weeklySessions || []).length,
            completedThisWeek,
            caloriesThisWeek,
            lastSession
        };
    },

    async getUserWorkoutCalendarDates(userId, days = 45) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Reuse activity history query to get sessions + nested logs (reduces duplicated queries)
        try {
            const { sessions } = await this.getUserActivityHistory(userId);
            if (!sessions || sessions.length === 0) {
                return { completedDates: [], incompleteDates: [] };
            }

            // Filter sessions within the requested window using workout_date (date-only key)
            const startKey = (() => {
                const d = new Date(startDate);
                d.setHours(0,0,0,0);
                const y = d.getFullYear();
                const m = String(d.getMonth()+1).padStart(2,'0');
                const day = String(d.getDate()).padStart(2,'0');
                return `${y}-${m}-${day}`;
            })();

            const recentSessions = sessions.filter(s => {
                // prefer workout_date normalized by getUserActivityHistory
                const wd = s.workout_date || (s.ended_at || s.started_at ? (() => {
                    const d = new Date(s.ended_at || s.started_at);
                    d.setHours(0,0,0,0);
                    const y = d.getFullYear();
                    const m = String(d.getMonth()+1).padStart(2,'0');
                    const day = String(d.getDate()).padStart(2,'0');
                    return `${y}-${m}-${day}`;
                })() : null);
                if (!wd) return false;
                return wd >= startKey;
            });

            // Debug: log recentSessions count and keys
            try {
                console.debug('[supabaseHelpers] getUserWorkoutCalendarDates - recentSessions:', recentSessions.map(s => ({ id: s.id, workout_day_id: s.workout_day_id, workout_date: s.workout_date })));
            } catch { /* debug logging only */ }

            if (recentSessions.length === 0) return { completedDates: [], incompleteDates: [] };

            // Build workoutDayIds and exercisesByDay (required count per workout_day)
            const workoutDayIds = [...new Set(recentSessions.map(s => s.workout_day_id).filter(Boolean))];
            const exercisesByDay = {};
            if (workoutDayIds.length > 0) {
                const { data: workoutExercises, error: exercisesError } = await supabase
                    .from('b_workout_exercises')
                    .select('workout_day_id')
                    .in('workout_day_id', workoutDayIds);

                if (exercisesError) throw exercisesError;
                (workoutExercises || []).forEach((item) => {
                    exercisesByDay[item.workout_day_id] = (exercisesByDay[item.workout_day_id] || 0) + 1;
                });
            }

            // Use session.workout_date if available (already normalized in getUserActivityHistory)
            const toDateKey = (isoDate, session) => {
                if (session && session.workout_date) return session.workout_date;
                const parsed = new Date(isoDate);
                parsed.setHours(0, 0, 0, 0);
                const year = parsed.getFullYear();
                const month = String(parsed.getMonth() + 1).padStart(2, '0');
                const day = String(parsed.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const completedSet = new Set();
            const incompleteSet = new Set();

            recentSessions.forEach((session) => {
                const refDate = session.ended_at || session.started_at;
                if (!refDate) return;
                const dateKey = toDateKey(refDate, session);
                const requiredExercises = session.workout_day_id ? (exercisesByDay[session.workout_day_id] || 0) : 0;
                const loggedExercises = (session.b_session_logs || []).length || 0;
                const completedByExercises = requiredExercises > 0 ? loggedExercises >= requiredExercises : Boolean(session.ended_at);
                const isCompleted = Boolean(session.ended_at) && completedByExercises;

                if (isCompleted) {
                    completedSet.add(dateKey);
                    incompleteSet.delete(dateKey);
                    return;
                }

                if (!completedSet.has(dateKey)) {
                    incompleteSet.add(dateKey);
                }
            });

            return {
                completedDates: Array.from(completedSet),
                incompleteDates: Array.from(incompleteSet)
            };
        } catch (err) {
            console.error('getUserWorkoutCalendarDates error:', err);
            throw err;
        }
    }
}
