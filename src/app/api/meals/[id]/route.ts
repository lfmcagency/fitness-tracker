// src/app/api/meals/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Meal from "@/models/Meal";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import { MealData } from "@/types/api/mealResponses";
import { UpdateMealRequest } from "@/types/api/mealRequests";
import { convertMealToResponse } from "@/types/converters/mealConverters";
import { IMeal } from "@/types/models/meal";

// Event coordinator integration
import { processEvent, generateToken } from '@/lib/event-coordinator';
import { MealEvent } from '@/lib/event-coordinator/types';
import { calculateNutritionContext, getTodayString } from '@/lib/shared-utilities';
import SimpleEventLog from '@/lib/event-coordinator/SimpleEventLog';

/**
 * GET /api/meals/[id]
 * Get a specific meal by ID
 */
export const GET = withAuth<MealData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      if (!isValidObjectId(id)) {
        return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(id) as IMeal | null;
        
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
      
      // Convert meal to response format
      const mealResponse = convertMealToResponse(meal);
      
      return apiResponse(mealResponse, true, 'Meal retrieved successfully');
    } catch (error) {
      return handleApiError(error, "Error retrieving meal");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/meals/[id]
 * Update a specific meal by ID (SAME-DAY VALIDATION)
 */
export const PUT = withAuth<MealData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate meal ID from params
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Meal ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(id)) {
        return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body with defensive error handling
      let body: UpdateMealRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid meal data', 400, 'ERR_INVALID_DATA');
      }
      
      // Get existing meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(id) as IMeal | null;
        
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
      
      // 🚨 SAME-DAY VALIDATION
      const todayString = getTodayString();
      const mealDateString = meal.date.toISOString().split('T')[0];
      
      if (mealDateString !== todayString) {
        return apiError(
          `Cannot modify historical data. Meal was logged on ${mealDateString}, today is ${todayString}.`,
          403,
          'ERR_HISTORICAL_EDIT'
        );
      }
      
      // Create update object with validated fields
      const updates: any = {};
      
      // Validate and update name if provided
      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim() === '') {
          return apiError('Meal name must be a non-empty string', 400, 'ERR_VALIDATION');
        }
        updates.name = body.name.trim();
      }
      
      // Validate and update date if provided
      if (body.date !== undefined) {
        try {
          const date = new Date(body.date);
          if (isNaN(date.getTime())) {
            return apiError('Invalid date format', 400, 'ERR_VALIDATION');
          }
          
          // Ensure new date is also today (can't move meals to other days)
          const newDateString = date.toISOString().split('T')[0];
          if (newDateString !== todayString) {
            return apiError('Can only move meals within the same day', 400, 'ERR_VALIDATION');
          }
          
          updates.date = date;
        } catch (error) {
          return apiError('Invalid date format', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update time if provided
      if (body.time !== undefined) {
        if (body.time === null || body.time === '') {
          updates.time = '';
        } else if (typeof body.time === 'string') {
          // Validate time format (HH:MM)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(body.time)) {
            return apiError('Invalid time format. Use HH:MM format.', 400, 'ERR_VALIDATION');
          }
          updates.time = body.time;
        } else {
          return apiError('Time must be a string in HH:MM format', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update notes if provided
      if (body.notes !== undefined) {
        if (body.notes === null) {
          updates.notes = '';
        } else if (typeof body.notes === 'string') {
          updates.notes = body.notes.trim();
        } else {
          return apiError('Notes must be a string', 400, 'ERR_VALIDATION');
        }
      }
      
      // If there are no valid updates, return error
      if (Object.keys(updates).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
      }
      
      // Update meal with defensive error handling
      let updatedMeal: IMeal | null;
      try {
        updatedMeal = await Meal.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true, runValidators: true }
        ) as IMeal | null;
        
        if (!updatedMeal) {
          return apiError('Meal not found after update', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error updating meal in database');
      }
      
      // Convert to response format
      const mealResponse = convertMealToResponse(updatedMeal);

      return apiResponse(mealResponse, true, 'Meal updated successfully');
    } catch (error) {
      return handleApiError(error, "Error updating meal");
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/meals/[id]
 * Delete a specific meal by ID (SAME-DAY + EVENTS)
 */
export const DELETE = withAuth<{ id: string; token?: string; achievements?: any }, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    const token = generateToken();
    
    console.log(`🗑️ [MEAL-DELETE] DELETE started with token: ${token}`);
    
    try {
      await dbConnect();
      
      // Validate meal ID from params
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Meal ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(id)) {
        return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(id) as IMeal | null;
        
        if (!meal) {
          return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving meal from database');
      }
      
      // Check if user has permission to delete this meal
      if (meal.userId && meal.userId.toString() !== userId) {
        return apiError('You do not have permission to delete this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // 🚨 SAME-DAY VALIDATION
      const todayString = getTodayString();
      const mealDateString = meal.date.toISOString().split('T')[0];
      
      if (mealDateString !== todayString) {
        return apiError(
          `Cannot delete historical data. Meal was logged on ${mealDateString}, today is ${todayString}.`,
          403,
          'ERR_HISTORICAL_DELETE'
        );
      }
      
      // Store meal data for event before deletion
      const mealForEvent = convertMealToResponse(meal);
      const mealDate = meal.date;
      
      // Delete meal with defensive error handling
      try {
        await Meal.deleteOne({ _id: id });
      } catch (error) {
        return handleApiError(error, 'Error deleting meal from database');
      }
      
      // 🚀 FIRE MEAL DELETION EVENT TO COORDINATOR
      try {
        console.log('🗑️ [MEAL-DELETE] Firing meal_deleted event to coordinator...');
        
        // Get remaining meals for today to calculate new totals
        const todayStart = new Date(mealDate);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        
        const remainingMealsToday = await Meal.find({
          userId,
          date: { $gte: todayStart, $lt: todayEnd }
        }) as IMeal[];
        
        // Get new total meal count for user (after deletion)
        const totalMeals = await Meal.countDocuments({ userId });
        
        // Default macro goals (TODO: get from user profile)
        const macroGoals = {
          protein: 140,
          carbs: 200,
          fat: 70,
          calories: 2200
        };
        
        // Calculate new nutrition context using shared utility
        const nutritionContext = calculateNutritionContext(
          userId,
          mealDate.toISOString().split('T')[0],
          remainingMealsToday.map(m => convertMealToResponse(m)),
          macroGoals
        );
        
        // Build proper MealEvent for deletion
        const mealEvent: MealEvent = {
          token,
          userId,
          source: 'trophe',
          action: 'meal_deleted',
          timestamp: new Date(),
          metadata: {
            deletedMeal: mealForEvent,
            nutritionContext
          },
          mealData: {
            mealId: id,
            mealName: mealForEvent.name,
            mealDate: mealDate.toISOString().split('T')[0],
            totalMeals, // New count after deletion
            dailyMacroProgress: nutritionContext.dailyMacroProgress,
            macroTotals: nutritionContext.macroTotals
          }
        };
        
        console.log('🗑️ [MEAL-DELETE] Firing meal deletion event:', {
          token,
          action: mealEvent.action,
          mealName: mealEvent.mealData.mealName,
          newMacroProgress: mealEvent.mealData.dailyMacroProgress.total
        });
        
        const coordinatorResult = await processEvent(mealEvent);
        
        console.log('🎉 [MEAL-DELETE] Coordinator processing complete:', {
          success: coordinatorResult.success,
          xpAwarded: coordinatorResult.xpAwarded, // Should be negative
          token: coordinatorResult.token
        });
        
        // Build response
        let message = 'Meal deleted successfully';
        if (coordinatorResult.xpAwarded && coordinatorResult.xpAwarded < 0) {
          message = `Meal deleted (${Math.abs(coordinatorResult.xpAwarded)} XP reversed)`;
        }
        
        return apiResponse({
          id,
          token,
          achievements: coordinatorResult.achievementsUnlocked
        }, true, message);
        
      } catch (coordinatorError) {
        console.error('💥 [MEAL-DELETE] Coordinator error:', coordinatorError);
        
        // Still return success since meal was deleted, but note coordinator failure
        return apiResponse({
          id,
          token
        }, true, 'Meal deleted successfully, but event processing failed');
      }
      
    } catch (error) {
      console.error('💥 [MEAL-DELETE] Unexpected error in DELETE /api/meals/[id]:', error);
      return handleApiError(error, "Error deleting meal");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);