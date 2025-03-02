export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';
import Food from '@/models/Food';
import mongoose from 'mongoose';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// GET /api/foods - Get foods with filtering, pagination, and sorting
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Authentication is optional - users can view system foods without login
    const session = await getAuth();
    const userId = session?.user?.id;
    
    // Get query parameters
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const sortBy = url.searchParams.get('sortBy') || 'name';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';
    
    // Cap the limit to prevent performance issues
    const cappedLimit = Math.min(limit, 100);
    
    // Build the query
    const queryConditions: any = {};
    
    // Add search conditions if search parameter provided
    if (searchQuery) {
      queryConditions.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Add category filter if provided
    if (category) {
      queryConditions.category = category;
    }
    
    // Only include system foods and user's own custom foods
    queryConditions.$or = [
      { isSystemFood: true },
      ...(userId ? [{ userId: new mongoose.Types.ObjectId(userId) }] : [])
    ];
    
    // Execute the query with pagination
    const totalFoods = await Food.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalFoods / cappedLimit);
    
    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get foods with pagination
    const foods = await Food.find(queryConditions)
      .sort(sortOptions)
      .skip((page - 1) * cappedLimit)
      .limit(cappedLimit);
    
    return apiResponse(
      { foods, categories: await Food.distinct('category') },
      'Foods retrieved successfully',
      {
        total: totalFoods,
        page,
        limit: cappedLimit,
        pages: totalPages
      }
    );
  } catch (error) {
    return handleApiError(error, 'Error retrieving foods');
  }
}

// POST /api/foods - Create a new custom food
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Authentication is required for creating custom foods
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    // Get food data from request body
    const foodData = await req.json();
    
    // Basic validation
    if (!foodData.name || !foodData.servingSize) {
      return apiError('Name and serving size are required', 400);
    }
    
    // Set default values and ensure numeric values
    if (!foodData.servingUnit) foodData.servingUnit = 'g';
    foodData.protein = Number(foodData.protein || 0);
    foodData.carbs = Number(foodData.carbs || 0);
    foodData.fat = Number(foodData.fat || 0);
    foodData.calories = Number(foodData.calories || 0);
    
    // Regular users can only create custom foods (not system foods)
    if (session.user.role !== 'admin') {
      foodData.isSystemFood = false;
    }
    
    // Set the userId for custom foods
    if (!foodData.isSystemFood) {
      foodData.userId = new mongoose.Types.ObjectId(session.user.id);
    }
    
    // Create the food
    const newFood = new Food(foodData);
    await newFood.save();
    
    return apiResponse(newFood, 'Food created successfully', undefined, 201);
  } catch (error) {
    return handleApiError(error, 'Error creating food');
  }
}