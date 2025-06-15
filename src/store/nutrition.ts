// src/store/nutrition.ts
import { create } from 'zustand';
import { FoodData } from '@/types/api/foodResponses';
import { MealData, MealFoodData } from '@/types/api/mealResponses';
import { CreateMealRequest, AddFoodToMealRequest } from '@/types/api/mealRequests';
import { CreateFoodRequest } from '@/types/api/foodRequests';

// NEW: Use shared utilities instead of duplicating code
import { 
  apiGet, 
  apiPost, 
  apiPut, 
  apiDelete,
  ApiError,
  getTodayString,
  getTimeBlockForTime,
  extractAchievements,
  type AchievementNotification
} from '@/lib/shared-utilities';

interface NutritionState {
  // Core state
  meals: MealData[]
  foods: FoodData[]
  selectedDate: string
  isLoading: boolean
  error: string | null
  isCurrentUserAdmin: boolean
  hasCheckedRole: boolean
  
  // NEW: Achievement notifications for coordinator integration
  recentAchievements: AchievementNotification | null
  
  // User goals
  macroGoals: {
    protein: number
    carbs: number
    fat: number
    calories: number
  }
  
  // Actions
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
  
  // NEW: Helpers
  clearError: () => void
  clearAchievements: () => void
  getMealsForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => MealData[]
  getDailyTotals: () => { protein: number, carbs: number, fat: number, calories: number }
  getGoalProgress: () => { protein: number, carbs: number, fat: number, calories: number }
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  // Initial state
  meals: [],
  foods: [],
  selectedDate: getTodayString(), // Using shared utility
  isCurrentUserAdmin: false,
  hasCheckedRole: false,
  isLoading: false,
  error: null,
  recentAchievements: null, // NEW
  macroGoals: {
    protein: 140,
    carbs: 200,
    fat: 70,
    calories: 2200
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date, recentAchievements: null }); // Clear achievements on date change
    get().fetchMealsForDate(date);
  },

  fetchMealsForDate: async (date: string) => {
    set({ isLoading: true, error: null });
    try {
      // Using shared API utility instead of manual fetch
      const data = await apiGet<{
        meals: MealData[];
        totals: { protein: number; carbs: number; fat: number; calories: number };
        pagination: { total: number; page: number; limit: number; pages: number };
      }>(`/api/meals`, { date });
      
      set({ 
        meals: data.meals || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching meals:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch meals';
      set({
        isLoading: false,
        error: errorMessage
      });
    }
  },

  fetchFoods: async (search?: string) => {
    set({ isLoading: true, error: null });
    
    // Check user role if we haven't yet
    if (!get().hasCheckedRole) {
      await get().fetchUserRole();
    }
    
    try {
      // Using shared API utility with optional search parameter
      const params = search ? { search } : undefined;
      const data = await apiGet<{ foods: FoodData[] }>('/api/foods', params);
      
      set({ 
        foods: data.foods || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching foods:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch foods';
      set({
        isLoading: false,
        error: errorMessage
      });
    }
  },

  fetchUserRole: async () => {
    set({ hasCheckedRole: true });
    
    try {
      // Using shared API utility
      const data = await apiGet<{ role: string }>('/api/user/profile');
      const isAdmin = data.role === 'admin';
      set({ isCurrentUserAdmin: isAdmin });
      console.log('User role check:', data.role, 'isAdmin:', isAdmin);
    } catch (error) {
      console.error('Error fetching user role:', error);
      set({ isCurrentUserAdmin: false });
    }
  },

  createMeal: async (meal: CreateMealRequest) => {
    try {
      // Using shared API utility
      const responseData = await apiPost<any>('/api/meals', meal);
      
      // Extract main meal data (handle enhanced response from coordinator integration)
      const mealData = 'token' in responseData ? {
        id: responseData.id,
        name: responseData.name,
        date: responseData.date,
        time: responseData.time,
        foods: responseData.foods,
        totals: responseData.totals,
        notes: responseData.notes,
        userId: responseData.userId
      } : responseData;
      
      // NEW: Check for achievements using shared utility
      const achievements = extractAchievements(responseData);
      if (achievements) {
        console.log('🏆 [NUTRITION-STORE] Achievements unlocked:', achievements);
      }
      
      set(state => ({
        meals: [...state.meals, mealData],
        recentAchievements: achievements // NEW
      }));
      
      return mealData;
    } catch (error) {
      console.error('Error creating meal:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to create meal';
      set({ error: errorMessage });
      return null;
    }
  },

  updateMeal: async (id: string, updates: Partial<MealData>) => {
    try {
      // Using shared API utility
      const mealData = await apiPut<MealData>(`/api/meals/${id}`, updates);
      
      set(state => ({
        meals: state.meals.map(meal => 
          meal.id === id ? mealData : meal
        )
      }));
      return mealData;
    } catch (error) {
      console.error('Error updating meal:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to update meal';
      set({ error: errorMessage });
      return null;
    }
  },

  deleteMeal: async (id: string) => {
    try {
      // Using shared API utility
      await apiDelete(`/api/meals/${id}`);
      
      set(state => ({
        meals: state.meals.filter(meal => meal.id !== id)
      }));
      return true;
    } catch (error) {
      console.error('Error deleting meal:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete meal';
      set({ error: errorMessage });
      return false;
    }
  },

  addFoodToMeal: async (mealId: string, food: AddFoodToMealRequest) => {
    try {
      // Using shared API utility
      await apiPost(`/api/meals/${mealId}/foods`, food);
      
      await get().fetchMealsForDate(get().selectedDate);
    } catch (error) {
      console.error('Error adding food to meal:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to add food to meal';
      set({ error: errorMessage });
    }
  },

  removeFoodFromMeal: async (mealId: string, foodIndex: number) => {
    try {
      // Using shared API utility
      await apiDelete(`/api/meals/${mealId}/foods/${foodIndex}`);
      
      await get().fetchMealsForDate(get().selectedDate);
    } catch (error) {
      console.error('Error removing food from meal:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to remove food from meal';
      set({ error: errorMessage });
    }
  },

  createFood: async (food: CreateFoodRequest) => {
    try {
      // Using shared API utility
      const foodData = await apiPost<FoodData>('/api/foods', food);
      
      set(state => ({
        foods: [...state.foods, foodData]
      }));
      return foodData;
    } catch (error) {
      console.error('Error creating food:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to create food';
      set({ error: errorMessage });
      return null;
    }
  },

  updateFood: async (id: string, updates: Partial<FoodData>) => {
    try {
      // Using shared API utility
      const foodData = await apiPut<FoodData>(`/api/foods/${id}`, updates);
      
      set(state => ({
        foods: state.foods.map(food => 
          food.id === id ? foodData : food
        )
      }));
      return foodData;
    } catch (error) {
      console.error('Error updating food:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to update food';
      set({ error: errorMessage });
      return null;
    }
  },

  deleteFood: async (id: string) => {
    try {
      // Using shared API utility
      await apiDelete(`/api/foods/${id}`);
      
      set(state => ({
        foods: state.foods.filter(food => food.id !== id)
      }));
      return true;
    } catch (error) {
      console.error('Error deleting food:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete food';
      set({ error: errorMessage });
      return false;
    }
  },

  // NEW: Helper methods
  clearError: () => {
    set({ error: null });
  },

  clearAchievements: () => {
    set({ recentAchievements: null });
  },

  // Helpers - using shared time block utility
  getMealsForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => {
    return get().meals.filter(meal => {
      if (!meal.time) return timeBlock === 'morning';
      const mealTimeBlock = getTimeBlockForTime(meal.time);
      return mealTimeBlock === timeBlock;
    });
  },

  getDailyTotals: () => {
    const meals = get().meals;
    
    const totals = meals.reduce((totals, meal) => {
      if (meal.totals) {
        totals.protein += meal.totals.protein || 0;
        totals.carbs += meal.totals.carbs || 0;
        totals.fat += meal.totals.fat || 0;
        totals.calories += meal.totals.calories || 0;
      }
      return totals;
    }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

    // Round to 1 decimal place
    return {
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      calories: Math.round(totals.calories)
    };
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