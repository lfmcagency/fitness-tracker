// src/app/api/foods/[id]/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";

/**
 * GET /api/foods/[id]
 * Get a specific food by ID
 */
export const GET = withAuth<ResponseType['data'], { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const id = context.params.id;
    
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
      food = await Food.findById(foodId);
      
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
    
    // Format food response with defensive transformation
    let foodResponse;
    try {
      const foodObj = food.toObject();
      foodResponse = {
        ...foodObj,
        id: foodObj._id.toString(),
        _id: undefined,
        // Ensure fields exist
        protein: foodObj.protein || 0,
        carbs: foodObj.carbs || 0,
        fat: foodObj.fat || 0,
        calories: foodObj.calories || 0,
        isUserFood: foodObj.userId ? true : false,
      };
    } catch (error) {
      console.error('Error formatting food response:', error);
      // Fallback with minimal data
      foodResponse = {
        id: food._id.toString(),
        name: food.name || 'Unknown Food',
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        calories: food.calories || 0
      };
    }
    
    return apiResponse(foodResponse, true, 'Food retrieved successfully');
  } catch (error) {
    return handleApiError(error, "Error retrieving food");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PUT /api/foods/[id]
 * Update a specific food by ID
 */
export const PUT = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Validate food ID from params
    const foodId = params?.id;
    
    if (!foodId || typeof foodId !== 'string') {
      return apiError('Food ID is required', 400, 'ERR_VALIDATION');
    }
    
    // Check if ID is valid MongoDB ObjectId
    if (!isValidObjectId(foodId)) {
      return apiError('Invalid food ID format', 400, 'ERR_VALIDATION');
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
    
    // Get existing food with defensive error handling
    let food;
    try {
      food = await Food.findById(foodId);
      
      if (!food) {
        return apiError('Food not found', 404, 'ERR_NOT_FOUND');
      }
    } catch (error) {
      return handleApiError(error, 'Error retrieving food from database');
    }
    
    // Check if user has permission to update this food
    // Users can only update their own foods, not system foods
    if (!food.userId || food.userId.toString() !== userId) {
      return apiError('You do not have permission to update this food', 403, 'ERR_FORBIDDEN');
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
    if (body.serving !== undefined) {
      if (typeof body.serving !== 'object' || body.serving === null) {
        return apiError('Serving must be an object', 400, 'ERR_VALIDATION');
      }
      
      const serving: any = {};
      let updateServing = false;
      
      // Validate serving size
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
      
      // Validate serving unit
      if (body.serving.unit !== undefined) {
        if (typeof body.serving.unit !== 'string' || body.serving.unit.trim() === '') {
          return apiError('Serving unit must be a non-empty string', 400, 'ERR_VALIDATION');
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
          ...food.serving || { size: 100, unit: 'g' },
          ...serving
        };
      }
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
      );
      
      if (!updatedFood) {
        return apiError('Food not found after update', 404, 'ERR_NOT_FOUND');
      }
    } catch (error) {
      return handleApiError(error, 'Error updating food in database');
    }
    
    // Format response
    let foodResponse;
    try {
      const foodObj = updatedFood.toObject();
      foodResponse = {
        ...foodObj,
        id: foodObj._id.toString(),
        _id: undefined
      };
    } catch (error) {
      console.error('Error formatting updated food response:', error);
      // Fallback with minimal data
      foodResponse = {
        id: updatedFood._id.toString(),
        name: updatedFood.name || 'Unknown Food',
        protein: updatedFood.protein || 0,
        carbs: updatedFood.carbs || 0,
        fat: updatedFood.fat || 0,
        calories: updatedFood.calories || 0
      };
    }
    
    return apiResponse(foodResponse, true, 'Food updated successfully');
  } catch (error) {
    return handleApiError(error, "Error updating food");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * DELETE /api/foods/[id]
 * Delete a specific food by ID
 */
export const DELETE = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Validate food ID from params
    const foodId = params?.id;
    
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
      food = await Food.findById(foodId);
      
      if (!food) {
        return apiError('Food not found', 404, 'ERR_NOT_FOUND');
      }
    } catch (error) {
      return handleApiError(error, 'Error retrieving food from database');
    }
    
    // Check if user has permission to delete this food
    // Users can only delete their own foods, not system foods
    if (!food.userId || food.userId.toString() !== userId) {
      return apiError('You do not have permission to delete this food', 403, 'ERR_FORBIDDEN');
    }
    
    // Check if food is in use in any meals before deletion
    // This would require a Meal model query to check for references
    // For now we'll skip this, but in a production version this would be implemented
    
    // Delete food with defensive error handling
    try {
      await Food.deleteOne({ _id: foodId });
    } catch (error) {
      return handleApiError(error, 'Error deleting food from database');
    }
    
    return apiResponse({ id: foodId }, true, 'Food deleted successfully');
  } catch (error) {
    return handleApiError(error, "Error deleting food");
  }
}, AuthLevel.DEV_OPTIONAL);