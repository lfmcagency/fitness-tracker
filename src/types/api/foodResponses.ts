// src/types/api/foodResponses.ts
import { ApiResponse } from './common';
import { PaginationInfo } from './pagination';

export interface FoodData {
  id: string;
  name: string;
  description?: string;
  servingSize: number;
  servingUnit: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  category?: string;
  isSystemFood: boolean;
  isUserFood: boolean;
  brand?: string;
  barcode?: string;
  createdAt: string;
}

// Individual food response (still uses ApiResponse wrapper for API calls)
export type FoodResponse = ApiResponse<FoodData>;

// Food list data (direct interface - no wrapper)
export interface FoodListData {
  foods: FoodData[];
  pagination: PaginationInfo;
}

// Food list response (for API calls)
export type FoodListResponse = ApiResponse<FoodListData>;