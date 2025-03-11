import { IFood } from '../models/food';
import { FoodData } from '../api/foodResponses';

export function convertFoodToResponse(food: IFood): FoodData {
  return {
    id: food._id.toString(),
    name: food.name,
    description: food.description,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    calories: food.calories,
    category: food.category,
    isSystemFood: food.isSystemFood,
    isUserFood: !!food.userId,
    brand: food.brand,
    barcode: food.barcode,
    createdAt: food.createdAt.toISOString()
  };
}