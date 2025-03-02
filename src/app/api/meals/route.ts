import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

type FilterOptions = {
  startDate?: Date;
  endDate?: Date;
  userId?: mongoose.Types.ObjectId;
  sortBy?: string;
  sortOrder?: 1 | -1;
};

// GET - Fetch meals with optional filtering
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get current authenticated user
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }

    const searchParams = req.nextUrl.searchParams;
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100); // Cap at 100 items
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1); // Minimum page 1
    const skip = (page - 1) * limit;
    
    // Parse sorting parameters
    const sortField = searchParams.get('sort') || 'date';
    const sortOrder = searchParams.get('order')?.toLowerCase() === 'asc' ? 1 : -1;
    
    // Build filter options
    const filterOptions: FilterOptions = {
      userId: new mongoose.Types.ObjectId(session.user.id),
      sortBy: sortField,
      sortOrder: sortOrder
    };

    // Date filtering
    const date = searchParams.get('date');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    if (date) {
      // Single day filter
      const targetDate = new Date(date);
      
      if (isNaN(targetDate.getTime())) {
        return apiError('Invalid date format', 400);
      }
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      filterOptions.startDate = startOfDay;
      filterOptions.endDate = endOfDay;
    } else if (startDateStr || endDateStr) {
      // Date range filter
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) {
          return apiError('Invalid startDate format', 400);
        }
        
        startDate.setHours(0, 0, 0, 0);
        filterOptions.startDate = startDate;
      }
      
      if (endDateStr) {
        const endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) {
          return apiError('Invalid endDate format', 400);
        }
        
        endDate.setHours(23, 59, 59, 999);
        filterOptions.endDate = endDate;
      }
    }
    
    // Build MongoDB query from filter options
    const query: any = { userId: filterOptions.userId };
    
    if (filterOptions.startDate && filterOptions.endDate) {
      query.date = { $gte: filterOptions.startDate, $lte: filterOptions.endDate };
    } else if (filterOptions.startDate) {
      query.date = { $gte: filterOptions.startDate };
    } else if (filterOptions.endDate) {
      query.date = { $lte: filterOptions.endDate };
    }
    
    // If we're an admin and explicitly requested a different user's data
    const requestedUserId = searchParams.get('userId');
    if (session.user.role === 'admin' && requestedUserId) {
      try {
        query.userId = new mongoose.Types.ObjectId(requestedUserId);
      } catch (error) {
        return apiError('Invalid user ID format', 400);
      }
    }
    
    // Execute query with pagination and sorting
    const sortOptions: Record<string, 1 | -1> = {};
    // Ensure sortField is a string before using it as an index
    sortOptions[sortField] = sortOrder;
    
    // Fetch meals with proper error handling
    try {
      const [meals, total] = await Promise.all([
        Meal.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Meal.countDocuments(query)
      ]);
      
      return apiResponse({
        meals,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return handleApiError(error, 'Error fetching meals');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing meal request');
  }
}

// POST - Create new meal
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get authenticated user
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400);
    }
    
    // Always use the authenticated user's ID
    body.userId = session.user.id;
    
    // Admin override for user ID if needed
    if (session.user.role === 'admin' && body.targetUserId) {
      try {
        body.userId = new mongoose.Types.ObjectId(body.targetUserId);
        delete body.targetUserId; // Remove the temporary field
      } catch (error) {
        return apiError('Invalid target user ID format', 400);
      }
    }
    
    // Validate essential fields
    if (!body.name) {
      return apiError('Meal name is required', 400);
    }
    
    // Format date properly
    if (body.date) {
      const dateObj = new Date(body.date);
      if (isNaN(dateObj.getTime())) {
        return apiError('Invalid date format', 400);
      }
      body.date = dateObj;
    } else {
      body.date = new Date();
    }
    
    // Validate time format if provided
    if (body.time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.time)) {
      return apiError('Time must be in HH:MM format', 400);
    }
    
    // Validate foods array if provided
    if (body.foods) {
      if (!Array.isArray(body.foods)) {
        return apiError('Foods must be an array', 400);
      }
      
      // Validate each food item
      for (const food of body.foods) {
        if (!food.name) {
          return apiError('Each food item must have a name', 400);
        }
        
        if (typeof food.amount !== 'number' || food.amount < 0) {
          return apiError('Each food item must have a valid amount', 400);
        }
        
        // Ensure numeric values for macros
        food.protein = Number(food.protein) || 0;
        food.carbs = Number(food.carbs) || 0;
        food.fat = Number(food.fat) || 0;
        food.calories = Number(food.calories) || 0;
        
        // Validate non-negative values
        if (food.protein < 0 || food.carbs < 0 || food.fat < 0 || food.calories < 0) {
          return apiError('Nutritional values cannot be negative', 400);
        }
      }
    }
    
    // Let the Mongoose schema handle totals calculation via middleware
    
    // Create new meal with proper error handling
    try {
      const meal = await Meal.create(body);
      return apiResponse(meal, 'Meal created successfully', 201);
    } catch (error) {
      return handleApiError(error, 'Error creating meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing meal creation');
  }
}

