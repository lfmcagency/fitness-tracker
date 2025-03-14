import { IMeal } from '../models/meal';
import { MealData, MealFoodData } from '../api/mealResponses';

export function convertMealToResponse(meal: IMeal): MealData {
  return {
  id: meal.id.toString(),
  name: meal.name,
  time: meal.time,
  date: meal.date.toISOString(),
  foods: meal.foods.map((food: any, index: number) => convertMealFoodToResponse(food, index)),
  totals: meal.totals || {
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0
  },
  notes: meal.notes,
  createdAt: meal.createdAt.toISOString()
};
}

export function convertMealFoodToResponse(food: any, index: number): MealFoodData {
  return {
    index,
    foodId: food.foodId?.toString(),
    name: food.name || 'Unknown Food',
    amount: food.amount || 0,
    unit: food.unit || 'g',
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0,
    calories: food.calories || 0,
    serving: food.serving
  };
}