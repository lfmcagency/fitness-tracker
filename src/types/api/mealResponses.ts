import { ApiResponse } from './common';
import { PaginationInfo } from './pagination';

export interface MealFoodData {
  index?: number;
  foodId?: string;
  name: string;
  amount: number;
  unit: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  serving?: {
    size: number;
    unit: string;
  };
}

export interface MealData {
  id: string;
  name: string;
  time: string;
  date: string;
  foods: MealFoodData[];
  totals: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  notes?: string;
  createdAt: string;
}

export type MealResponse = ApiResponse<MealData>;

export type MealListResponse = ApiResponse<{
  meals: MealData[];
  pagination: PaginationInfo;
}>;

export type MealFoodsResponse = ApiResponse<{
  foods: MealFoodData[];
  mealId: string;
  mealName: string;
  count: number;
  totals: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
}>;

export type MealFoodResponse = ApiResponse<MealFoodData>;

export type MealFoodRemovedResponse = ApiResponse<{
  removed: MealFoodData;
  mealId: string;
  index: number;
  remainingFoods: number;
}>;
