// src/store/nutrition.ts
import { create } from 'zustand';
import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/types/api/common';
import type { Meal, Food, FoodDB, MacroGoals } from '@/types';
import { FoodResponse, FoodListResponse } from '@/types/api/foodResponses';
import { MealResponse, MealListResponse } from '@/types/api/mealResponses';

interface NutritionState {
  meals: Meal[];
  foods: FoodDB[];
  foodCategories: string[];
  goals: MacroGoals;
  isLoading: boolean;
  foodsLoading: boolean;
  error: string | null;
  fetchMeals: (date?: string) => Promise<void>;
  fetchFoods: (options?: {search?: string; category?: string; page?: number; limit?: number}) => Promise<void>;
  getFoodById: (id: string) => Promise<FoodDB | null>;
  addFood: (food: Omit<FoodDB, '_id'>) => Promise<FoodDB | null>;
  updateFood: (id: string, food: Partial<FoodDB>) => Promise<FoodDB | null>;
  deleteFood: (id: string) => Promise<boolean>;
  addMeal: (meal: Omit<Meal, 'id' | '_id'>) => Promise<void>;
  addFoodToMeal: (mealId: string, food: Food) => Promise<void>;
  removeFoodFromMeal: (mealId: string, foodIndex: number) => Promise<void>;
  updateGoals: (goals: Partial<MacroGoals>) => void;
  foodDbToMealFood: (foodDb: FoodDB, amount?: number) => Food;
}

