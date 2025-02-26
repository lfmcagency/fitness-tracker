import { create } from 'zustand';
import type { Meal, Food, MacroGoals } from '@/types';

interface NutritionState {
  meals: Meal[];
  goals: MacroGoals;
  isLoading: boolean;
  error: string | null;
  fetchMeals: (date?: string) => Promise<void>;
  addMeal: (meal: Omit<Meal, 'id'>) => void;
  addFoodToMeal: (mealId: number, food: Food) => void;
  removeFoodFromMeal: (mealId: number, foodIndex: number) => void;
  updateGoals: (goals: Partial<MacroGoals>) => void;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  meals: [],
  goals: {
    protein: 140,
    carbs: 350,
    fat: 90,
    calories: 3000
  },
  isLoading: false,
  error: null,

  fetchMeals: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = date ? `?date=${date}` : '';
      const response = await fetch(`/api/meals${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch meals');
      }
      
      const data = await response.json();
      
      if (data.success) {
        set({ 
          meals: data.data,
          isLoading: false
        });
      } else {
        throw new Error(data.message || 'Failed to fetch meals');
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch meals', 
        isLoading: false 
      });
    }
  },

  addMeal: (meal) => {
    // Generate temporary ID
    const tempId = Date.now();
    const newMeal = { ...meal, id: tempId };
    
    // Optimistic update
    set((state) => ({
      meals: [...state.meals, newMeal]
    }));
    
    // Send to API
    fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal)
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Replace temp meal with real one from server
          set((state) => ({
            meals: state.meals.map(m => 
              m.id === tempId ? data.data : m
            )
          }));
        } else {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error adding meal:', error);
        // Remove the meal on error
        set((state) => ({
          meals: state.meals.filter(m => m.id !== tempId),
          error: 'Failed to add meal'
        }));
      });
  },

  addFoodToMeal: (mealId, food) => {
    // Optimistic update
    set((state) => ({
      meals: state.meals.map(meal => {
        if (meal.id === mealId) {
          return {
            ...meal,
            foods: [...meal.foods, food]
          };
        }
        return meal;
      })
    }));
    
    // Send to API
    fetch(`/api/meals/${mealId}/foods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(food)
    })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error adding food to meal:', error);
        // Revert on error - implementation omitted for brevity
        set({ error: 'Failed to add food to meal' });
      });
  },

  removeFoodFromMeal: (mealId, foodIndex) => {
    // Store the meal and food before removing
    const meal = get().meals.find(m => m.id === mealId);
    const foodToRemove = meal?.foods[foodIndex];
    
    // Optimistic update
    set((state) => ({
      meals: state.meals.map(meal => {
        if (meal.id === mealId) {
          return {
            ...meal,
            foods: meal.foods.filter((_, idx) => idx !== foodIndex)
          };
        }
        return meal;
      })
    }));
    
    // Send to API
    fetch(`/api/meals/${mealId}/foods/${foodIndex}`, {
      method: 'DELETE'
    })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error removing food from meal:', error);
        // Restore the food on error - implementation omitted for brevity
        set({ error: 'Failed to remove food from meal' });
      });
  },

  updateGoals: (goals) => {
    // Optimistic update
    set((state) => ({
      goals: { ...state.goals, ...goals }
    }));
    
    // Send to API
    fetch('/api/nutrition/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goals)
    })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error updating nutrition goals:', error);
        set({ error: 'Failed to update nutrition goals' });
      });
  }
}));