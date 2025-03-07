// src/app/api/meals/[id]/foods/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';;
import Meal from "@/models/Meal";
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose, { isValidObjectId } from "mongoose";

/**
 * GET /api/meals/[id]/foods
 * Get all foods in a meal
 */
export const GET = withAuth<ResponseType['data'], { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const id = context.params.id;
    
    if (!mealId || typeof mealId !== 'string') {
      return apiError('Meal ID is required', 400, 'ERR_VALIDATION');
    }
    
    // Check if ID is valid MongoDB ObjectId
    if (!isValidObjectId(mealId)) {
      return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
    }
    
    // Get meal with defensive error handling
    let meal;
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
      for (const food of meal.foods) {
        try {
          // Safely add food nutritional values
          mealTotals.protein += food.protein || 0;
          mealTotals.carbs += food.carbs || 0;
          mealTotals.fat += food.fat || 0;
          mealTotals.calories += food.calories || 0;
          
          // Add processed food
          processedFoods.push({
            index: processedFoods.length, // Add index for reference
            foodId: food.foodId ? food.foodId.toString() : undefined,
            name: food.name || 'Unknown Food',
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fat: food.fat || 0,
            calories: food.calories || 0,
            amount: food.amount || 0,
            // Include serving info if available
            serving: food.serving || undefined
          });
        } catch (error) {
          console.error('Error processing food in meal:', error);
          // Add minimal food data as fallback
          processedFoods.push({
            index: processedFoods.length,
            foodId: food.foodId ? food.foodId.toString() : undefined,
            name: food.name || 'Unknown Food',
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fat: food.fat || 0,
            calories: food.calories || 0,
            amount: food.amount || 0
          });
        }
      }
    }
    
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
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/meals/[id]/foods
 * Add a new food to a meal
 */