// DELETE - Delete a meal
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get authenticated user
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return apiError('Meal ID is required', 400);
    }
    
    // Build query - ensure users can only delete their own meals
    const query: any = { 
      _id: id,
      userId: session.user.id
    };
    
    // Admin can delete any meal
    if (session.user.role === 'admin') {
      delete query.userId;
    }
    
    const result = await Meal.findOneAndDelete(query);
    
    if (!result) {
      return apiError('Meal not found or access denied', 404);
    }
    
    return apiResponse(null, 'Meal deleted successfully');
  } catch (error) {
    return handleApiError(error, 'Error deleting meal');
  }
}

// PATCH - Update a meal
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get authenticated user
    const session = await getAuth();
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400);
    }
    
    const { id, ...updateData } = body;
    
    if (!id) {
      return apiError('Meal ID is required', 400);
    }
    
    // Ensure date is a valid Date object if provided
    if (updateData.date) {
      const dateObj = new Date(updateData.date);
      if (isNaN(dateObj.getTime())) {
        return apiError('Invalid date format', 400);
      }
      updateData.date = dateObj;
    }
    
    // Validate time format if provided
    if (updateData.time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updateData.time)) {
      return apiError('Time must be in HH:MM format', 400);
    }
    
    // Validate foods array if provided
    if (updateData.foods) {
      if (!Array.isArray(updateData.foods)) {
        return apiError('Foods must be an array', 400);
      }
      
      // Validate each food item
      for (const food of updateData.foods) {
        if (!food.name) {
          return apiError('Each food item must have a name', 400);
        }
        
        if (typeof food.amount !== 'number' || food.amount < 0) {
          return apiError('Each food item must have a valid amount', 400);
        }
        
        // Ensure numeric values for macros
        food.protein = Number(food.protein) || 0;
        food.carbs = Number(food.carbs) || 0;
        food.fat = Number(food.fat) || 0;
        food.calories = Number(food.calories) || 0;
        
        // Validate non-negative values
        if (food.protein < 0 || food.carbs < 0 || food.fat < 0 || food.calories < 0) {
          return apiError('Nutritional values cannot be negative', 400);
        }
      }
    }
    
    // Build query - ensure users can only update their own meals
    const query: any = { 
      _id: id,
      userId: session.user.id
    };
    
    // Admin can update any meal
    if (session.user.role === 'admin') {
      delete query.userId;
    }
    
    // Update the meal
    const meal = await Meal.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!meal) {
      return apiError('Meal not found or access denied', 404);
    }
    
    return apiResponse(meal, 'Meal updated successfully');
  } catch (error) {
    return handleApiError(error, 'Error updating meal');
  }
}