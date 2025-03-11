export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Meal from "@/models/Meal";
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose, { isValidObjectId } from "mongoose";
import { MealFoodData, MealFoodsResponse } from "@/types/api/mealResponses";
import { AddFoodToMealRequest } from "@/types/api/mealRequests";
import { convertMealFoodToResponse } from "@/types/converters/mealConverters";
import { IMeal } from "@/types/models/meal";
import { IFood } from "@/types/models/food";

/**
 * GET /api/meals/[id]/foods
 * Get all foods in a meal
 */

export const GET = withAuth<MealFoodData, { id: string }>(
  async (req: NextRequest, id: string, context) => {
    try {
      await dbConnect();
      
      const { params } = context || {};
      
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const mealId = context.params.id;
      
      if (!isValidObjectId(mealId)) {
        return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(mealId);
        
        if (!meal) {
          return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving meal from database');
      }
      
      // Check if user has access to this meal
      if (meal.userId && meal.userId.toString() !== userId) {
        return apiError('You do not have permission to access this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Calculate meal nutritional totals
      const mealTotals = {
        protein: 0,
        carbs: 0,
        fat: 0,
        calories: 0
      };
      
      // Process foods with defensive array handling
      const processedFoods = [];
      if (Array.isArray(meal.foods)) {
        for (let i = 0; i < meal.foods.length; i++) {
          const food = meal.foods[i];
          try {
            // Safely add food nutritional values
            mealTotals.protein += Number(food.protein) || 0;
            mealTotals.carbs += Number(food.carbs) || 0;
            mealTotals.fat += Number(food.fat) || 0;
            mealTotals.calories += Number(food.calories) || 0;
            
            // Add processed food using converter
            processedFoods.push(convertMealFoodToResponse(food, i));
          } catch (error) {
            console.error('Error processing food in meal:', error);
            // Add minimal food data as fallback
            processedFoods.push({
              index: i,
              foodId: food.foodId ? food.foodId.toString() : undefined,
              name: food.name || 'Unknown Food',
              protein: Number(food.protein) || 0,
              carbs: Number(food.carbs) || 0,
              fat: Number(food.fat) || 0,
              calories: Number(food.calories) || 0,
              amount: Number(food.amount) || 0,
              unit: food.unit || 'g'
            });
          }
        }
      }
      
      // Round totals for consistency
      mealTotals.protein = Math.round(mealTotals.protein * 10) / 10;
      mealTotals.carbs = Math.round(mealTotals.carbs * 10) / 10;
      mealTotals.fat = Math.round(mealTotals.fat * 10) / 10;
      mealTotals.calories = Math.round(mealTotals.calories);
      
      return apiResponse({
        foods: processedFoods,
        mealId: mealId,
        mealName: meal.name || 'Unnamed Meal',
        count: processedFoods.length,
        totals: mealTotals
      }, true, `Retrieved ${processedFoods.length} foods from meal`);
    } catch (error) {
      return handleApiError(error, "Error retrieving foods from meal");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/meals/[id]/foods
 * Add a new food to a meal
 */

export const POST = withAuth<{ food: MealFoodData, mealId: string, index: number }, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { params } = context || {};
      
      if (!params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }

      const mealId = params.id;
      
      if (!isValidObjectId(mealId)) {
        return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body with defensive error handling
      let body: AddFoodToMealRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid food data', 400, 'ERR_INVALID_DATA');
      }
      
      // Get existing meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(mealId);
        
        if (!meal) {
          return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving meal from database');
      }
      
      // Check if user has permission to update this meal
      if (meal.userId && meal.userId.toString() !== userId) {
        return apiError('You do not have permission to update this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Validate food data
      // Option 1: Food from database (need foodId)
      let foodFromDb: IFood | null = null;
      
      // Validate foodId if provided
      if (body.foodId) {
        if (!isValidObjectId(body.foodId)) {
          return apiError('Invalid food ID format', 400, 'ERR_VALIDATION');
        }
        
        // Try to find the food in database
        try {
          foodFromDb = await Food.findById(body.foodId);
          if (!foodFromDb) {
            return apiError('Food not found in database', 404, 'ERR_NOT_FOUND');
          }
        } catch (error) {
          return handleApiError(error, 'Error retrieving food from database');
        }
      }
      
      // Validate amount with safe parsing
      let amount = 100; // Default 100g/ml
      if (body.amount !== undefined) {
        if (typeof body.amount === 'string') {
          amount = parseFloat(body.amount);
        } else if (typeof body.amount === 'number') {
          amount = body.amount;
        }
        
        if (isNaN(amount) || amount <= 0) {
          amount = 100; // Default if invalid
        }
      }
      
      // Create food entry based on provided data
      let foodEntry;
      
      if (foodFromDb) {
        // Use food from database with amount adjustment
        
        // Base serving size from database
        const baseServing = foodFromDb.servingSize || 100;
        
        // Calculate nutrients based on amount relative to serving size
        const ratio = amount / baseServing;
        
        foodEntry = {
          foodId: foodFromDb._id,
          name: foodFromDb.name,
          amount,
          unit: foodFromDb.servingUnit || 'g',
          protein: roundToDecimal(foodFromDb.protein * ratio, 2),
          carbs: roundToDecimal(foodFromDb.carbs * ratio, 2),
          fat: roundToDecimal(foodFromDb.fat * ratio, 2),
          calories: roundToDecimal(foodFromDb.calories * ratio, 2),
          serving: {
            size: foodFromDb.servingSize || 100,
            unit: foodFromDb.servingUnit || 'g'
          }
        };
      } else {
        // Create custom food entry
        
        // Validate name
        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
          return apiError('Food name is required', 400, 'ERR_VALIDATION');
        }
        
        // Validate nutritional values with safe parsing
        let protein = 0;
        let carbs = 0;
        let fat = 0;
        let calories = 0;
        
        // Parse protein
        if (body.protein !== undefined) {
          protein = parseNutrientValue(body.protein);
        }
        
        // Parse carbs
        if (body.carbs !== undefined) {
          carbs = parseNutrientValue(body.carbs);
        }
        
        // Parse fat
        if (body.fat !== undefined) {
          fat = parseNutrientValue(body.fat);
        }
        
        // Parse calories
        if (body.calories !== undefined) {
          calories = parseNutrientValue(body.calories);
        }
        
        // Calculate calories if not provided
        if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
          calories = Math.round((protein * 4) + (carbs * 4) + (fat * 9));
        }
        
        // Prepare serving information
        const serving = {
          size: 100,
          unit: 'g'
        };
        
        if (body.serving && typeof body.serving === 'object') {
          if (body.serving.size !== undefined) {
            const size = parseFloat(String(body.serving.size));
            if (!isNaN(size) && size > 0) {
              serving.size = size;
            }
          }
          
          if (body.serving.unit !== undefined && typeof body.serving.unit === 'string') {
            const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];
            const unit = body.serving.unit.toLowerCase().trim();
            
            if (validUnits.includes(unit)) {
              serving.unit = unit;
            }
          }
        }
        
        foodEntry = {
          name: body.name.trim(),
          amount,
          unit: body.unit || serving.unit,
          protein,
          carbs,
          fat,
          calories,
          serving
        };
      }
      
      // Add food to meal with defensive error handling
      try {
        // Ensure foods array exists
        if (!Array.isArray(meal.foods)) {
          meal.foods = [];
        }
        
        // Add new food
        meal.foods.push(foodEntry);
        
        // Save the meal
        await meal.save();
      } catch (error) {
        return handleApiError(error, 'Error adding food to meal');
      }
      
      // Calculate new index
      const newIndex = meal.foods.length - 1;
      
      // Create food response using converter
      const foodResponse = convertMealFoodToResponse(foodEntry, newIndex);
      
      return apiResponse({
        food: foodResponse,
        mealId: mealId,
        index: newIndex
      }, true, 'Food added to meal successfully', 201);
    } catch (error) {
      return handleApiError(error, "Error adding food to meal");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/meals/[id]/foods
 * Replace all foods in a meal
 */
export const PUT = withAuth<{ foods: MealFoodData[], count: number, totals: IMealTotals, mealId: string }, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { params } = context || {};
      
      if (!params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const mealId = params.id;
      
      if (!isValidObjectId(mealId)) {
        return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body with defensive error handling
      let body;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate foods array
      if (!body.foods || !Array.isArray(body.foods)) {
        return apiError('Foods must be provided as an array', 400, 'ERR_VALIDATION');
      }
      
      // Get existing meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(mealId);
        
        if (!meal) {
          return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving meal from database');
      }
      
      // Check if user has permission to update this meal
      if (meal.userId && meal.userId.toString() !== userId) {
        return apiError('You do not have permission to update this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Process each food with validation
      const processedFoods = [];
      const errors = [];
      
      for (const food of body.foods) {
        try {
          if (!food || typeof food !== 'object') {
            errors.push('Skipped invalid food entry');
            continue;
          }
          
          // Validate name
          if (!food.name || typeof food.name !== 'string' || food.name.trim() === '') {
            errors.push('Skipped food with missing or invalid name');
            continue;
          }
          
          // Validate amount with safe parsing
          let amount = 100; // Default 100g/ml
          if (food.amount !== undefined) {
            amount = parseNutrientValue(food.amount, 100);
          }
          
          // Validate nutritional values with safe parsing
          const protein = parseNutrientValue(food.protein);
          const carbs = parseNutrientValue(food.carbs);
          const fat = parseNutrientValue(food.fat);
          let calories = parseNutrientValue(food.calories);
          
          // Calculate calories if not provided
          if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
            calories = Math.round((protein * 4) + (carbs * 4) + (fat * 9));
          }
          
          // Prepare serving information
          const serving = {
            size: 100,
            unit: 'g'
          };
          
          if (food.serving && typeof food.serving === 'object') {
            if (food.serving.size !== undefined) {
              const size = parseFloat(String(food.serving.size));
              if (!isNaN(size) && size > 0) {
                serving.size = size;
              }
            }
            
            if (food.serving.unit !== undefined && typeof food.serving.unit === 'string') {
              const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];
              const unit = food.serving.unit.toLowerCase().trim();
              
              if (validUnits.includes(unit)) {
                serving.unit = unit;
              }
            }
          }
          
          // Create food entry
          const foodEntry: any = {
            name: food.name.trim(),
            amount,
            unit: food.unit || serving.unit,
            protein,
            carbs,
            fat,
            calories,
            serving
          };
          
          // Add foodId if valid
          if (food.foodId && isValidObjectId(food.foodId)) {
            foodEntry.foodId = new mongoose.Types.ObjectId(food.foodId);
          }
          
          processedFoods.push(foodEntry);
        } catch (error) {
          console.error('Error processing food entry:', error);
          errors.push('Error processing food: ' + ((error as Error)?.message || 'Unknown error'));
        }
      }
      
      // Update meal with new foods
      try {
        meal.foods = processedFoods;
        await meal.save();
      } catch (error) {
        return handleApiError(error, 'Error updating foods in meal');
      }
      
      // Calculate meal nutritional totals
      const mealTotals = {
        protein: 0,
        carbs: 0,
        fat: 0,
        calories: 0
      };
      
      for (const food of processedFoods) {
        mealTotals.protein += food.protein || 0;
        mealTotals.carbs += food.carbs || 0;
        mealTotals.fat += food.fat || 0;
        mealTotals.calories += food.calories || 0;
      }
      
      // Round totals for consistency
      mealTotals.protein = Math.round(mealTotals.protein * 10) / 10;
      mealTotals.carbs = Math.round(mealTotals.carbs * 10) / 10;
      mealTotals.fat = Math.round(mealTotals.fat * 10) / 10;
      mealTotals.calories = Math.round(mealTotals.calories);
      
      // Format response using converter
      const responseData = {
        mealId,
        foods: processedFoods.map((food, index) => convertMealFoodToResponse(food, index)),
        count: processedFoods.length,
        totals: mealTotals,
        errors: errors.length > 0 ? errors : undefined
      };
      
      return apiResponse(responseData, true, 'Meal foods updated successfully');
    } catch (error) {
      return handleApiError(error, "Error updating meal foods");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * Helper function to round to decimal places
 */
function roundToDecimal(value: number, places: number): number {
  if (isNaN(value)) return 0;
  const multiplier = Math.pow(10, places);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Helper function to safely parse nutrient values
 */
function parseNutrientValue(value: any, defaultValue = 0): number {
  if (value === undefined || value === null) return defaultValue;
  
  let parsedValue: number;
  if (typeof value === 'string') {
    parsedValue = parseFloat(value);
  } else if (typeof value === 'number') {
    parsedValue = value;
  } else {
    return defaultValue;
  }
  
  return !isNaN(parsedValue) && parsedValue >= 0 ? parsedValue : defaultValue;
}