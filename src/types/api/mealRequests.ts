export interface MealQueryParams {
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  
  export interface CreateMealRequest {
    name: string;
    time: string;
    date?: string;
    foods?: Array<{
      foodId?: string;
      name: string;
      amount: number;
      unit?: string;
      protein?: number;
      carbs?: number;
      fat?: number;
      calories?: number;
      serving?: {
        size: number;
        unit: string;
      };
    }>;
    notes?: string;
  }
  
  export interface UpdateMealRequest {
    name?: string;
    time?: string;
    date?: string;
    notes?: string;
  }
  
  export interface AddFoodToMealRequest {
    foodId?: string;
    name?: string;
    amount: number;
    unit?: string;
    protein?: number;
    carbs?: number;
    fat?: number;
    calories?: number;
    serving?: {
      size: number;
      unit: string;
    };
  }
  
  export interface UpdateMealFoodRequest {
    foodId?: string;
    name?: string;
    amount?: number;
    unit?: string;
    protein?: number;
    carbs?: number;
    fat?: number;
    calories?: number;
    serving?: {
      size: number;
      unit: string;
    };
  }