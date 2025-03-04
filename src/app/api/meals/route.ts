export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Meal from '@/models/Meal';
import mongoose from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

type FilterOptions = {
  startDate?: Date;
  endDate?: Date;
  userId?: mongoose.Types.ObjectId;
  sortBy?: string;
  sortOrder?: 1 | -1;
};

// GET - Fetch meals with optional filtering
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get query parameters with defensive checks
    const url = new URL(req.url);
    
    // Parse pagination parameters with defensive parsing
    let limit = 50;  // Default limit
    try {
      const limitParam = url.searchParams.get('limit');
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 100); // Cap at 100 items
        }
      }
    } catch (error) {
      console.error('Error parsing limit parameter:', error);
      // Continue with default value
    }
    
    let page = 1;  // Default page
    try {
      const pageParam = url.searchParams.get('page');
      if (pageParam) {
        const parsedPage = parseInt(pageParam, 10);
        if (!isNaN(parsedPage) && parsedPage > 0) {
          page = parsedPage;
        }
      }
    } catch (error) {
      console.error('Error parsing page parameter:', error);
      // Continue with default value
    }
    
    const skip = (page - 1) * limit;
    
    // Parse sorting parameters with validation
    let sortField = 'date';
    const sortParam = url.searchParams.get('sort');
    if (sortParam && typeof sortParam === 'string' && 
        ['date', 'name', 'time', 'protein', 'carbs', 'fat', 'calories'].includes(sortParam)) {
      sortField = sortParam;
    }
    
    const sortOrder = url.searchParams.get('order')?.toLowerCase() === 'asc' ? 1 : -1;
    
    // Build filter options with defensive checks
    const filterOptions: FilterOptions = {
      userId: new mongoose.Types.ObjectId(userId),
      sortBy: sortField,
      sortOrder: sortOrder
    };
    
    // Date filtering with defensive date parsing
    const dateStr = url.searchParams.get('date');
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    
    if (dateStr) {
      // Parse date with error handling
      try {
        const targetDate = new Date(dateStr);
        
        if (isNaN(targetDate.getTime())) {
          return apiError('Invalid date format', 400, 'ERR_INVALID_DATE');
        }
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        filterOptions.startDate = startOfDay;
        filterOptions.endDate = endOfDay;
      } catch (error) {
        return apiError('Invalid date format', 400, 'ERR_INVALID_DATE');
      }
    } else if (startDateStr || endDateStr) {
      // Date range filter with defensive parsing
      if (startDateStr) {
        try {
          const startDate = new Date(startDateStr);
          if (isNaN(startDate.getTime())) {
            return apiError('Invalid startDate format', 400, 'ERR_INVALID_DATE');
          }
          
          startDate.setHours(0, 0, 0, 0);
          filterOptions.startDate = startDate;
        } catch (error) {
          return apiError('Invalid startDate format', 400, 'ERR_INVALID_DATE');
        }
      }
      
      if (endDateStr) {
        try {
          const endDate = new Date(endDateStr);
          if (isNaN(endDate.getTime())) {
            return apiError('Invalid endDate format', 400, 'ERR_INVALID_DATE');
          }
          
          endDate.setHours(23, 59, 59, 999);
          filterOptions.endDate = endDate;
        } catch (error) {
          return apiError('Invalid endDate format', 400, 'ERR_INVALID_DATE');
        }
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
    
    // If specific userId requested and requester is admin
    const requestedUserId = url.searchParams.get('userId');
    if (requestedUserId && requestedUserId.trim() !== '') {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(requestedUserId)) {
        return apiError('Invalid user ID format', 400, 'ERR_INVALID_FORMAT');
      }
      
      // Override the userId in the query
      try {
        query.userId = new mongoose.Types.ObjectId(requestedUserId);
      } catch (error) {
        return apiError('Invalid user ID format', 400, 'ERR_INVALID_FORMAT');
      }
    }
    
    // Execute query with pagination and sorting with defensive error handling
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortField] = sortOrder;
    
    // Initialize meals and total with defaults
    let meals = [];
    let total = 0;
    
    try {
      // Count documents with error handling
      total = await Meal.countDocuments(query);
    } catch (countError) {
      console.error('Error counting meals:', countError);
      // Continue with default 0
    }
    
    try {
      // Fetch meals with error handling
      meals = await Meal.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Ensure meals is always an array
      if (!Array.isArray(meals)) {
        meals = [];
      }
    } catch (findError) {
      return handleApiError(findError, 'Error fetching meals');
    }
    
    // Calculate pagination info with defensive math
    const totalPages = Math.ceil(Math.max(total, 0) / Math.max(limit, 1));
    
    return apiResponse({
      meals,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages,
        hasNextPage: skip + meals.length < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error processing meal request');
  }
}, AuthLevel.DEV_OPTIONAL);

