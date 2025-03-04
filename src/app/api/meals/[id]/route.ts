export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// GET - Fetch a single meal by ID
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
    
    // Find the meal with proper error handling
    try {
      const meal = await Meal.findById(mealId);
      
      // Check if meal exists
      if (!meal) {
        return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if user has permission to view this meal
      const mealUserId = meal.userId ? meal.userId.toString() : '';
      if (mealUserId !== userId.toString()) {
        return apiError('You do not have permission to view this meal', 403, 'ERR_FORBIDDEN');
      }
      
      return apiResponse(meal);
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.CastError) {
        return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
      }
      return handleApiError(dbError, 'Error fetching meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}, AuthLevel.DEV_OPTIONAL);

// DELETE - Delete a specific meal by ID
export const DELETE = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
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
      // First check if the meal exists and belongs to the user
      const meal = await Meal.findById(mealId);
      
      if (!meal) {
        return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Verify ownership with defensive string comparison
      const mealUserId = meal.userId ? meal.userId.toString() : '';
      if (mealUserId !== userId.toString()) {
        return apiError('You do not have permission to delete this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Delete the meal
      const result = await Meal.deleteOne({ _id: mealId });
      
      // Check if anything was actually deleted
      if (!result || result.deletedCount === 0) {
        return apiError('Meal could not be deleted', 500, 'ERR_DELETE_FAILED');
      }
      
      return apiResponse(null, true, 'Meal deleted successfully');
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.CastError) {
        return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
      }
      return handleApiError(dbError, 'Error deleting meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing delete request');
  }
}, AuthLevel.DEV_OPTIONAL);

// PATCH - Update a specific meal by ID
export const PATCH = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
  try {
    await dbConnect();
    
    // Validate meal ID from params
    const mealId = params?.id;
    
    if (!mealId || typeof mealId !== 'string' || mealId.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Parse and validate request body
    let updateData;
    try {
      updateData = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body is an object
    if (!updateData || typeof updateData !== 'object') {
      return apiError('Invalid request body', 400, 'ERR_INVALID_FORMAT');
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
      
      // Validate update data fields
      const sanitizedUpdate: any = {};
      
      // Validate name if provided
      if ('name' in updateData) {
        if (typeof updateData.name !== 'string' || updateData.name.trim() === '') {
          return apiError('Meal name cannot be empty', 400, 'ERR_VALIDATION');
        }
        sanitizedUpdate.name = updateData.name.trim();
      }
      
      // Validate date if provided
      if ('date' in updateData) {
        try {
          const dateObj = new Date(updateData.date);
          if (isNaN(dateObj.getTime())) {
            return apiError('Invalid date format', 400, 'ERR_VALIDATION');
          }
          sanitizedUpdate.date = dateObj;
        } catch (error) {
          return apiError('Invalid date format', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate time format if provided
      if ('time' in updateData) {
        if (typeof updateData.time !== 'string' || 
            !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updateData.time)) {
          return apiError('Time must be in HH:MM format', 400, 'ERR_VALIDATION');
        }
        sanitizedUpdate.time = updateData.time;
      }
      
      // Validate notes if provided
      if ('notes' in updateData) {
        sanitizedUpdate.notes = typeof updateData.notes === 'string' 
          ? updateData.notes.trim() 
          : '';
      }
      
      // Validate foods array if provided
      if ('foods' in updateData) {
        if (!Array.isArray(updateData.foods)) {
          return apiError('Foods must be an array', 400, 'ERR_VALIDATION');
        }
        
        // Create validated foods array
        const validatedFoods = [];
        
        // Validate each food item
        for (const food of updateData.foods) {
          // Check if food is an object
          if (!food || typeof food !== 'object') {
            return apiError('Each food item must be an object', 400, 'ERR_VALIDATION');
          }
          
          // Validate required fields
          if (!food.name || typeof food.name !== 'string' || food.name.trim() === '') {
            return apiError('Each food item must have a name', 400, 'ERR_VALIDATION');
          }
          
          // Validate amount is a positive number
          let amount = 0;
          try {
            amount = Number(food.amount);
            if (isNaN(amount) || amount < 0) {
              return apiError('Each food item must have a valid amount', 400, 'ERR_VALIDATION');
            }
          } catch (error) {
            return apiError('Each food item must have a valid amount', 400, 'ERR_VALIDATION');
          }
          
          // Create sanitized food object
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
          
          validatedFoods.push(sanitizedFood);
        }
        
        sanitizedUpdate.foods = validatedFoods;
      }
      
      // Ensure we don't accidentally allow userId changes
      if ('userId' in updateData) {
        delete updateData.userId;
      }
      
      // Update the meal with validation
      const updatedMeal = await Meal.findByIdAndUpdate(
        mealId,
        { $set: sanitizedUpdate },
        { 
          new: true,
          runValidators: true,
          context: 'query'
        }
      );
      
      // Verify the update succeeded
      if (!updatedMeal) {
        return apiError('Failed to update meal', 500, 'ERR_UPDATE_FAILED');
      }
      
      return apiResponse(updatedMeal, true, 'Meal updated successfully');
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.CastError) {
        return apiError('Invalid data format', 400, 'ERR_INVALID_FORMAT');
      }
      if (dbError instanceof mongoose.Error.ValidationError) {
        const errorMessage = Object.values(dbError.errors)
          .map(err => err.message)
          .join(', ');
        return apiError(`Validation error: ${errorMessage}`, 400, 'ERR_VALIDATION');
      }
      return handleApiError(dbError, 'Error updating meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing update request');
  }
}, AuthLevel.DEV_OPTIONAL);