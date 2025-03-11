export interface FoodQueryParams {
    search?: string;
    category?: string;
    user?: 'all' | 'system' | 'user';
    minProtein?: number;
    maxProtein?: number;
    minCarbs?: number;
    maxCarbs?: number;
    minFat?: number;
    maxFat?: number;
    minCalories?: number;
    maxCalories?: number;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  
  export interface CreateFoodRequest {
    name: string;
    description?: string;
    servingSize: number;
    servingUnit: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    category?: string;
    barcode?: string;
    brand?: string;
  }
  
  export interface UpdateFoodRequest {
    name?: string;
    description?: string;
    servingSize?: number;
    servingUnit?: string;
    protein?: number;
    carbs?: number;
    fat?: number;
    calories?: number;
    category?: string;
    barcode?: string;
    brand?: string;
  }