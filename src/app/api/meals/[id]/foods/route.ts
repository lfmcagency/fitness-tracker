export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// Add a food item to a meal
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    // Get authenticated user
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    const mealId = params.id;
    
    // Validate meal ID format
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      return apiError('Invalid meal ID format', 400);
    }
    
    // Parse and validate food data
    let food;
    try {
      food = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400);
    }
    
    // Validate required food fields
    if (!food.name) {
      return apiError('Food name is required', 400);
    }
    
    if (typeof food.amount !== 'number' || food.amount < 0) {
      return apiError('Food amount must be a positive number', 400);
    }
    
    // Set defaults and ensure numeric values for macros
    food.unit = food.unit || 'g';
    food.protein = Number(food.protein) || 0;
    food.carbs = Number(food.carbs) || 0;
    food.fat = Number(food.fat) || 0;
    food.calories = Number(food.calories) || 0;
    
    // Validate non-negative values
    if (food.protein < 0 || food.carbs < 0 || food.fat < 0 || food.calories < 0) {
      return apiError('Nutritional values cannot be negative', 400);
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
      
      // Add the food to the meal
      // Using findByIdAndUpdate to trigger the pre-findOneAndUpdate middleware
      // that recalculates totals
      const updatedMeal = await Meal.findByIdAndUpdate(
        mealId,
        { $push: { foods: food } },
        { 
          new: true, // Return updated document
          runValidators: true // Run model validators
        }
      );
      
      return apiResponse(updatedMeal, true, 'Food added to meal successfully');
    } catch (dbError) {
      return handleApiError(dbError, 'Error adding food to meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing request');
  }
}