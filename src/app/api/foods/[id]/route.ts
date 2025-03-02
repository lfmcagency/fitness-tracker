export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';
import Food from '@/models/Food';
import mongoose from 'mongoose';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// GET /api/foods/[id] - Get a single food by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Validate food ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid food ID format', 400);
    }
    
    // Get the food
    const food = await Food.findById(id);
    
    if (!food) {
      return apiError('Food not found', 404);
    }
    
    // Check if user has access to this food
    const session = await getAuth();
    const userId = session?.user?.id;
    const isAdmin = session?.user?.role === 'admin';
    
    // User can access if:
    // 1. It's a system food, or
    // 2. They're the owner of the food, or
    // 3. They're an admin
    if (!food.isSystemFood && !isAdmin && (!userId || food.userId.toString() !== userId)) {
      return apiError('You do not have permission to access this food', 403);
    }
    
    return apiResponse(food, 'Food retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving food');
  }
}

// PUT /api/foods/[id] - Update a food
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    // Authentication is required for updating foods
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    const { id } = params;
    
    // Validate food ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid food ID format', 400);
    }
    
    // Get food data from request body
    const foodData = await req.json();
    
    // Basic validation
    if (!foodData.name || !foodData.servingSize) {
      return apiError('Name and serving size are required', 400);
    }
    
    // Get the existing food
    const existingFood = await Food.findById(id);
    
    if (!existingFood) {
      return apiError('Food not found', 404);
    }
    
    // Check permissions - only the owner or admin can update
    const isAdmin = session.user.role === 'admin';
    if (!isAdmin && (!existingFood.userId || existingFood.userId.toString() !== session.user.id)) {
      return apiError('You do not have permission to update this food', 403);
    }
    
    // Regular users cannot change system food status
    if (!isAdmin) {
      delete foodData.isSystemFood;
    }
    
    // Don't allow changing ownership
    delete foodData.userId;
    
    // Ensure numeric values
    if (foodData.protein !== undefined) foodData.protein = Number(foodData.protein);
    if (foodData.carbs !== undefined) foodData.carbs = Number(foodData.carbs);
    if (foodData.fat !== undefined) foodData.fat = Number(foodData.fat);
    if (foodData.calories !== undefined) foodData.calories = Number(foodData.calories);
    if (foodData.servingSize !== undefined) foodData.servingSize = Number(foodData.servingSize);
    
    // Update the food
    const updatedFood = await Food.findByIdAndUpdate(
      id,
      { $set: foodData },
      { new: true, runValidators: true }
    );
    
    return apiResponse(updatedFood, 'Food updated successfully');
  } catch (error) {
    return handleApiError(error, 'Error updating food');
  }
}

// DELETE /api/foods/[id] - Delete a food
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    // Authentication is required for deleting foods
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    const { id } = params;
    
    // Validate food ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid food ID format', 400);
    }
    
    // Get the existing food
    const existingFood = await Food.findById(id);
    
    if (!existingFood) {
      return apiError('Food not found', 404);
    }
    
    // Check permissions - only the owner or admin can delete
    const isAdmin = session.user.role === 'admin';
    
    // System foods can only be deleted by admins
    if (existingFood.isSystemFood && !isAdmin) {
      return apiError('Only administrators can delete system foods', 403);
    }
    
    // User foods can only be deleted by the owner or admin
    if (!existingFood.isSystemFood && !isAdmin && 
        (!existingFood.userId || existingFood.userId.toString() !== session.user.id)) {
      return apiError('You do not have permission to delete this food', 403);
    }
    
    // Delete the food
    await Food.findByIdAndDelete(id);
    
    return apiResponse(null, 'Food deleted successfully');
  } catch (error) {
    return handleApiError(error, 'Error deleting food');
  }
}