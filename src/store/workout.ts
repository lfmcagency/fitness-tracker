import { create } from 'zustand';
import type { Exercise } from '@/types';

interface WorkoutState {
  exercises: Exercise[];
  currentWeight: string;
  isLoading: boolean;
  error: string | null;
  fetchExercises: () => Promise<void>;
  updateExercise: (exerciseId: number, updates: Partial<Exercise>) => void;
  toggleSet: (exerciseId: number, setIndex: number) => void;
  updateCurrentWeight: (weight: string) => void;
}

export const useWorkoutStore = create<WorkoutState>((setState, getState) => ({
  exercises: [],
  currentWeight: '75.5',
  isLoading: false,
  error: null,

  fetchExercises: async () => {
    setState({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/exercises');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exercises');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setState({ 
          exercises: data.data,
          isLoading: false
        });
      } else {
        throw new Error(data.message || 'Failed to fetch exercises');
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      setState({ 
        error: error instanceof Error ? error.message : 'Failed to fetch exercises', 
        isLoading: false 
      });
    }
  },

  updateExercise: (exerciseId, updates) => {
    // Store original exercise
    const originalExercise = getState().exercises.find(e => e.id === exerciseId);
    
    // Optimistic update
    setState((state) => ({
      exercises: state.exercises.map(exercise =>
        exercise.id === exerciseId
          ? { ...exercise, ...updates }
          : exercise
      )
    }));
    
    // Send to API
    fetch(`/api/exercises/${exerciseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error updating exercise:', error);
        // Revert on error
        if (originalExercise) {
          setState((state) => ({
            exercises: state.exercises.map(e =>
              e.id === exerciseId ? originalExercise : e
            ),
            error: 'Failed to update exercise'
          }));
        }
      });
  },

  toggleSet: (exerciseId, setIndex) => {
    setState((state) => {
      const updatedExercises = state.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const updatedSets = [...exercise.sets];
          updatedSets[setIndex] = {
            ...updatedSets[setIndex],
            completed: !updatedSets[setIndex].completed
          };
          return { ...exercise, sets: updatedSets };
        }
        return exercise;
      });
      return { exercises: updatedExercises };
    });
    
    // Then sync with the API
    const exercise = getState().exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const set = exercise.sets[setIndex];
    if (!set) return;
    
    fetch(`/api/exercises/${exerciseId}/sets/${setIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !set.completed })
    }).catch(error => {
      console.error('Error toggling set:', error);
      // Revert on error - implementation omitted for brevity
    });
  },

  updateCurrentWeight: (weight) => {
    setState({ currentWeight: weight });
    
    // Optionally, send to API to update user's current weight
    fetch('/api/user/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight })
    }).catch(error => {
      console.error('Error updating weight:', error);
    });
  }
}));