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

/**
 * GET /api/foods/[id]
 * Get a specific food by ID
 */
export const GET = withAuth<FoodData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate food ID parameter
      const foodId = context?.params?.id;
      if (!foodId || typeof foodId !== 'string' || foodId.trim() === '') {
        return apiError('Invalid food ID', 400, 'ERR_INVALID_ID');
      }
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(foodId)) {
        return apiError('Invalid food ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Find food with defensive error handling
      let food: IFood | null = null;
      try {
        // Allow access to system foods and user's own foods
        food = await Food.findOne({
          _id: foodId,
          $or: [
            { isSystemFood: true },
            { userId: userId }
          ]
        }) as IFood | null;
      } catch (error) {
        return handleApiError(error, 'Error querying food database');
      }
      
      if (!food) {
        return apiError('Food not found', 404, 'ERR_NOT_FOUND');
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
 * Update a specific food
 */
export const PUT = withAuth<FoodData, { id: string }>(
  async (req: NextRequest, userId, context) => {
    try {
      await dbConnect();
      
      // Validate food ID parameter
      const foodId = context?.params?.id;
      if (!foodId || typeof foodId !== 'string' || foodId.trim() === '') {
        return apiError('Invalid food ID', 400, 'ERR_INVALID_ID');
      }
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(foodId)) {
        return apiError('Invalid food ID format', 400, 'ERR_INVALID_ID');
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
      
      // Find food to update with defensive error handling
      let food: IFood | null = null;
      try {
        // Only allow users to update their own foods (not system foods)
        food = await Food.findOne({
          _id: foodId,
          userId: userId,
          isSystemFood: false
        }) as IFood | null;
      } catch (error) {
        return handleApiError(error, 'Error querying food database');
      }
      
      if (!food) {
        return apiError('Food not found or you do not have permission to update it', 404, 'ERR_NOT_FOUND');
      }
      
      // Prepare update data with validation
      const updateData: Record<string, any> = {};
      
      // Validate name
      if (body.name !== undefined) {
        if (typeof body.name === 'string' && body.name.trim() !== '') {
          updateData.name = body.name.trim();
        } else {
          return apiError('Name must be a non-empty string', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate description
      if (body.description !== undefined) {
        if (typeof body.description === 'string') {
          updateData.description = body.description.trim();
        } else if (body.description === null) {
          updateData.description = '';
        } else {
          return apiError('Description must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate macros with numeric parsing
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
        
        updateData.protein = protein;
      }
      
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
        
        updateData.carbs = carbs;
      }
      
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
        
        updateData.fat = fat;
      }
      
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
        
        updateData.calories = calories;
      }
      
      // Validate serving size
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
        
        updateData.servingSize = servingSize;
      }
      
      // Validate serving unit
      if (body.servingUnit !== undefined) {
        if (typeof body.servingUnit === 'string' && body.servingUnit.trim() !== '') {
          const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];
          const unit = body.servingUnit.toLowerCase().trim();
          
          if (validUnits.includes(unit)) {
            updateData.servingUnit = unit;
          } else {
            return apiError(`Invalid serving unit. Valid units: ${validUnits.join(', ')}`, 400, 'ERR_VALIDATION');
          }
        } else {
          return apiError('Serving unit must be a non-empty string', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate category
      if (body.category !== undefined) {
        if (typeof body.category === 'string') {
          updateData.category = body.category.trim() || 'Other';
        } else if (body.category === null) {
          updateData.category = 'Other';
        } else {
          return apiError('Category must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate brand if provided
      if (body.brand !== undefined) {
        if (typeof body.brand === 'string') {
          updateData.brand = body.brand.trim();
        } else if (body.brand === null) {
          updateData.brand = '';
        } else {
          return apiError('Brand must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Update food with defensive error handling
      let updatedFood: IFood | null = null;
      try {
        updatedFood = await Food.findByIdAndUpdate(
          foodId,
          { $set: updateData },
          { new: true, runValidators: true }
        ) as IFood | null;
      } catch (error) {
        return handleApiError(error, 'Error updating food in database');
      }
      
      if (!updatedFood) {
        return apiError('Food not found after update', 404, 'ERR_NOT_FOUND');
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
 * Delete a specific food
 */
export const DELETE = withAuth<{ success: boolean; id: string }, { id: string }>(
  async (req: NextRequest, userId, context) => {
    try {
      await dbConnect();
      
      // Validate food ID parameter
      const foodId = context?.params?.id;
      if (!foodId || typeof foodId !== 'string' || foodId.trim() === '') {
        return apiError('Invalid food ID', 400, 'ERR_INVALID_ID');
      }
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(foodId)) {
        return apiError('Invalid food ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Find food to delete with defensive error handling
      let food: IFood | null = null;
      try {
        // Only allow users to delete their own foods (not system foods)
        food = await Food.findOne({
          _id: foodId,
          userId: userId,
          isSystemFood: false
        }) as IFood | null;
      } catch (error) {
        return handleApiError(error, 'Error querying food database');
      }
      
      if (!food) {
        return apiError('Food not found or you do not have permission to delete it', 404, 'ERR_NOT_FOUND');
      }
      
      // Delete food with defensive error handling
      try {
        await Food.deleteOne({ _id: foodId });
      } catch (error) {
        return handleApiError(error, 'Error deleting food from database');
      }
      
      return apiResponse({
        success: true,
        id: foodId
      }, true, 'Food deleted successfully');
    } catch (error) {
      return handleApiError(error, "Error deleting food");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);