import { useState, useEffect } from 'react'
import { supabaseHelpers } from '../lib/supabase'

export const useExercises = () => {
    const [exercises, setExercises] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadExercises()
    }, [])

    const loadExercises = async () => {
        try {
            setLoading(true)
            setError(null)
            console.log('🔄 Loading exercises from Supabase...')
            const data = await supabaseHelpers.getAllExercises()
            console.log('✅ Loaded', data.length, 'exercises from Supabase')
            setExercises(data)
        } catch (err) {
            console.error('❌ Error loading exercises from Supabase:', err)
            console.error('Error code:', err.code)
            console.error('Error message:', err.message)
            console.error('Error details:', err.details)
            console.warn('🔄 Falling back to local data...')
            setError(err.message)
            // Fallback to local data if Supabase fails
            const { exercises: localExercises } = await import('../data/exercises')
            setExercises(localExercises)
            console.log('✅ Loaded', localExercises.length, 'exercises from local data')
        } finally {
            setLoading(false)
        }
    }

    return { exercises, loading, error, reload: loadExercises }
}

export const useWorkouts = () => {
    const [workouts, setWorkouts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadWorkouts()
    }, [])

    const loadWorkouts = async () => {
        try {
            setLoading(true)
            setError(null)
            console.log('🔄 Loading workouts from Supabase...')
            const data = await supabaseHelpers.getAllWorkouts()
            console.log('📊 Raw Supabase data:', data)
            console.log('📊 Number of workouts:', data?.length)

            // Transform Supabase data to match local data structure
            const transformedData = data.map(workout => {
                console.log('🔄 Transforming workout:', workout.title)
                console.log('  - Days:', workout.b_workout_days?.length)

                const transformed = {
                    // Use the UUID primary key returned by the DB to avoid sending non-UUID keys where UUIDs are expected
                    id: workout.id,
                    title: workout.title,
                    description: workout.description,
                    difficulty: workout.difficulty,
                    estimated_duration: workout.estimated_duration,
                    days_per_week: workout.days_per_week,
                    cover_image: workout.cover_image,
                    schedule: workout.b_workout_days?.map(day => {
                        console.log('    - Day:', day.day_name, '- Exercises:', day.b_workout_exercises?.length)
                        return {
                            id: day.id,
                            day_name: day.day_name,
                            exercises: day.b_workout_exercises?.map(we => ({
                                // prefer the explicit FK (we.exercise_id) which is a UUID; fallback to nested b_exercises.id if present
                                exercise_id: we.exercise_id || we.b_exercises?.id,
                                sets: we.sets,
                                reps: we.reps,
                                notes: we.notes
                            })) || []
                        }
                    }) || []
                }

                console.log('✅ Transformed workout:', transformed)
                return transformed
            })

            console.log('✅ Loaded', transformedData.length, 'workouts from Supabase')
            setWorkouts(transformedData)
        } catch (err) {
            console.error('❌ Error loading workouts from Supabase:', err)
            console.error('Error code:', err.code)
            console.error('Error message:', err.message)
            console.error('Error details:', err.details)
            console.warn('🔄 Falling back to local data...')
            setError(err.message)
            // Fallback to local data if Supabase fails
            const { workouts: localWorkouts } = await import('../data/workouts')
            setWorkouts(localWorkouts)
            console.log('✅ Loaded', localWorkouts.length, 'workouts from local data')
        } finally {
            setLoading(false)
        }
    }

    return { workouts, loading, error, reload: loadWorkouts }
}

export const useAvatars = () => {
    const [avatars, setAvatars] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadAvatars()
    }, [])

    const loadAvatars = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await supabaseHelpers.getAllAvatars()
            setAvatars(data)
        } catch (err) {
            console.error('❌ Error loading avatars:', err)
            setError(err.message)
            // Fallback to empty or local if critical
        } finally {
            setLoading(false)
        }
    }

    return { avatars, loading, error, reload: loadAvatars }
}

export const useUserRole = () => {
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            try {
                setLoading(true);
                const user = await supabaseHelpers.getCurrentUser();
                setRole(user?.role || 'user'); // Default to 'user' if no role found
            } catch (err) {
                console.error('Error checking role:', err);
                setRole('user');
            } finally {
                setLoading(false);
            }
        };

        checkRole();

        // Listen for profile updates to refresh role
        const handleProfileUpdate = () => checkRole();
        window.addEventListener('profile-updated', handleProfileUpdate);

        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, []);

    const isAdmin = role === 'admin';
    const isPersonal = role === 'personal';
    const isUser = role === 'user';

    return { role, isAdmin, isPersonal, isUser, loading };
};
