export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// DELETE - Remove a food item from a meal by index
export const DELETE = withAuth(async (
  req: NextRequest, 
  userId, 
  { params }: { params: { id: string; index: string } }
) => {
  try {
    await dbConnect();
    
    // Validate meal ID and food index
    const { id: mealId, index: foodIndexStr } = params || {};
    
    if (!mealId || typeof mealId !== 'string' || mealId.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Validate food index with defensive parsing
    let foodIndex = -1;
    try {
      foodIndex = parseInt(foodIndexStr, 10);
      if (isNaN(foodIndex) || foodIndex < 0) {
        return apiError('Invalid food index', 400, 'ERR_INVALID_INDEX');
      }
    } catch (error) {
      return apiError('Invalid food index', 400, 'ERR_INVALID_INDEX');
    }
    
    try {
      // First verify the meal exists and user has permission to update it
      const existingMeal = await Meal.findById(mealId);
      
      if (!existingMeal) {
        return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Verify ownership with defensive string comparison
      const mealUserId = existingMeal.userId ? existingMeal.userId.toString() : '';
      if (mealUserId !== userId.toString()) {
        return apiError('You do not have permission to update this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Check if food index exists in foods array
      const foods = Array.isArray(existingMeal.foods) ? existingMeal.foods : [];
      
      if (foodIndex >= foods.length) {
        return apiError('Food item not found at specified index', 404, 'ERR_NOT_FOUND');
      }
      
      // Create a new foods array without the item at the specified index
      const updatedFoods = [...foods];
      updatedFoods.splice(foodIndex, 1);
      
      // Update the meal with the modified foods array
      const updatedMeal = await Meal.findByIdAndUpdate(
        mealId,
        { foods: updatedFoods },
        {
          new: true,
          runValidators: true
        }
      );
      
      if (!updatedMeal) {
        return apiError('Failed to update meal', 500, 'ERR_UPDATE_FAILED');
      }
      
      return apiResponse(updatedMeal, true, 'Food removed from meal successfully');
    } catch (dbError) {
      return handleApiError(dbError, 'Error removing food from meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}, AuthLevel.DEV_OPTIONAL);

// PATCH - Update a food item in a meal by index
export const PATCH = withAuth(async (
  req: NextRequest, 
  userId, 
  { params }: { params: { id: string; index: string } }
) => {
  try {
    await dbConnect();
    
    // Validate meal ID and food index
    const { id: mealId, index: foodIndexStr } = params || {};
    
    if (!mealId || typeof mealId !== 'string' || mealId.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Validate food index with defensive parsing
    let foodIndex = -1;
    try {
      foodIndex = parseInt(foodIndexStr, 10);
      if (isNaN(foodIndex) || foodIndex < 0) {
        return apiError('Invalid food index', 400, 'ERR_INVALID_INDEX');
      }
    } catch (error) {
      return apiError('Invalid food index', 400, 'ERR_INVALID_INDEX');
    }
    
    // Parse and validate update data
    let updateData;
    try {
      updateData = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate update data is an object
    if (!updateData || typeof updateData !== 'object') {
      return apiError('Invalid food update data', 400, 'ERR_INVALID_FORMAT');
    }
    
    try {
      // First verify the meal exists and user has permission to update it
      const existingMeal = await Meal.findById(mealId);
      
      if (!existingMeal) {
        return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Verify ownership with defensive string comparison
      const mealUserId = existingMeal.userId ? existingMeal.userId.toString() : '';
      if (mealUserId !== userId.toString()) {
        return apiError('You do not have permission to update this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Check if food index exists in foods array
      const foods = Array.isArray(existingMeal.foods) ? existingMeal.foods : [];
      
      if (foodIndex >= foods.length) {
        return apiError('Food item not found at specified index', 404, 'ERR_NOT_FOUND');
      }
      
      // Get the existing food item
      const existingFood = foods[foodIndex];
      
      // Create updated food object with defensive number parsing
      const updatedFood = {
        ...existingFood,
        name: typeof updateData.name === 'string' && updateData.name.trim() !== '' 
          ? updateData.name.trim() 
          : existingFood.name,
          
        amount: typeof updateData.amount === 'number' && updateData.amount >= 0
          ? updateData.amount
          : (typeof updateData.amount === 'string' 
              ? Math.max(0, Number(updateData.amount) || existingFood.amount)
              : existingFood.amount),
              
        unit: typeof updateData.unit === 'string' && updateData.unit.trim() !== ''
          ? updateData.unit.trim()
          : existingFood.unit,
          
        protein: typeof updateData.protein === 'number'
          ? Math.max(0, updateData.protein)
          : (typeof updateData.protein === 'string'
              ? Math.max(0, Number(updateData.protein) || existingFood.protein)
              : existingFood.protein),
              
        carbs: typeof updateData.carbs === 'number'
          ? Math.max(0, updateData.carbs)
          : (typeof updateData.carbs === 'string'
              ? Math.max(0, Number(updateData.carbs) || existingFood.carbs)
              : existingFood.carbs),
              
        fat: typeof updateData.fat === 'number'
          ? Math.max(0, updateData.fat)
          : (typeof updateData.fat === 'string'
              ? Math.max(0, Number(updateData.fat) || existingFood.fat)
              : existingFood.fat),
              
        calories: typeof updateData.calories === 'number'
          ? Math.max(0, updateData.calories)
          : (typeof updateData.calories === 'string'
              ? Math.max(0, Number(updateData.calories) || existingFood.calories)
              : existingFood.calories),
      };
      
      // Preserve foodId if it exists
      if (existingFood.foodId) {
        updatedFood.foodId = existingFood.foodId;
      }
      
      // If updateData contains a new foodId and it's valid, use it
      if (updateData.foodId && mongoose.Types.ObjectId.isValid(updateData.foodId)) {
        updatedFood.foodId = updateData.foodId;
      }
      
      // Create a new foods array with the updated item
      const updatedFoods = [...foods];
      updatedFoods[foodIndex] = updatedFood;
      
      // Update the meal with the modified foods array
      const updatedMeal = await Meal.findByIdAndUpdate(
        mealId,
        { foods: updatedFoods },
        {
          new: true,
          runValidators: true
        }
      );
      
      if (!updatedMeal) {
        return apiError('Failed to update meal', 500, 'ERR_UPDATE_FAILED');
      }
      
      return apiResponse(updatedMeal, true, 'Food updated successfully');
    } catch (dbError) {
      return handleApiError(dbError, 'Error updating food in meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}, AuthLevel.DEV_OPTIONAL);

// GET - Get a specific food item from a meal by index
export const GET = withAuth(async (
  req: NextRequest, 
  userId, 
  { params }: { params: { id: string; index: string } }
) => {
  try {
    await dbConnect();
    
    // Validate meal ID and food index
    const { id: mealId, index: foodIndexStr } = params || {};
    
    if (!mealId || typeof mealId !== 'string' || mealId.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Validate food index with defensive parsing
    let foodIndex = -1;
    try {
      foodIndex = parseInt(foodIndexStr, 10);
      if (isNaN(foodIndex) || foodIndex < 0) {
        return apiError('Invalid food index', 400, 'ERR_INVALID_INDEX');
      }
    } catch (error) {
      return apiError('Invalid food index', 400, 'ERR_INVALID_INDEX');
    }
    
    try {
      // Find the meal
      const meal = await Meal.findById(mealId);
      
      if (!meal) {
        return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Verify ownership with defensive string comparison
      const mealUserId = meal.userId ? meal.userId.toString() : '';
      if (mealUserId !== userId.toString()) {
        return apiError('You do not have permission to view this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Check if food index exists in foods array
      const foods = Array.isArray(meal.foods) ? meal.foods : [];
      
      if (foodIndex >= foods.length) {
        return apiError('Food item not found at specified index', 404, 'ERR_NOT_FOUND');
      }
      
      // Return the food item
      return apiResponse({
        mealId,
        mealName: meal.name,
        foodIndex,
        food: foods[foodIndex]
      });
    } catch (dbError) {
      return handleApiError(dbError, 'Error fetching food from meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}, AuthLevel.DEV_OPTIONAL);