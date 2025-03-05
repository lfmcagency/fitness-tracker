// src/app/api/meals/[id]/foods/[index]/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db/mongodb';
import Meal from "@/models/Meal";
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose, { isValidObjectId } from "mongoose";

/**
 * GET /api/meals/[id]/foods/[index]
 * Get a specific food from a meal by index
 */
export const GET = withAuth(async (req: NextRequest, userId, { params }) => {
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
    
    // Validate food index from params
    const foodIndex = params?.index;
    let parsedIndex: number;
    
    try {
      parsedIndex = parseInt(foodIndex);
      if (isNaN(parsedIndex) || parsedIndex < 0) {
        return apiError('Food index must be a non-negative integer', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Invalid food index', 400, 'ERR_VALIDATION');
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
    
    // Check if food exists at the specified index
    if (!Array.isArray(meal.foods) || parsedIndex >= meal.foods.length) {
      return apiError('Food not found at specified index', 404, 'ERR_NOT_FOUND');
    }
    
    // Get the food
    const food = meal.foods[parsedIndex];
    
    // Format food response with defensive transformation
    let foodResponse;
    try {
      const foodObj = food.toObject ? food.toObject() : food;
      foodResponse = {
        ...foodObj,
        index: parsedIndex,
        foodId: foodObj.foodId ? foodObj.foodId.toString() : undefined,
        // Ensure critical fields exist
        name: foodObj.name || 'Unknown Food',
        protein: foodObj.protein || 0,
        carbs: foodObj.carbs || 0,
        fat: foodObj.fat || 0,
        calories: foodObj.calories || 0,
        amount: foodObj.amount || 0
      };
    } catch (error) {
      console.error('Error formatting food response:', error);
      // Fallback with minimal data
      foodResponse = {
        index: parsedIndex,
        foodId: food.foodId ? food.foodId.toString() : undefined,
        name: food.name || 'Unknown Food',
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        calories: food.calories || 0,
        amount: food.amount || 0
      };
    }
    
    return apiResponse(foodResponse, true, 'Food retrieved successfully');
  } catch (error) {
    return handleApiError(error, "Error retrieving food from meal");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PUT /api/meals/[id]/foods/[index]
 * Update a specific food in a meal by index
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
    
    // Validate food index from params
    const foodIndex = params?.index;
    let parsedIndex: number;
    
    try {
      parsedIndex = parseInt(foodIndex);
      if (isNaN(parsedIndex) || parsedIndex < 0) {
        return apiError('Food index must be a non-negative integer', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Invalid food index', 400, 'ERR_VALIDATION');
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
    
    // Check if food exists at the specified index
    if (!Array.isArray(meal.foods) || parsedIndex >= meal.foods.length) {
      return apiError('Food not found at specified index', 404, 'ERR_NOT_FOUND');
    }
    
    // Create update object with validated fields
    const updates: any = {};
    
    // Validate and update from food database if foodId provided
    let foodFromDb = null;
    if (body.foodId && body.foodId !== meal.foods[parsedIndex].foodId?.toString()) {
      if (!isValidObjectId(body.foodId)) {
        return apiError('Invalid food ID format', 400, 'ERR_VALIDATION');
      }
      
      // Try to find the food in database
      try {
        foodFromDb = await Food.findById(body.foodId);
        if (!foodFromDb) {
          return apiError('Food not found in database', 404, 'ERR_NOT_FOUND');
        }
        updates.foodId = new mongoose.Types.ObjectId(body.foodId);
      } catch (error) {
        return handleApiError(error, 'Error retrieving food from database');
      }
    }
    
    // Validate and update name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return apiError('Food name must be a non-empty string', 400, 'ERR_VALIDATION');
      }
      updates.name = body.name.trim();
    }
    
    // Validate and update amount with safe parsing
    if (body.amount !== undefined) {
      let amount;
      if (typeof body.amount === 'string') {
        amount = parseFloat(body.amount);
      } else if (typeof body.amount === 'number') {
        amount = body.amount;
      } else {
        return apiError('Amount must be a number', 400, 'ERR_VALIDATION');
      }
      
      if (isNaN(amount) || amount <= 0) {
        return apiError('Amount must be a positive number', 400, 'ERR_VALIDATION');
      }
      updates.amount = amount;
    }
    
    // If we have a food from database and amount has changed, recalculate nutrients
    if (foodFromDb && (updates.amount !== undefined || foodFromDb._id.toString() !== meal.foods[parsedIndex].foodId?.toString())) {
      // Get amount from updates or existing food
      const amount = updates.amount !== undefined ? updates.amount : meal.foods[parsedIndex].amount || 100;
      
      // Base serving size from database
      const baseServing = foodFromDb.serving?.size || 100;
      
      // Calculate nutrients based on amount relative to serving size
      const ratio = amount / baseServing;
      
      updates.protein = roundToDecimal(foodFromDb.protein * ratio, 2);
      updates.carbs = roundToDecimal(foodFromDb.carbs * ratio, 2);
      updates.fat = roundToDecimal(foodFromDb.fat * ratio, 2);
      updates.calories = roundToDecimal(foodFromDb.calories * ratio, 2);
      updates.serving = {
        size: foodFromDb.serving?.size || 100,
        unit: foodFromDb.serving?.unit || 'g'
      };
    } else {
      // Handle manual nutrient updates
      
      // Validate protein
      if (body.protein !== undefined) {
        let protein;
        if (typeof body.protein === 'string') {
          protein = parseFloat(body.protein);
        } else if (typeof body.protein === 'number') {
          protein = body.protein;
        } else {
          return apiError('Protein must be a number', 400, 'ERR_VALIDATION');
        }
        
        if (isNaN(protein) || protein < 0) {
          return apiError('Protein must be a non-negative number', 400, 'ERR_VALIDATION');
        }
        updates.protein = protein;
      }
      
      // Validate carbs
      if (body.carbs !== undefined) {
        let carbs;
        if (typeof body.carbs === 'string') {
          carbs = parseFloat(body.carbs);
        } else if (typeof body.carbs === 'number') {
          carbs = body.carbs;
        } else {
          return apiError('Carbs must be a number', 400, 'ERR_VALIDATION');
        }
        
        if (isNaN(carbs) || carbs < 0) {
          return apiError('Carbs must be a non-negative number', 400, 'ERR_VALIDATION');
        }
        updates.carbs = carbs;
      }
      
      // Validate fat
      if (body.fat !== undefined) {
        let fat;
        if (typeof body.fat === 'string') {
          fat = parseFloat(body.fat);
        } else if (typeof body.fat === 'number') {
          fat = body.fat;
        } else {
          return apiError('Fat must be a number', 400, 'ERR_VALIDATION');
        }
        
        if (isNaN(fat) || fat < 0) {
          return apiError('Fat must be a non-negative number', 400, 'ERR_VALIDATION');
        }
        updates.fat = fat;
      }
      
      // Validate calories
      if (body.calories !== undefined) {
        let calories;
        if (typeof body.calories === 'string') {
          calories = parseFloat(body.calories);
        } else if (typeof body.calories === 'number') {
          calories = body.calories;
        } else {
          return apiError('Calories must be a number', 400, 'ERR_VALIDATION');
        }
        
        if (isNaN(calories) || calories < 0) {
          return apiError('Calories must be a non-negative number', 400, 'ERR_VALIDATION');
        }
        updates.calories = calories;
      }
      
      // Validate serving
      if (body.serving !== undefined) {
        if (typeof body.serving !== 'object' || body.serving === null) {
          return apiError('Serving must be an object', 400, 'ERR_VALIDATION');
        }
        
        const serving: any = {};
        let updateServing = false;
        
        if (body.serving.size !== undefined) {
          let size;
          if (typeof body.serving.size === 'string') {
            size = parseFloat(body.serving.size);
          } else if (typeof body.serving.size === 'number') {
            size = body.serving.size;
          } else {
            return apiError('Serving size must be a number', 400, 'ERR_VALIDATION');
          }
          
          if (isNaN(size) || size <= 0) {
            return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
          }
          serving.size = size;
          updateServing = true;
        }
        
        if (body.serving.unit !== undefined) {
          if (typeof body.serving.unit !== 'string') {
            return apiError('Serving unit must be a string', 400, 'ERR_VALIDATION');
          }
          
          const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];
          const unit = body.serving.unit.toLowerCase().trim();
          
          if (!validUnits.includes(unit)) {
            return apiError(`Invalid serving unit. Valid units: ${validUnits.join(', ')}`, 400, 'ERR_VALIDATION');
          }
          serving.unit = unit;
          updateServing = true;
        }
        
        if (updateServing) {
          // Merge with existing serving data
          updates.serving = {
            ...meal.foods[parsedIndex].serving || { size: 100, unit: 'g' },
            ...serving
          };
        }
      }
    }
    
    // If there are no valid updates, return error
    if (Object.keys(updates).length === 0) {
      return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
    }
    
    // Update food in meal
    try {
      // Apply updates to food at index
      Object.keys(updates).forEach(key => {
        meal.foods[parsedIndex][key] = updates[key];
      });
      
      // Save updated meal
      await meal.save();
    } catch (error) {
      return handleApiError(error, 'Error updating food in meal');
    }
    
    // Get updated food
    const updatedFood = meal.foods[parsedIndex];
    
    // Format response
    let foodResponse;
    try {
      const foodObj = updatedFood.toObject ? updatedFood.toObject() : updatedFood;
      foodResponse = {
        ...foodObj,
        index: parsedIndex,
        foodId: foodObj.foodId ? foodObj.foodId.toString() : undefined,
        // Ensure critical fields exist
        name: foodObj.name || 'Unknown Food',
        protein: foodObj.protein || 0,
        carbs: foodObj.carbs || 0,
        fat: foodObj.fat || 0,
        calories: foodObj.calories || 0,
        amount: foodObj.amount || 0
      };
    } catch (error) {
      console.error('Error formatting updated food response:', error);
      // Fallback with minimal data
      foodResponse = {
        index: parsedIndex,
        foodId: updatedFood.foodId ? updatedFood.foodId.toString() : undefined,
        name: updatedFood.name || 'Unknown Food',
        protein: updatedFood.protein || 0,
        carbs: updatedFood.carbs || 0,
        fat: updatedFood.fat || 0,
        calories: updatedFood.calories || 0,
        amount: updatedFood.amount || 0
      };
    }
    
    return apiResponse(foodResponse, true, 'Food updated successfully');
  } catch (error) {
    return handleApiError(error, "Error updating food in meal");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * DELETE /api/meals/[id]/foods/[index]
 * Remove a specific food from a meal by index
 */
export const DELETE = withAuth(async (req: NextRequest, userId, { params }) => {
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
    
    // Validate food index from params
    const foodIndex = params?.index;
    let parsedIndex: number;
    
    try {
      parsedIndex = parseInt(foodIndex);
      if (isNaN(parsedIndex) || parsedIndex < 0) {
        return apiError('Food index must be a non-negative integer', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Invalid food index', 400, 'ERR_VALIDATION');
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
    
    // Check if food exists at the specified index
    if (!Array.isArray(meal.foods) || parsedIndex >= meal.foods.length) {
      return apiError('Food not found at specified index', 404, 'ERR_NOT_FOUND');
    }
    
    // Store food to return in response
    const removedFood = meal.foods[parsedIndex];
    
    // Remove food from meal
    try {
      meal.foods.splice(parsedIndex, 1);
      await meal.save();
    } catch (error) {
      return handleApiError(error, 'Error removing food from meal');
    }
    
    // Format response
    let foodResponse;
    try {
      const foodObj = removedFood.toObject ? removedFood.toObject() : removedFood;
      foodResponse = {
        ...foodObj,
        index: parsedIndex,
        foodId: foodObj.foodId ? foodObj.foodId.toString() : undefined
      };
    } catch (error) {
      console.error('Error formatting removed food response:', error);
      // Fallback with minimal data
      foodResponse = {
        index: parsedIndex,
        foodId: removedFood.foodId ? removedFood.foodId.toString() : undefined,
        name: removedFood.name || 'Unknown Food'
      };
    }
    
    return apiResponse({
      removed: foodResponse,
      mealId,
      index: parsedIndex,
      remainingFoods: meal.foods.length
    }, true, 'Food removed from meal successfully');
  } catch (error) {
    return handleApiError(error, "Error removing food from meal");
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