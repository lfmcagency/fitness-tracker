export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// Remove a food item from a meal by index
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; index: string } }
) {
  try {
    await dbConnect();
    
    // Get authenticated user
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    const { id: mealId, index: foodIndex } = params;
    
    // Validate meal ID format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400);
    }
    
    // Validate food index
    const foodIndexNum = parseInt(foodIndex, 10);
    if (isNaN(foodIndexNum) || foodIndexNum < 0) {
      return apiError('Invalid food index', 400);
    }
    
    try {
      // First verify the meal exists and user has permission to update it
      const existingMeal = await Meal.findById(mealId);
      
      if (!existingMeal) {
        return apiError('Meal not found', 404);
      }
      
      // Check ownership (unless admin)
      if (session.user.role !== 'admin' && existingMeal.userId.toString() !== session.user.id) {
        return apiError('You do not have permission to update this meal', 403);
      }
      
      // Check if food index exists
      if (!existingMeal.foods || foodIndexNum >= existingMeal.foods.length) {
        return apiError('Food item not found at specified index', 404);
      }
      
      // There's no direct MongoDB operator for removing an element by index
      // So we'll use array manipulation and then update the entire array
      
      // Clone the foods array and remove the item
      const updatedFoods = [...existingMeal.foods];
      updatedFoods.splice(foodIndexNum, 1);
      
      // Update the meal with the modified foods array
      const updatedMeal = await Meal.findByIdAndUpdate(
        mealId,
        { foods: updatedFoods },
        {
          new: true,
          runValidators: true
        }
      );
      
      return apiResponse(updatedMeal, 'Food removed from meal successfully');
    } catch (dbError) {
      return handleApiError(dbError, 'Error removing food from meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}