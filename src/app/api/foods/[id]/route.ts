export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Food from '@/models/Food';
import mongoose from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/foods/[id]
 * 
 * Get a specific food item by ID
 */
export const GET = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
  try {
    await dbConnect();
    
    // Validate food ID
    const foodId = params?.id;
    
    if (!foodId || typeof foodId !== 'string' || foodId.trim() === '') {
      return apiError('Food ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return apiError('Invalid food ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    try {
      // Find the food
      const food = await Food.findById(foodId);
      
      if (!food) {
        return apiError('Food not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if user can access this food (must be system food or user's own food)
      if (!food.isSystemFood && 
          food.userId && 
          food.userId.toString() !== userId.toString()) {
        return apiError('You do not have permission to view this food', 403, 'ERR_FORBIDDEN');
      }
      
      return apiResponse(food);
    } catch (dbError) {
      return handleApiError(dbError, 'Error fetching food');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PUT /api/foods/[id]
 * 
 * Update a specific food item
 */
export const PUT = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
  try {
    await dbConnect();
    
    // Validate food ID
    const foodId = params?.id;
    
    if (!foodId || typeof foodId !== 'string' || foodId.trim() === '') {
      return apiError('Food ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return apiError('Invalid food ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Parse and validate request body
    let data;
    try {
      data = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body is an object
    if (!data || typeof data !== 'object') {
      return apiError('Invalid request body', 400, 'ERR_INVALID_FORMAT');
    }
    
    try {
      // Find the food to check permission
      const existingFood = await Food.findById(foodId);
      
      if (!existingFood) {
        return apiError('Food not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if user can update this food (must be admin or own the food)
      if (!existingFood.isSystemFood && 
          existingFood.userId && 
          existingFood.userId.toString() !== userId.toString()) {
        return apiError('You do not have permission to update this food', 403, 'ERR_FORBIDDEN');
      }
      
      // Validate and sanitize fields
      const updateData: any = {};
      
      // Validate name if provided
      if ('name' in data) {
        if (typeof data.name !== 'string' || data.name.trim() === '') {
          return apiError('Food name cannot be empty', 400, 'ERR_VALIDATION');
        }
        updateData.name = data.name.trim();
      }
      
      // Process description if provided
      if ('description' in data) {
        updateData.description = typeof data.description === 'string' 
          ? data.description.trim() 
          : '';
      }
      
      // Validate serving size if provided
      if ('servingSize' in data) {
        let servingSize = 0;
        try {
          servingSize = Number(data.servingSize);
          if (isNaN(servingSize) || servingSize <= 0) {
            return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
          }
          updateData.servingSize = servingSize;
        } catch (error) {
          return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate serving unit if provided
      if ('servingUnit' in data) {
        if (typeof data.servingUnit !== 'string' || data.servingUnit.trim() === '') {
          return apiError('Serving unit cannot be empty', 400, 'ERR_VALIDATION');
        }
        updateData.servingUnit = data.servingUnit.trim();
      }
      
      // Validate nutrition values with defensive parsing
      const nutritionFields = ['protein', 'carbs', 'fat', 'calories'];
      
      for (const field of nutritionFields) {
        if (field in data) {
          let value = 0;
          try {
            value = Number(data[field]);
            if (isNaN(value)) {
              return apiError(`${field} must be a number`, 400, 'ERR_VALIDATION');
            }
            updateData[field] = Math.max(0, value);  // Ensure non-negative
          } catch (error) {
            return apiError(`${field} must be a number`, 400, 'ERR_VALIDATION');
          }
        }
      }
      
      // Process category if provided
      if ('category' in data) {
        updateData.category = typeof data.category === 'string' 
          ? data.category.trim() 
          : '';
      }
      
      // Prevent changes to system flag and userId
      delete data.isSystemFood;
      delete data.userId;
      
      // Update the food
      const updatedFood = await Food.findByIdAndUpdate(
        foodId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      if (!updatedFood) {
        return apiError('Failed to update food', 500, 'ERR_UPDATE_FAILED');
      }
      
      return apiResponse(updatedFood, true, 'Food updated successfully');
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.ValidationError) {
        const errorMessage = Object.values(dbError.errors)
          .map(err => err.message)
          .join(', ');
        return apiError(`Validation error: ${errorMessage}`, 400, 'ERR_VALIDATION');
      }
      return handleApiError(dbError, 'Error updating food');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing update request');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * DELETE /api/foods/[id]
 * 
 * Delete a specific food item
 */
export const DELETE = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
  try {
    await dbConnect();
    
    // Validate food ID
    const foodId = params?.id;
    
    if (!foodId || typeof foodId !== 'string' || foodId.trim() === '') {
      return apiError('Food ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return apiError('Invalid food ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    try {
      // Find the food to check permission
      const existingFood = await Food.findById(foodId);
      
      if (!existingFood) {
        return apiError('Food not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if user can delete this food (must be own the food)
      if (!existingFood.isSystemFood && 
          existingFood.userId && 
          existingFood.userId.toString() !== userId.toString()) {
        return apiError('You do not have permission to delete this food', 403, 'ERR_FORBIDDEN');
      }
      
      // Delete the food
      const result = await Food.deleteOne({ _id: foodId });
      
      if (!result || result.deletedCount === 0) {
        return apiError('Failed to delete food', 500, 'ERR_DELETE_FAILED');
      }
      
      return apiResponse(null, true, 'Food deleted successfully');
    } catch (dbError) {
      return handleApiError(dbError, 'Error deleting food');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing delete request');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PATCH /api/foods/[id]
 * 
 * Partially update a specific food item
 */
export const PATCH = withAuth(async (req: NextRequest, userId, { params }: { params: { id: string } }) => {
  try {
    await dbConnect();
    
    // Validate food ID
    const foodId = params?.id;
    
    if (!foodId || typeof foodId !== 'string' || foodId.trim() === '') {
      return apiError('Food ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return apiError('Invalid food ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Parse and validate request body
    let data;
    try {
      data = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body is an object
    if (!data || typeof data !== 'object') {
      return apiError('Invalid request body', 400, 'ERR_INVALID_FORMAT');
    }
    
    try {
      // Find the food to check permission
      const existingFood = await Food.findById(foodId);
      
      if (!existingFood) {
        return apiError('Food not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if user can update this food (must be admin or own the food)
      if (!existingFood.isSystemFood && 
          existingFood.userId && 
          existingFood.userId.toString() !== userId.toString()) {
        return apiError('You do not have permission to update this food', 403, 'ERR_FORBIDDEN');
      }
      
      // Similar validation logic as PUT but for partial updates
      const updateData: any = {};
      
      // Validate name if provided
      if ('name' in data) {
        if (typeof data.name !== 'string' || data.name.trim() === '') {
          return apiError('Food name cannot be empty', 400, 'ERR_VALIDATION');
        }
        updateData.name = data.name.trim();
      }
      
      // Process description if provided
      if ('description' in data) {
        updateData.description = typeof data.description === 'string' 
          ? data.description.trim() 
          : '';
      }
      
      // Validate serving size if provided
      if ('servingSize' in data) {
        let servingSize = 0;
        try {
          servingSize = Number(data.servingSize);
          if (isNaN(servingSize) || servingSize <= 0) {
            return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
          }
          updateData.servingSize = servingSize;
        } catch (error) {
          return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate serving unit if provided
      if ('servingUnit' in data) {
        if (typeof data.servingUnit !== 'string' || data.servingUnit.trim() === '') {
          return apiError('Serving unit cannot be empty', 400, 'ERR_VALIDATION');
        }
        updateData.servingUnit = data.servingUnit.trim();
      }
      
      // Validate nutrition values
      const nutritionFields = ['protein', 'carbs', 'fat', 'calories'];
      
      for (const field of nutritionFields) {
        if (field in data) {
          let value = 0;
          try {
            value = Number(data[field]);
            if (isNaN(value)) {
              return apiError(`${field} must be a number`, 400, 'ERR_VALIDATION');
            }
            updateData[field] = Math.max(0, value);  // Ensure non-negative
          } catch (error) {
            return apiError(`${field} must be a number`, 400, 'ERR_VALIDATION');
          }
        }
      }
      
      // Process category if provided
      if ('category' in data) {
        updateData.category = typeof data.category === 'string' 
          ? data.category.trim() 
          : '';
      }
      
      // Prevent changes to system flag and userId
      delete data.isSystemFood;
      delete data.userId;
      
      // Only update if there are valid fields to update
      if (Object.keys(updateData).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_VALIDATION');
      }
      
      // Update the food
      const updatedFood = await Food.findByIdAndUpdate(
        foodId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      if (!updatedFood) {
        return apiError('Failed to update food', 500, 'ERR_UPDATE_FAILED');
      }
      
      return apiResponse(updatedFood, true, 'Food updated successfully');
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.ValidationError) {
        const errorMessage = Object.values(dbError.errors)
          .map(err => err.message)
          .join(', ');
        return apiError(`Validation error: ${errorMessage}`, 400, 'ERR_VALIDATION');
      }
      return handleApiError(dbError, 'Error updating food');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing update request');
  }
}, AuthLevel.DEV_OPTIONAL);