export const POST = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Validate meal ID from params
    const mealId = params?.id;
    
    if (!mealId || typeof mealId !== 'string') {
      return apiError('Meal ID is required', 400, 'ERR_VALIDATION');
    }
    
    // Check if ID is valid MongoDB ObjectId
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
    
    // Validate body
    if (!body || typeof body !== 'object') {
      return apiError('Invalid food data', 400, 'ERR_INVALID_DATA');
    }
    
    // Get existing meal with defensive error handling
    let meal;
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
    let foodFromDb = null;
    
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
      const baseServing = foodFromDb.serving?.size || 100;
      
      // Calculate nutrients based on amount relative to serving size
      const ratio = amount / baseServing;
      
      foodEntry = {
        foodId: foodFromDb._id,
        name: foodFromDb.name,
        amount,
        protein: roundToDecimal(foodFromDb.protein * ratio, 2),
        carbs: roundToDecimal(foodFromDb.carbs * ratio, 2),
        fat: roundToDecimal(foodFromDb.fat * ratio, 2),
        calories: roundToDecimal(foodFromDb.calories * ratio, 2),
        serving: {
          size: foodFromDb.serving?.size || 100,
          unit: foodFromDb.serving?.unit || 'g'
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
        if (typeof body.protein === 'string') {
          protein = parseFloat(body.protein);
        } else if (typeof body.protein === 'number') {
          protein = body.protein;
        }
        
        if (isNaN(protein) || protein < 0) {
          protein = 0;
        }
      }
      
      // Parse carbs
      if (body.carbs !== undefined) {
        if (typeof body.carbs === 'string') {
          carbs = parseFloat(body.carbs);
        } else if (typeof body.carbs === 'number') {
          carbs = body.carbs;
        }
        
        if (isNaN(carbs) || carbs < 0) {
          carbs = 0;
        }
      }
      
      // Parse fat
      if (body.fat !== undefined) {
        if (typeof body.fat === 'string') {
          fat = parseFloat(body.fat);
        } else if (typeof body.fat === 'number') {
          fat = body.fat;
        }
        
        if (isNaN(fat) || fat < 0) {
          fat = 0;
        }
      }
      
      // Parse calories
      if (body.calories !== undefined) {
        if (typeof body.calories === 'string') {
          calories = parseFloat(body.calories);
        } else if (typeof body.calories === 'number') {
          calories = body.calories;
        }
        
        if (isNaN(calories) || calories < 0) {
          calories = 0;
        }
      }
      
      // Calculate calories if not provided
      if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
        calories = (protein * 4) + (carbs * 4) + (fat * 9);
      }
      
      // Prepare serving information
      const serving = {
        size: 100,
        unit: 'g'
      };
      
      if (body.serving && typeof body.serving === 'object') {
        if (body.serving.size !== undefined) {
          const size = parseFloat(body.serving.size);
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
    
    return apiResponse({
      food: {
        ...foodEntry,
        index: newIndex,
        foodId: foodEntry.foodId ? foodEntry.foodId.toString() : undefined
      },
      mealId: mealId,
      index: newIndex
    }, true, 'Food added to meal successfully', 201);
  } catch (error) {
    return handleApiError(error, "Error adding food to meal");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PUT /api/meals/[id]/foods
 * Replace all foods in a meal
 */
export const PUT = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Validate meal ID from params
    const mealId = params?.id;
    
    if (!mealId || typeof mealId !== 'string') {
      return apiError('Meal ID is required', 400, 'ERR_VALIDATION');
    }
    
    // Check if ID is valid MongoDB ObjectId
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
    let meal;
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
          if (typeof food.amount === 'string') {
            amount = parseFloat(food.amount);
          } else if (typeof food.amount === 'number') {
            amount = food.amount;
          }
          
          if (isNaN(amount) || amount <= 0) {
            amount = 100; // Default if invalid
          }
        }
        
        // Validate nutritional values with safe parsing
        let protein = 0;
        let carbs = 0;
        let fat = 0;
        let calories = 0;
        
        // Parse protein
        if (food.protein !== undefined) {
          if (typeof food.protein === 'string') {
            protein = parseFloat(food.protein);
          } else if (typeof food.protein === 'number') {
            protein = food.protein;
          }
          
          if (isNaN(protein) || protein < 0) {
            protein = 0;
          }
        }
        
        // Parse carbs
        if (food.carbs !== undefined) {
          if (typeof food.carbs === 'string') {
            carbs = parseFloat(food.carbs);
          } else if (typeof food.carbs === 'number') {
            carbs = food.carbs;
          }
          
          if (isNaN(carbs) || carbs < 0) {
            carbs = 0;
          }
        }
        
        // Parse fat
        if (food.fat !== undefined) {
          if (typeof food.fat === 'string') {
            fat = parseFloat(food.fat);
          } else if (typeof food.fat === 'number') {
            fat = food.fat;
          }
          
          if (isNaN(fat) || fat < 0) {
            fat = 0;
          }
        }
        
        // Parse calories
        if (food.calories !== undefined) {
          if (typeof food.calories === 'string') {
            calories = parseFloat(food.calories);
          } else if (typeof food.calories === 'number') {
            calories = food.calories;
          }
          
          if (isNaN(calories) || calories < 0) {
            calories = 0;
          }
        }
        
        // Calculate calories if not provided
        if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
          calories = (protein * 4) + (carbs * 4) + (fat * 9);
        }
        
        // Prepare serving information
        const serving = {
          size: 100,
          unit: 'g'
        };
        
        if (food.serving && typeof food.serving === 'object') {
          if (food.serving.size !== undefined) {
            const size = parseFloat(food.serving.size);
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
        errors.push('Error processing food: ' + (error.message || 'Unknown error'));
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
    
    // Format response
    const responseData = {
      mealId,
      foods: processedFoods.map((food, index) => ({
        ...food,
        index,
        foodId: food.foodId ? food.foodId.toString() : undefined
      })),
      count: processedFoods.length,
      totals: mealTotals,
      errors: errors.length > 0 ? errors : undefined
    };
    
    return apiResponse(responseData, true, 'Meal foods updated successfully');
  } catch (error) {
    return handleApiError(error, "Error updating meal foods");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * Helper function to round to decimal places
 */
function roundToDecimal(value: number, places: number): number {
  if (isNaN(value)) return 0;
  const multiplier = Math.pow(10, places);
  return Math.round(value * multiplier) / multiplier;
}