// Helper function to handle API errors
const handleApiError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const useNutritionStore = create<NutritionState>((set, get) => ({
  meals: [],
  foods: [],
  foodCategories: [],
  goals: {
    protein: 140,
    carbs: 350,
    fat: 90,
    calories: 3000
  },
  isLoading: false,
  foodsLoading: false,
  error: null,

  fetchMeals: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = date ? `?date=${date}` : '';
      const response = await fetch(`/api/meals${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch meals: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as MealListResponse;
      
      if (data.success) {
        // Transform API response to match frontend state structure
        const transformedMeals = data.data.meals.map(meal => ({
          ...meal,
          // Ensure backward compatibility by using _id as id if needed
          id: typeof meal.id === 'number' ? meal.id : meal.id ? parseInt(meal.id, 36) : 0
        }));
        
        set({ 
          meals: transformedMeals,
          isLoading: false
        });
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to fetch meals');
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      set({
        isLoading: false,
        error: handleApiError(error)
      });
      
      // If in development, provide some mock data for testing
      if (process.env.NODE_ENV === 'development') {
        set({
          meals: [
            {
              id: 1,
              _id: '605c79d2a4c8f32af8abd5d1',
              name: "Breakfast",
              time: "08:00",
              foods: [
                { name: "Oatmeal", amount: 100, unit: 'g', protein: 13, carbs: 68, fat: 7, calories: 389 },
                { name: "Protein Shake", amount: 30, unit: 'g', protein: 24, carbs: 3, fat: 2, calories: 120 }
              ],
              totals: { protein: 37, carbs: 71, fat: 9, calories: 509 }
            },
            {
              id: 2,
              _id: '605c79d2a4c8f32af8abd5d2',
              name: "Lunch",
              time: "13:00",
              foods: [
                { name: "Chicken Breast", amount: 200, unit: 'g', protein: 62, carbs: 0, fat: 7, calories: 330 }
              ],
              totals: { protein: 62, carbs: 0, fat: 7, calories: 330 }
            }
          ]
        });
      }
    }
  },

  fetchFoods: async (options = {}) => {
    set({ foodsLoading: true, error: null });
    try {
      // Build query string from options
      const params = new URLSearchParams();
      if (options.search) params.append('search', options.search);
      if (options.category) params.append('category', options.category);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/foods${queryString}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch foods: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as FoodListResponse;
      
      if (data.success) {
        set({ 
          foods: data.data.foods,
          foodCategories: (data.data as any).categories || [],
          foodsLoading: false
        });
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to fetch foods');
      }
    } catch (error) {
      console.error('Error fetching foods:', error);
      set({
        foodsLoading: false,
        error: handleApiError(error)
      });
    }
  },

  getFoodById: async (id: string) => {
    try {
      // Check if we already have the food in state
      const cachedFood = get().foods.find(f => f._id === id);
      if (cachedFood) return cachedFood;
      
      // Otherwise fetch it from the API
      const response = await fetch(`/api/foods/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch food: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as FoodResponse;
      
      if (data.success) {
        return data.data;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to fetch food');
      }
    } catch (error) {
      console.error('Error fetching food:', error);
      set({ error: handleApiError(error) });
      return null;
    }
  },

  addFood: async (food: Omit<FoodDB, '_id'>) => {
    try {
      const response = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food)
      });
      
      if (!response.ok) {
        throw new Error(`Error adding food: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as FoodResponse;
      
      if (data.success) {
        // Add new food to state
        set((state) => ({
          foods: [...state.foods, data.data]
        }));
        
        return data.data;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to add food');
      }
    } catch (error) {
      console.error('Error adding food:', error);
      set({ error: handleApiError(error) });
      return null;
    }
  },

  updateFood: async (id: string, food: Partial<FoodDB>) => {
    try {
      const response = await fetch(`/api/foods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food)
      });
      
      if (!response.ok) {
        throw new Error(`Error updating food: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as FoodResponse;
      
      if (data.success) {
        // Update food in state
        set((state) => ({
          foods: state.foods.map(f => f._id === id ? data.data : f)
        }));
        
        return data.data;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to update food');
      }
    } catch (error) {
      console.error('Error updating food:', error);
      set({ error: handleApiError(error) });
      return null;
    }
  },

  deleteFood: async (id: string) => {
    try {
      const response = await fetch(`/api/foods/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting food: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as ApiResponse;
      
      if (data.success) {
        // Remove food from state
        set((state) => ({
          foods: state.foods.filter(f => f._id !== id)
        }));
        
        return true;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to delete food');
      }
    } catch (error) {
      console.error('Error deleting food:', error);
      set({ error: handleApiError(error) });
      return false;
    }
  },

  addMeal: async (meal) => {
    // Generate temporary ID for optimistic update
    const tempId = Date.now();
    const tempMeal: Meal = { 
      ...meal, 
      id: tempId, 
      foods: meal.foods || [],
      totals: meal.totals || { protein: 0, carbs: 0, fat: 0, calories: 0 }
    };
    
    // Optimistic update
    set((state) => ({
      meals: [...state.meals, tempMeal]
    }));
    
    try {
      // Send to API
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meal)
      });
      
      if (!response.ok) {
        throw new Error(`Error adding meal: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as MealResponse;
      
      if (data.success) {
        // Replace temp meal with real one from server
        const serverMeal = {
          ...data.data,
          id: typeof data.data.id === 'string' ? parseInt(data.data.id, 36) % 100000 : data.data.id
        };
        
        set((state) => ({
          meals: state.meals.map(m => 
            m.id === tempId ? { ...serverMeal, id: Number(serverMeal.id) } : m
          )
        }));
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to add meal');
      }
    } catch (error) {
      console.error('Error adding meal:', error);
      // Remove the meal on error (revert optimistic update)
      set((state) => ({
        meals: state.meals.filter(m => m.id !== tempId),
        error: handleApiError(error)
      }));
    }
  },

  addFoodToMeal: async (mealId, food) => {
    // Find the meal to update
    const meal = get().meals.find(m => m._id === mealId || m.id?.toString() === mealId);
    if (!meal) {
      set({ error: `Meal with ID ${mealId} not found` });
      return;
    }
    
    // Generate a temporary food object
    const tempFood = { ...food };
    
    // Optimistic update
    set((state) => ({
      meals: state.meals.map(meal => {
        if (meal._id === mealId || meal.id?.toString() === mealId) {
          // Calculate new totals
          const newTotals = {
            protein: (meal.totals?.protein || 0) + (food.protein || 0),
            carbs: (meal.totals?.carbs || 0) + (food.carbs || 0),
            fat: (meal.totals?.fat || 0) + (food.fat || 0),
            calories: (meal.totals?.calories || 0) + (food.calories || 0)
          };
          
          return {
            ...meal,
            foods: [...meal.foods, tempFood],
            totals: newTotals
          };
        }
        return meal;
      })
    }));
    
    try {
      // Call API to add food to meal
      const response = await fetch(`/api/meals/${mealId}/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food)
      });
      
      if (!response.ok) {
        throw new Error(`Error adding food: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as MealResponse;
      
      if (data.success) {
        // Update with server data to ensure everything is in sync
        const serverMeal = {
          ...data.data,
          id: typeof data.data.id === 'string' ? parseInt(data.data.id, 36) % 100000 : data.data.id
        };
        
        set((state: NutritionState) => ({
  meals: state.meals.map(m => 
    (m._id === mealId || m.id?.toString() === mealId) ? { ...serverMeal, id: Number(serverMeal.id) } : m
  )
}));
      } else {
        throw new Error(data.error?.message || 'Failed to add food to meal');
      }
    } catch (error) {
      console.error('Error adding food to meal:', error);
      // Revert optimistic update on error
      set((state) => ({
        meals: state.meals.map(meal => {
          if (meal._id === mealId || meal.id?.toString() === mealId) {
            return {
              ...meal,
              foods: meal.foods.filter(f => f !== tempFood)
            };
          }
          return meal;
        }),
        error: handleApiError(error)
      }));
    }
  },

  removeFoodFromMeal: async (mealId, foodIndex) => {
    // Find the meal to update
    const meal = get().meals.find(m => m._id === mealId || m.id?.toString() === mealId);
    if (!meal) {
      set({ error: `Meal with ID ${mealId} not found` });
      return;
    }
    
    // Store the food before removing for potential rollback
    const foodToRemove = meal.foods[foodIndex];
    if (!foodToRemove) {
      set({ error: `Food at index ${foodIndex} not found in meal ${mealId}` });
      return;
    }
    
    // Calculate totals that will be removed
    const removedTotals = {
      protein: foodToRemove.protein || 0,
      carbs: foodToRemove.carbs || 0,
      fat: foodToRemove.fat || 0,
      calories: foodToRemove.calories || 0
    };
    
    // Optimistic update
    set((state) => ({
      meals: state.meals.map(meal => {
        if (meal._id === mealId || meal.id?.toString() === mealId) {
          // Calculate new totals
          const newTotals = {
            protein: Math.max(0, (meal.totals?.protein || 0) - removedTotals.protein),
            carbs: Math.max(0, (meal.totals?.carbs || 0) - removedTotals.carbs),
            fat: Math.max(0, (meal.totals?.fat || 0) - removedTotals.fat),
            calories: Math.max(0, (meal.totals?.calories || 0) - removedTotals.calories)
          };
          
          return {
            ...meal,
            foods: meal.foods.filter((_, idx) => idx !== foodIndex),
            totals: newTotals
          };
        }
        return meal;
      })
    }));
    
    try {
      // Call API to remove food from meal
      const response = await fetch(`/api/meals/${mealId}/foods/${foodIndex}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error removing food: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as MealResponse;
      
      if (data.success) {
        // Update with server data to ensure everything is in sync
        const serverMeal = {
          ...data.data,
          id: typeof data.data.id === 'string' ? parseInt(data.data.id, 36) % 100000 : data.data.id
        };
        
        set((state: NutritionState) => ({
          meals: state.meals.map(m => 
            (m._id === mealId || m.id?.toString() === mealId) ? { ...serverMeal, id: Number(serverMeal.id) } : m
          )
        }));
      } else {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to remove food from meal');
      }
    } catch (error) {
      console.error('Error removing food from meal:', error);
      // Revert optimistic update on error
      set((state) => ({
        meals: state.meals.map(meal => {
          if (meal._id === mealId || meal.id?.toString() === mealId) {
            const updatedFoods = [...meal.foods];
            updatedFoods.splice(foodIndex, 0, foodToRemove);
            
            return {
              ...meal,
              foods: updatedFoods
            };
          }
          return meal;
        }),
        error: handleApiError(error)
      }));
    }
  },

  updateGoals: (goals) => {
    // Optimistic update
    set((state) => ({
      goals: { ...state.goals, ...goals }
    }));
    
    // We could add API integration for saving goals in the future
  },
  
  foodDbToMealFood: (foodDb: FoodDB, amount?: number): Food => {
    // Calculate the scaling factor based on the amount
    const scaleFactor = amount ? amount / foodDb.servingSize : 1;
    
    return {
      name: foodDb.name,
      amount: amount || foodDb.servingSize,
      unit: foodDb.servingUnit,
      protein: Math.round((foodDb.protein * scaleFactor) * 10) / 10,
      carbs: Math.round((foodDb.carbs * scaleFactor) * 10) / 10,
      fat: Math.round((foodDb.fat * scaleFactor) * 10) / 10,
      calories: Math.round(foodDb.calories * scaleFactor),
      foodId: foodDb._id
    };
  }
}));