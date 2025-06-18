// src/app/api/foods/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import { FoodData } from "@/types/api/foodResponses";
import { UpdateFoodRequest } from "@/types/api/foodRequests";
import { convertFoodToResponse } from "@/types/converters/foodConverters";
import { IFood } from "@/types/models/food";
import User from "@/models/User";

// Event coordinator integration
import { processEvent, generateToken } from '@/lib/event-coordinator';
import { FoodEvent } from '@/lib/event-coordinator/types';
import { getTodayString } from '@/lib/shared-utilities';

/**
 * GET /api/foods/[id]
 * Get a specific food by ID
 */
export const GET = withAuth<FoodData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const foodId = context.params.id;
      
      if (!foodId || typeof foodId !== 'string') {
        return apiError('Food ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(foodId)) {
        return apiError('Invalid food ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get food with defensive error handling
      let food;
      try {
        food = await Food.findById(foodId) as IFood | null;
        
        if (!food) {
          return apiError('Food not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving food from database');
      }
      
      // Check if user has access to this food
      // Users can only access system foods (userId is null) or their own foods
      if (food.userId && food.userId.toString() !== userId) {
        return apiError('You do not have permission to access this food', 403, 'ERR_FORBIDDEN');
      }
      
      // Convert to response using converter function
      const foodResponse = convertFoodToResponse(food);
      
      return apiResponse(foodResponse, true, 'Food retrieved successfully');
    } catch (error) {
      return handleApiError(error, "Error retrieving food");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/foods/[id]
 * Update a specific food by ID (SAME-DAY VALIDATION)
 */
export const PUT = withAuth<FoodData, { id: string }>(
  async (req: NextRequest, userId, context) => {
    try {
      await dbConnect();
      
      // Validate food ID from params
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }

      const foodId = context.params.id;
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(foodId)) {
        return apiError('Invalid food ID format', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body with defensive error handling
      let body: UpdateFoodRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid food data', 400, 'ERR_INVALID_DATA');
      }
      
      // Get existing food with defensive error handling
      let food;
      try {
        food = await Food.findById(foodId) as IFood | null;
        
        if (!food) {
          return apiError('Food not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving food from database');
      }
      
      // Check if user has permission to update this food
      // Users can only update their own foods, not system foods
      const user = await User.findById(userId);
      const isAdmin = user?.role?.includes('admin');

      if (!isAdmin && (!food.userId || food.userId.toString() !== userId)) {
        return apiError('You do not have permission to update this food', 403, 'ERR_FORBIDDEN');
      }
      
      // 🚨 SAME-DAY VALIDATION FOR USER FOODS
      if (food.userId && !isAdmin) {
        const todayString = getTodayString();
        const foodCreatedDateString = food.createdAt.toISOString().split('T')[0];
        
        if (foodCreatedDateString !== todayString) {
          return apiError(
            `Cannot modify historical data. Food was created on ${foodCreatedDateString}, today is ${todayString}.`,
            403,
            'ERR_HISTORICAL_EDIT'
          );
        }
      }
      
      // Create update object with validated fields
      const updates: any = {};
      
      // Validate and update name if provided
      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim() === '') {
          return apiError('Food name must be a non-empty string', 400, 'ERR_VALIDATION');
        }
        updates.name = body.name.trim();
      }
      
      // Validate and update nutritional values with safe parsing
      
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
      
      // Validate serving data
      if (body.servingSize !== undefined) {
        let servingSize;
        if (typeof body.servingSize === 'string') {
          servingSize = parseFloat(body.servingSize);
        } else if (typeof body.servingSize === 'number') {
          servingSize = body.servingSize;
        } else {
          return apiError('Serving size must be a number', 400, 'ERR_VALIDATION');
        }
        
        if (isNaN(servingSize) || servingSize <= 0) {
          return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
        }
        updates.servingSize = servingSize;
      }
      
      // Validate serving unit
      if (body.servingUnit !== undefined) {
        if (typeof body.servingUnit !== 'string' || body.servingUnit.trim() === '') {
          return apiError('Serving unit must be a non-empty string', 400, 'ERR_VALIDATION');
        }
        
        const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];
        const unit = body.servingUnit.toLowerCase().trim();
        
        if (!validUnits.includes(unit)) {
          return apiError(`Invalid serving unit. Valid units: ${validUnits.join(', ')}`, 400, 'ERR_VALIDATION');
        }
        updates.servingUnit = unit;
      }
      
      // Update category if provided
      if (body.category !== undefined) {
        if (typeof body.category !== 'string') {
          return apiError('Category must be a string', 400, 'ERR_VALIDATION');
        }
        updates.category = body.category.trim() || 'Other';
      }
      
      // Update description if provided
      if (body.description !== undefined) {
        if (typeof body.description !== 'string') {
          return apiError('Description must be a string', 400, 'ERR_VALIDATION');
        }
        updates.description = body.description.trim();
      }
      
      // Update brand if provided
      if (body.brand !== undefined) {
        if (typeof body.brand !== 'string') {
          return apiError('Brand must be a string', 400, 'ERR_VALIDATION');
        }
        updates.brand = body.brand.trim();
      }
      
      // Update barcode if provided
      if (body.barcode !== undefined) {
        if (body.barcode === null) {
          updates.barcode = null;
        } else if (typeof body.barcode === 'string') {
          updates.barcode = body.barcode.trim();
        } else {
          return apiError('Barcode must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // If there are no valid updates, return error
      if (Object.keys(updates).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
      }
      
      // Update food with defensive error handling
      let updatedFood;
      try {
        updatedFood = await Food.findByIdAndUpdate(
          foodId,
          { $set: updates },
          { new: true, runValidators: true }
        ) as IFood | null;
        
        if (!updatedFood) {
          return apiError('Food not found after update', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error updating food in database');
      }
      
      // Convert to response using converter function
      const foodResponse = convertFoodToResponse(updatedFood);
      
      return apiResponse(foodResponse, true, 'Food updated successfully');
    } catch (error) {
      return handleApiError(error, "Error updating food");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/foods/[id]
 * Delete a specific food by ID (SAME-DAY + EVENTS)
 */
export const DELETE = withAuth<{ id: string; token?: string; achievements?: any }, { id: string }>(
  async (req: NextRequest, userId, context) => {
    const token = generateToken();
    
    console.log(`🗑️ [FOOD-DELETE] DELETE started with token: ${token}`);
    
    try {
      await dbConnect();
      
      // Validate food ID from params
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const foodId = context.params.id;
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(foodId)) {
        return apiError('Invalid food ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get food with defensive error handling
      let food;
      try {
        food = await Food.findById(foodId) as IFood | null;
        
        if (!food) {
          return apiError('Food not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving food from database');
      }
      
      // Check if user has permission to delete this food
      // Users can only delete their own foods, not system foods
      const user = await User.findById(userId);
      const isAdmin = user?.role?.includes('admin');
      if (!isAdmin && (!food.userId || food.userId.toString() !== userId)) {
        return apiError('You do not have permission to delete this food', 403, 'ERR_FORBIDDEN');
      }
      
      // 🚨 SAME-DAY VALIDATION FOR USER FOODS
      if (food.userId && !isAdmin) {
        const todayString = getTodayString();
        const foodCreatedDateString = food.createdAt.toISOString().split('T')[0];
        
        if (foodCreatedDateString !== todayString) {
          return apiError(
            `Cannot delete historical data. Food was created on ${foodCreatedDateString}, today is ${todayString}.`,
            403,
            'ERR_HISTORICAL_DELETE'
          );
        }
      }
      
      // Store food data for event before deletion
      const foodForEvent = convertFoodToResponse(food);
      const isSystemFood = food.isSystemFood;
      
      // Delete food with defensive error handling
      try {
        await Food.deleteOne({ _id: foodId });
      } catch (error) {
        return handleApiError(error, 'Error deleting food from database');
      }
      
      // 🚀 FIRE FOOD DELETION EVENT TO COORDINATOR (only for user foods)
      if (!isSystemFood) {
        try {
          console.log('🗑️ [FOOD-DELETE] Firing food_deleted event to coordinator...');
          
          // Get new total food count for user (after deletion)
          const totalFoods = await Food.countDocuments({ userId });
          
          // Build proper FoodEvent for deletion
          const foodEvent: FoodEvent = {
            token,
            userId,
            source: 'trophe',
            action: 'food_deleted',
            timestamp: new Date(),
            metadata: {
              deletedFood: foodForEvent
            },
            foodData: {
              foodId,
              foodName: foodForEvent.name,
              totalFoods, // New count after deletion
              isSystemFood: false
            }
          };
          
          console.log('🗑️ [FOOD-DELETE] Firing food deletion event:', {
            token,
            action: foodEvent.action,
            foodName: foodEvent.foodData.foodName,
            newTotalFoods: foodEvent.foodData.totalFoods
          });
          
          const coordinatorResult = await processEvent(foodEvent);
          
          console.log('🎉 [FOOD-DELETE] Coordinator processing complete:', {
            success: coordinatorResult.success,
            xpAwarded: coordinatorResult.xpAwarded, // Should be negative
            token: coordinatorResult.token
          });
          
          // Build response
          let message = 'Food deleted successfully';
          if (coordinatorResult.xpAwarded && coordinatorResult.xpAwarded < 0) {
            message = `Food deleted (${Math.abs(coordinatorResult.xpAwarded)} XP reversed)`;
          }
          
          return apiResponse({
            id: foodId,
            token,
            achievements: coordinatorResult.achievementsUnlocked
          }, true, message);
          
        } catch (coordinatorError) {
          console.error('💥 [FOOD-DELETE] Coordinator error:', coordinatorError);
          
          // Still return success since food was deleted, but note coordinator failure
          return apiResponse({
            id: foodId,
            token
          }, true, 'Food deleted successfully, but event processing failed');
        }
      } else {
        // System food deletion - no events
        console.log('🗑️ [FOOD-DELETE] System food deleted (no events fired)');
        
        return apiResponse({
          id: foodId,
          token
        }, true, 'System food deleted successfully');
      }
      
    } catch (error) {
      console.error('💥 [FOOD-DELETE] Unexpected error in DELETE /api/foods/[id]:', error);
      return handleApiError(error, "Error deleting food");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);