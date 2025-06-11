// src/store/nutrition.ts
import { create } from 'zustand';
import { FoodData } from '@/types/api/foodResponses';
import { MealData, MealFoodData } from '@/types/api/mealResponses';
import { CreateMealRequest, AddFoodToMealRequest } from '@/types/api/mealRequests';
import { CreateFoodRequest } from '@/types/api/foodRequests';

interface NutritionState {
  // Core state (simple)
  meals: MealData[]
  foods: FoodData[]
  selectedDate: string
  isLoading: boolean
  error: string | null
  isCurrentUserAdmin: boolean
  
  // User goals (loaded from profile)
  macroGoals: {
    protein: number
    carbs: number
    fat: number
    calories: number
  }
  
  // Actions (mirror task store pattern)
  setSelectedDate: (date: string) => void
  fetchMealsForDate: (date: string) => Promise<void>
  fetchFoods: (search?: string) => Promise<void>
  createMeal: (meal: CreateMealRequest) => Promise<MealData | null>
  updateMeal: (id: string, updates: Partial<MealData>) => Promise<MealData | null>
  deleteMeal: (id: string) => Promise<boolean>
  addFoodToMeal: (mealId: string, food: AddFoodToMealRequest) => Promise<void>
  removeFoodFromMeal: (mealId: string, foodIndex: number) => Promise<void>
  createFood: (food: CreateFoodRequest) => Promise<FoodData | null>
  updateFood: (id: string, updates: Partial<FoodData>) => Promise<FoodData | null>
  deleteFood: (id: string) => Promise<boolean>
  fetchUserRole: () => Promise<void>
  
  // Helpers
  getMealsForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => MealData[]
  getDailyTotals: () => { protein: number, carbs: number, fat: number, calories: number }
  getGoalProgress: () => { protein: number, carbs: number, fat: number, calories: number } // as percentages
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  // Initial state
  meals: [],
  foods: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isCurrentUserAdmin: false,
  isLoading: false,
  error: null,
  macroGoals: {
    protein: 140,
    carbs: 200,
    fat: 70,
    calories: 2200
  },

  // Actions
  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().fetchMealsForDate(date);
  },

  fetchMealsForDate: async (date: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/meals?date=${date}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch meals: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        set({ 
          meals: data.data.meals || [],
          isLoading: false
        });
      } else {
        throw new Error(data.error?.message || 'Failed to fetch meals');
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  fetchFoods: async (search?: string) => {
    set({ isLoading: true, error: null });
    // Fetch user role if we haven't yet
  if (!get().isCurrentUserAdmin) {
    await get().fetchUserRole();
  }
    try {
      const url = search ? `/api/foods?search=${encodeURIComponent(search)}` : '/api/foods';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch foods: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        set({ 
          foods: data.data.foods || [],
          isLoading: false
        });
      } else {
        throw new Error(data.error?.message || 'Failed to fetch foods');
      }
    } catch (error) {
      console.error('Error fetching foods:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  createMeal: async (meal: CreateMealRequest) => {
    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meal)
      });

      if (!response.ok) {
        throw new Error(`Failed to create meal: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Add to state
        set(state => ({
          meals: [...state.meals, data.data]
        }));
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Failed to create meal');
      }
    } catch (error) {
      console.error('Error creating meal:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  updateMeal: async (id: string, updates: Partial<MealData>) => {
    try {
      const response = await fetch(`/api/meals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update meal: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update in state
        set(state => ({
          meals: state.meals.map(meal => 
            meal.id === id ? data.data : meal
          )
        }));
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Failed to update meal');
      }
    } catch (error) {
      console.error('Error updating meal:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  deleteMeal: async (id: string) => {
    try {
      const response = await fetch(`/api/meals/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete meal: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Remove from state
        set(state => ({
          meals: state.meals.filter(meal => meal.id !== id)
        }));
        return true;
      } else {
        throw new Error(data.error?.message || 'Failed to delete meal');
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  addFoodToMeal: async (mealId: string, food: AddFoodToMealRequest) => {
    try {
      const response = await fetch(`/api/meals/${mealId}/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food)
      });

      if (!response.ok) {
        throw new Error(`Failed to add food to meal: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh meals to get updated totals
        await get().fetchMealsForDate(get().selectedDate);
      } else {
        throw new Error(data.error?.message || 'Failed to add food to meal');
      }
    } catch (error) {
      console.error('Error adding food to meal:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  removeFoodFromMeal: async (mealId: string, foodIndex: number) => {
    try {
      const response = await fetch(`/api/meals/${mealId}/foods/${foodIndex}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to remove food from meal: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh meals to get updated totals  
        await get().fetchMealsForDate(get().selectedDate);
      } else {
        throw new Error(data.error?.message || 'Failed to remove food from meal');
      }
    } catch (error) {
      console.error('Error removing food from meal:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  createFood: async (food: CreateFoodRequest) => {
    try {
      const response = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food)
      });

      if (!response.ok) {
        throw new Error(`Failed to create food: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Add to foods
        set(state => ({
          foods: [...state.foods, data.data]
        }));
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Failed to create food');
      }
    } catch (error) {
      console.error('Error creating food:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  updateFood: async (id: string, updates: Partial<FoodData>) => {
    try {
      const response = await fetch(`/api/foods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update food: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update in foods array
        set(state => ({
          foods: state.foods.map(food => 
            food.id === id ? data.data : food
          )
        }));
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Failed to update food');
      }
    } catch (error) {
      console.error('Error updating food:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  deleteFood: async (id: string) => {
    try {
      const response = await fetch(`/api/foods/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete food: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Remove from foods array
        set(state => ({
          foods: state.foods.filter(food => food.id !== id)
        }));
        return true;
      } else {
        throw new Error(data.error?.message || 'Failed to delete food');
      }
    } catch (error) {
      console.error('Error deleting food:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },
  fetchUserRole: async () => {
  try {
    const response = await fetch('/api/user/profile');
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const isAdmin = data.data.role?.includes('admin') || false;
        set({ isCurrentUserAdmin: isAdmin });
      }
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
    set({ isCurrentUserAdmin: false });
  }
},

  // Helpers
  getMealsForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => {
    const timeRanges = {
      morning: { start: '00:00', end: '11:59' },
      afternoon: { start: '12:00', end: '17:59' },
      evening: { start: '18:00', end: '23:59' }
    };

    const range = timeRanges[timeBlock];
    
    return get().meals.filter(meal => {
      if (!meal.time) return timeBlock === 'morning'; // Default to morning
      return meal.time >= range.start && meal.time <= range.end;
    });
  },

  getDailyTotals: () => {
    const meals = get().meals;
    
    return meals.reduce((totals, meal) => {
      if (meal.totals) {
        totals.protein += meal.totals.protein || 0;
        totals.carbs += meal.totals.carbs || 0;
        totals.fat += meal.totals.fat || 0;
        totals.calories += meal.totals.calories || 0;
      }
      return totals;
    }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
  },

  getGoalProgress: () => {
    const totals = get().getDailyTotals();
    const goals = get().macroGoals;
    
    return {
      protein: goals.protein > 0 ? Math.round((totals.protein / goals.protein) * 100) : 0,
      carbs: goals.carbs > 0 ? Math.round((totals.carbs / goals.carbs) * 100) : 0,
      fat: goals.fat > 0 ? Math.round((totals.fat / goals.fat) * 100) : 0,
      calories: goals.calories > 0 ? Math.round((totals.calories / goals.calories) * 100) : 0
    };
  }
}));