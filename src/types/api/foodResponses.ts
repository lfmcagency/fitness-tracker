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

export type FoodResponse = ApiResponse<FoodData>;

export type FoodListResponse = ApiResponse<{
  categories: never[];
  foods: FoodData[];
  pagination: PaginationInfo;
}>;