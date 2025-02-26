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

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: [],
  currentWeight: '75.5',
  isLoading: false,
  error: null,

  fetchExercises: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/exercises');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exercises');
      }
      
      const data = await response.json();
      
      if (data.success) {
        set({ 
          exercises: data.data,
          isLoading: false
        });
      } else {
        throw new Error(data.message || 'Failed to fetch exercises');
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch exercises', 
        isLoading: false 
      });
    }
  },

  updateExercise: (exerciseId, updates) => {
    // Store original exercise
    const originalExercise = get().exercises.find(e => e.id === exerciseId);
    
    // Optimistic update
    set((state) => ({
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
          set((state) => ({
            exercises: state.exercises.map(e =>
              e.id === exerciseId ? originalExercise : e
            ),
            error: 'Failed to update exercise'
          }));
        }
      });
  },

  toggleSet: (exerciseId, setIndex) => {
    set((state) => {
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
    const exercise = get().exercises.find(e => e.id === exerciseId);
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
    set({ currentWeight: weight });
    
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