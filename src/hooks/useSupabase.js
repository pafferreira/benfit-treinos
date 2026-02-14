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
                    is_public: workout.is_public,
                    creator_id: workout.creator_id,
                    cover_image: workout.cover_image,
                    schedule: (workout.b_workout_days || [])
                        .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))
                        .map(day => {
                        console.log('    - Day:', day.day_name, '- Exercises:', day.b_workout_exercises?.length)
                        return {
                            id: day.id,
                            day_number: day.day_number,
                            day_name: day.day_name,
                            exercises: (day.b_workout_exercises || [])
                                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                                .map(we => ({
                                // prefer the explicit FK (we.exercise_id) which is a UUID; fallback to nested b_exercises.id if present
                                exercise_id: we.exercise_id || we.b_exercises?.id,
                                order_index: we.order_index,
                                sets: we.sets,
                                reps: we.reps,
                                rest_seconds: we.rest_seconds,
                                notes: we.notes
                            }))
                        }
                    })
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
    const [realRole, setRealRole] = useState(null);
    const [impersonatedRole, setImpersonatedRole] = useState(() => {
        return localStorage.getItem('impersonated_role');
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            try {
                setLoading(true);
                const user = await supabaseHelpers.getCurrentUser();
                const fetchedRole = user?.role || 'user';
                setRealRole(fetchedRole);

                // If not admin, force clear impersonation for security
                if (fetchedRole !== 'admin') {
                    localStorage.removeItem('impersonated_role');
                    setImpersonatedRole(null);
                }
            } catch (err) {
                console.error('Error checking role:', err);
                setRealRole('user');
            } finally {
                setLoading(false);
            }
        };

        checkRole();

        const handleProfileUpdate = () => checkRole();
        window.addEventListener('profile-updated', handleProfileUpdate);

        // Listen for impersonation changes from other tabs/windows or local updates
        const handleStorageChange = () => {
            setImpersonatedRole(localStorage.getItem('impersonated_role'));
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('impersonation-updated', handleStorageChange);

        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('impersonation-updated', handleStorageChange);
        };
    }, []);

    // Helper functions
    const impersonate = (role) => {
        if (realRole !== 'admin') return;
        localStorage.setItem('impersonated_role', role);
        setImpersonatedRole(role);
        window.dispatchEvent(new Event('impersonation-updated'));
    };

    const restoreRole = () => {
        localStorage.removeItem('impersonated_role');
        setImpersonatedRole(null);
        window.dispatchEvent(new Event('impersonation-updated'));
    };

    // Derived values
    // If impersonating, role reflects that. Otherwise real role.
    const activeRole = impersonatedRole || realRole;

    const isAdmin = activeRole === 'admin';
    const isPersonal = activeRole === 'personal';
    const isUser = activeRole === 'user';
    const isRealAdmin = realRole === 'admin';

    return {
        role: activeRole,
        realRole,
        isAdmin,
        isPersonal,
        isUser,
        isRealAdmin, // Critical for admin panel access during impersonation
        loading,
        impersonate,
        restoreRole,
        isImpersonating: !!impersonatedRole
    };
};
