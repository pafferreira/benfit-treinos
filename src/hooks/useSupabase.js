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
            const data = await supabaseHelpers.getAllExercises()
            setExercises(data)
        } catch (err) {
            console.error('Error loading exercises:', err)
            setError(err.message)
            // Fallback to local data if Supabase fails
            const { exercises: localExercises } = await import('../data/exercises')
            setExercises(localExercises)
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
            const data = await supabaseHelpers.getAllWorkouts()

            // Transform Supabase data to match local data structure
            const transformedData = data.map(workout => ({
                id: workout.workout_key,
                title: workout.title,
                description: workout.description,
                difficulty: workout.difficulty,
                estimated_duration: workout.estimated_duration,
                days_per_week: workout.days_per_week,
                cover_image: workout.cover_image,
                schedule: workout.B_Workout_Days?.map(day => ({
                    day_name: day.day_name,
                    exercises: day.B_Workout_Exercises?.map(we => ({
                        exercise_id: we.B_Exercises?.exercise_key,
                        sets: we.sets,
                        reps: we.reps,
                        notes: we.notes
                    })) || []
                })) || []
            }))

            setWorkouts(transformedData)
        } catch (err) {
            console.error('Error loading workouts:', err)
            setError(err.message)
            // Fallback to local data if Supabase fails
            const { workouts: localWorkouts } = await import('../data/workouts')
            setWorkouts(localWorkouts)
        } finally {
            setLoading(false)
        }
    }

    return { workouts, loading, error, reload: loadWorkouts }
}