// POST - Create new meal
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Parse and validate request body with defensive error handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body is an object
    if (!body || typeof body !== 'object') {
      return apiError('Invalid request body', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Always use the authenticated user's ID
    body.userId = userId;
    
    // Validate essential fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return apiError('Meal name is required', 400, 'ERR_VALIDATION');
    }
    
    // Format date properly with defensive parsing
    if (body.date) {
      try {
        const dateObj = new Date(body.date);
        if (isNaN(dateObj.getTime())) {
          return apiError('Invalid date format', 400, 'ERR_VALIDATION');
        }
        body.date = dateObj;
      } catch (error) {
        return apiError('Invalid date format', 400, 'ERR_VALIDATION');
      }
    } else {
      body.date = new Date();
    }
    
    // Validate time format if provided
    if (body.time) {
      if (typeof body.time !== 'string' || 
          !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.time)) {
        return apiError('Time must be in HH:MM format', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate foods array if provided with defensive array and property checks
    if (body.foods) {
      if (!Array.isArray(body.foods)) {
        return apiError('Foods must be an array', 400, 'ERR_VALIDATION');
      }
      
      // Create validated foods array
      const validatedFoods = [];
      
      // Validate each food item
      for (const food of body.foods) {
        // Check if food is an object
        if (!food || typeof food !== 'object') {
          return apiError('Each food item must be an object', 400, 'ERR_VALIDATION');
        }
        
        // Validate required fields
        if (!food.name || typeof food.name !== 'string' || food.name.trim() === '') {
          return apiError('Each food item must have a name', 400, 'ERR_VALIDATION');
        }
        
        // Validate amount is a positive number
        let amount = 0;
        try {
          amount = Number(food.amount);
          if (isNaN(amount) || amount < 0) {
            return apiError('Each food item must have a valid amount', 400, 'ERR_VALIDATION');
          }
        } catch (error) {
          return apiError('Each food item must have a valid amount', 400, 'ERR_VALIDATION');
        }
        
        // Create sanitized food object with defensive number parsing
        const sanitizedFood = {
          name: food.name.trim(),
          amount: amount,
          unit: typeof food.unit === 'string' ? food.unit.trim() : 'g',
          protein: Math.max(0, Number(food.protein) || 0),
          carbs: Math.max(0, Number(food.carbs) || 0),
          fat: Math.max(0, Number(food.fat) || 0),
          calories: Math.max(0, Number(food.calories) || 0)
        };
        
        validatedFoods.push(sanitizedFood);
      }
      
      // Replace with validated foods
      body.foods = validatedFoods;
    }
    
    // Create new meal with proper error handling
    try {
      const meal = await Meal.create(body);
      return apiResponse(meal, true, 'Meal created successfully', 201);
    } catch (dbError) {
      // Handle specific validation errors
      if (dbError instanceof mongoose.Error.ValidationError) {
        const errorMessage = Object.values(dbError.errors)
          .map(err => err.message)
          .join(', ');
        return apiError(`Validation error: ${errorMessage}`, 400, 'ERR_VALIDATION');
      }
      
      return handleApiError(dbError, 'Error creating meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing meal creation');
  }
}, AuthLevel.DEV_OPTIONAL);

// DELETE - Delete a meal
export const DELETE = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get and validate meal ID parameter
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    try {
      // First check if the meal exists and belongs to the user
      const meal = await Meal.findById(id);
      
      if (!meal) {
        return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Verify ownership with defensive string comparison
      const mealUserId = meal.userId ? meal.userId.toString() : '';
      if (mealUserId !== userId.toString()) {
        return apiError('You do not have permission to delete this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Delete the meal
      const result = await Meal.deleteOne({ _id: id });
      
      // Check if anything was actually deleted
      if (!result || result.deletedCount === 0) {
        return apiError('Meal could not be deleted', 500, 'ERR_DELETE_FAILED');
      }
      
      return apiResponse(null, true, 'Meal deleted successfully');
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.CastError) {
        return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
      }
      return handleApiError(dbError, 'Error deleting meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing delete request');
  }
}, AuthLevel.DEV_OPTIONAL);

// PATCH - Update a meal
export const PATCH = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body is an object
    if (!body || typeof body !== 'object') {
      return apiError('Invalid request body', 400, 'ERR_INVALID_FORMAT');
    }
    
    const { id, ...updateData } = body;
    
    // Validate meal ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return apiError('Meal ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid meal ID format', 400, 'ERR_INVALID_FORMAT');
    }
    
    try {
      // First verify the meal exists and user has permission to update it
      const existingMeal = await Meal.findById(id);
      
      if (!existingMeal) {
        return apiError('Meal not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Verify ownership with defensive string comparison
      const mealUserId = existingMeal.userId ? existingMeal.userId.toString() : '';
      if (mealUserId !== userId.toString()) {
        return apiError('You do not have permission to update this meal', 403, 'ERR_FORBIDDEN');
      }
      
      // Validate update data fields
      const sanitizedUpdate: any = {};
      
      // Validate name if provided
      if ('name' in updateData) {
        if (typeof updateData.name !== 'string' || updateData.name.trim() === '') {
          return apiError('Meal name cannot be empty', 400, 'ERR_VALIDATION');
        }
        sanitizedUpdate.name = updateData.name.trim();
      }
      
      // Validate date if provided
      if ('date' in updateData) {
        try {
          const dateObj = new Date(updateData.date);
          if (isNaN(dateObj.getTime())) {
            return apiError('Invalid date format', 400, 'ERR_VALIDATION');
          }
          sanitizedUpdate.date = dateObj;
        } catch (error) {
          return apiError('Invalid date format', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate time format if provided
      if ('time' in updateData) {
        if (typeof updateData.time !== 'string' || 
            !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updateData.time)) {
          return apiError('Time must be in HH:MM format', 400, 'ERR_VALIDATION');
        }
        sanitizedUpdate.time = updateData.time;
      }
      
      // Validate notes if provided
      if ('notes' in updateData) {
        sanitizedUpdate.notes = typeof updateData.notes === 'string' 
          ? updateData.notes.trim() 
          : '';
      }
      
      // Validate foods array if provided
      if ('foods' in updateData) {
        if (!Array.isArray(updateData.foods)) {
          return apiError('Foods must be an array', 400, 'ERR_VALIDATION');
        }
        
        // Create validated foods array
        const validatedFoods = [];
        
        // Validate each food item
        for (const food of updateData.foods) {
          // Check if food is an object
          if (!food || typeof food !== 'object') {
            return apiError('Each food item must be an object', 400, 'ERR_VALIDATION');
          }
          
          // Validate required fields
          if (!food.name || typeof food.name !== 'string' || food.name.trim() === '') {
            return apiError('Each food item must have a name', 400, 'ERR_VALIDATION');
          }
          
          // Validate amount is a positive number
          let amount = 0;
          try {
            amount = Number(food.amount);
            if (isNaN(amount) || amount < 0) {
              return apiError('Each food item must have a valid amount', 400, 'ERR_VALIDATION');
            }
          } catch (error) {
            return apiError('Each food item must have a valid amount', 400, 'ERR_VALIDATION');
          }
          
          // Create sanitized food object
          const sanitizedFood = {
            name: food.name.trim(),
            amount: amount,
            unit: typeof food.unit === 'string' ? food.unit.trim() : 'g',
            protein: Math.max(0, Number(food.protein) || 0),
            carbs: Math.max(0, Number(food.carbs) || 0),
            fat: Math.max(0, Number(food.fat) || 0),
            calories: Math.max(0, Number(food.calories) || 0)
          };
          
          // Preserve foodId if it exists
          if (food.foodId && mongoose.Types.ObjectId.isValid(food.foodId)) {
            sanitizedFood.foodId = food.foodId;
          }
          
          validatedFoods.push(sanitizedFood);
        }
        
        sanitizedUpdate.foods = validatedFoods;
      }
      
      // Ensure we don't accidentally allow userId changes
      if ('userId' in updateData) {
        delete updateData.userId;
      }
      
      // Update the meal with validation
      const updatedMeal = await Meal.findByIdAndUpdate(
        id,
        { $set: sanitizedUpdate },
        { 
          new: true,
          runValidators: true,
          context: 'query'
        }
      );
      
      // Verify the update succeeded
      if (!updatedMeal) {
        return apiError('Failed to update meal', 500, 'ERR_UPDATE_FAILED');
      }
      
      return apiResponse(updatedMeal, true, 'Meal updated successfully');
    } catch (dbError) {
      if (dbError instanceof mongoose.Error.CastError) {
        return apiError('Invalid data format', 400, 'ERR_INVALID_FORMAT');
      }
      if (dbError instanceof mongoose.Error.ValidationError) {
        const errorMessage = Object.values(dbError.errors)
          .map(err => err.message)
          .join(', ');
        return apiError(`Validation error: ${errorMessage}`, 400, 'ERR_VALIDATION');
      }
      return handleApiError(dbError, 'Error updating meal');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing update request');
  }
}, AuthLevel.DEV_OPTIONAL);