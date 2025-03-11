// src/app/api/meals/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Meal from "@/models/Meal";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import { MealResponse } from "@/types/api/mealResponses";
import { UpdateMealRequest } from "@/types/api/mealRequests";
import { convertMealToResponse } from "@/types/converters/mealConverters";
import { IMeal } from "@/types/models/meal";

/**
 * GET /api/meals/[id]
 * Get a specific meal by ID
 */
export const GET = withAuth<MealResponse['data'], { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const mealId = context.params.id;
      
      if (!mealId || typeof mealId !== 'string') {
        return apiError('Meal ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(mealId)) {
        return apiError('Invalid meal ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(mealId) as IMeal | null;
        
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
 * Update a specific meal by ID
 */
export const PUT = withAuth<MealResponse['data'], { id: string }>(
  async (req: NextRequest, userId, { params }) => {
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
        meal = await Meal.findById(mealId) as IMeal | null;
        
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
      
      // NOTE: This endpoint does not update foods array
      // Foods should be managed through the /api/meals/[id]/foods endpoints
      
      // If there are no valid updates, return error
      if (Object.keys(updates).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
      }
      
      // Update meal with defensive error handling
      let updatedMeal: IMeal | null;
      try {
        updatedMeal = await Meal.findByIdAndUpdate(
          mealId,
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
 * Delete a specific meal by ID
 */
export const DELETE = withAuth<{ id: string }, { id: string }>(
  async (req: NextRequest, userId, { params }) => {
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
      
      // Get meal with defensive error handling
      let meal: IMeal | null;
      try {
        meal = await Meal.findById(mealId) as IMeal | null;
        
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
      
      // Delete meal with defensive error handling
      try {
        await Meal.deleteOne({ _id: mealId });
      } catch (error) {
        return handleApiError(error, 'Error deleting meal from database');
      }
      
      return apiResponse({ id: mealId }, true, 'Meal deleted successfully');
    } catch (error) {
      return handleApiError(error, "Error deleting meal");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);