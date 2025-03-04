export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// POST - Add a food item to a meal
export const POST = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
  try {
    await dbConnect();
    
    // Validate meal ID
    const mealId = params?.id;
    
    if (!mealId || typeof mealId !== 'string' || mealId.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Parse and validate food data
    let food;
    try {
      food = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate food is an object
    if (!food || typeof food !== 'object') {
      return apiError('Invalid food data', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Validate required food fields
    if (!food.name || typeof food.name !== 'string' || food.name.trim() === '') {
      return apiError('Food name is required', 400, 'ERR_VALIDATION');
    }
    
    // Validate amount is a positive number
    let amount = 0;
    try {
      amount = Number(food.amount);
      if (isNaN(amount) || amount < 0) {
        return apiError('Food amount must be a positive number', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Food amount must be a positive number', 400, 'ERR_VALIDATION');
    }
    
    // Create sanitized food object with defensive number parsing
    const sanitizedFood = {
      name: food.name.trim(),
      amount: amount,
      unit: typeof food.unit === 'string' ? food.unit.trim() : 'g',
      protein: Math.max(0, Number(food.protein) || 0),
      carbs: Math.max(0, Number(food.carbs) || 0),
      fat: Math.max(0, Number(food.fat) || 0),
      calories: Math.max(0, Number(food.calories) || 0)
    };
    
    // Preserve foodId if it exists and is valid
    if (food.foodId && mongoose.Types.ObjectId.isValid(food.foodId)) {
      sanitizedFood.foodId = food.foodId;
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
      
      // Add the food to the meal using findByIdAndUpdate to trigger middleware
      const updatedMeal = await Meal.findByIdAndUpdate(
        mealId,
        { $push: { foods: sanitizedFood } },
        { 
          new: true,
          runValidators: true
        }
      );
      
      if (!updatedMeal) {
        return apiError('Failed to update meal', 500, 'ERR_UPDATE_FAILED');
      }
      
      return apiResponse(updatedMeal, true, 'Food added to meal successfully');
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.ValidationError) {
        const errorMessage = Object.values(dbError.errors)
          .map(err => err.message)
          .join(', ');
        return apiError(`Validation error: ${errorMessage}`, 400, 'ERR_VALIDATION');
      }
      return handleApiError(dbError, 'Error adding food to meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}, AuthLevel.DEV_OPTIONAL);

// GET - Get all foods in a meal
export const GET = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
  try {
    await dbConnect();
    
    // Validate meal ID
    const mealId = params?.id;
    
    if (!mealId || typeof mealId !== 'string' || mealId.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
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
      
      // Return the foods array with a fallback to empty array
      const foods = Array.isArray(meal.foods) ? meal.foods : [];
      
      return apiResponse({
        mealId,
        mealName: meal.name,
        foods: foods,
        count: foods.length,
        totals: meal.totals || { protein: 0, carbs: 0, fat: 0, calories: 0 }
      });
    } catch (dbError) {
      return handleApiError(dbError, 'Error fetching foods from meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}, AuthLevel.DEV_OPTIONAL);