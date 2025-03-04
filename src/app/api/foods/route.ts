export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Food from '@/models/Food';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

/**
 * Helper function to extract and validate pagination parameters
 */
const extractPagination = (url: URL) => {
  let page = 1;
  let limit = 50;
  
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
  
  return { page, limit };
};

/**
 * Calculate skip value for pagination
 */
const calculateSkip = (page: number, limit: number) => {
  return (Math.max(1, page) - 1) * Math.max(1, limit);
};

/**
 * GET /api/foods
 * 
 * Get all foods with filtering and pagination
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const { page, limit } = extractPagination(url);
    const skip = calculateSkip(page, limit);
    
    // Get query parameters with defensive checks
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || null;
    
    // By default show both user foods and system foods
    const isSystemParam = url.searchParams.get('system');
    const isUserParam = url.searchParams.get('user');
    
    // Build query with defensive checks
    const query: any = {};
    
    // Search by name with defensive string check
    if (search && typeof search === 'string' && search.trim() !== '') {
      query.name = { $regex: search.trim(), $options: 'i' };
    }
    
    // Filter by category with defensive string check
    if (category && typeof category === 'string' && category.trim() !== '') {
      query.category = category.trim();
    }
    
    // Filter system vs user foods
    if (isSystemParam === 'true' && isUserParam !== 'true') {
      // Only system foods
      query.isSystemFood = true;
    } else if (isSystemParam !== 'true' && isUserParam === 'true') {
      // Only user foods
      query.isSystemFood = false;
      query.userId = userId;
    } else {
      // Both system foods and user's foods
      query.$or = [
        { isSystemFood: true },
        { userId: userId }
      ];
    }
    
    // Initialize results with defaults
    let totalFoods = 0;
    let foods = [];
    let categories = [];
    
    try {
      // Count total matching foods
      totalFoods = await Food.countDocuments(query);
    } catch (countError) {
      console.error('Error counting foods:', countError);
      // Continue with default 0
    }
    
    try {
      // Get foods with pagination
      foods = await Food.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);
      
      // Ensure foods is always an array
      if (!Array.isArray(foods)) {
        foods = [];
      }
    } catch (findError) {
      return handleApiError(findError, 'Error fetching foods');
    }
    
    try {
      // Get distinct categories for filtering
      categories = await Food.distinct('category');
      
      // Ensure categories is always an array
      if (!Array.isArray(categories)) {
        categories = [];
      }
    } catch (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      // Continue with empty array
    }
    
    // Calculate pagination info with defensive math
    const totalPages = Math.ceil(Math.max(totalFoods, 0) / Math.max(limit, 1));
    
    return apiResponse(
      { 
        foods, 
        categories,
        pagination: {
          total: totalFoods,
          page,
          limit,
          pages: totalPages,
          hasNextPage: skip + foods.length < totalFoods,
          hasPrevPage: page > 1
        }
      },
      true,
      'Foods retrieved successfully'
    );
  } catch (error) {
    return handleApiError(error, 'Error fetching foods');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/foods
 * 
 * Create a new food item
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
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
    
    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return apiError('Food name is required', 400, 'ERR_VALIDATION');
    }
    
    // Validate and sanitize serving size
    let servingSize = 100; // Default serving size
    try {
      servingSize = Number(data.servingSize);
      if (isNaN(servingSize) || servingSize <= 0) {
        return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
    }
    
    // Prepare food data with defensive parsing
    const foodData = {
      name: data.name.trim(),
      description: typeof data.description === 'string' ? data.description.trim() : '',
      servingSize: servingSize,
      servingUnit: typeof data.servingUnit === 'string' && data.servingUnit.trim() !== ''
        ? data.servingUnit.trim()
        : 'g', // Default unit
      protein: Math.max(0, Number(data.protein) || 0),
      carbs: Math.max(0, Number(data.carbs) || 0),
      fat: Math.max(0, Number(data.fat) || 0),
      calories: Math.max(0, Number(data.calories) || 0),
      category: typeof data.category === 'string' ? data.category.trim() : '',
      isSystemFood: data.isSystemFood === true // Default to user food
    };
    
    // Add userId for user foods
    if (!foodData.isSystemFood) {
      foodData.userId = userId;
    }
    
    // Create the food with proper error handling
    try {
      const newFood = await Food.create(foodData);
      return apiResponse(
        newFood,
        true,
        'Food created successfully',
        201
      );
    } catch (dbError) {
      if (dbError.name === 'ValidationError') {
        const errorMessage = Object.values(dbError.errors)
          .map(err => err.message)
          .join(', ');
        return apiError(`Validation error: ${errorMessage}`, 400, 'ERR_VALIDATION');
      }
      return handleApiError(dbError, 'Error creating food');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing food creation');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PUT /api/foods
 * 
 * Batch update foods (admin only)
 */
export const PUT = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate foods array
    const { foods } = body || {};
    
    if (!Array.isArray(foods) || foods.length === 0) {
      return apiError('No foods provided for update', 400, 'ERR_VALIDATION');
    }
    
    const results = [];
    const errors = [];
    
    // Process each food update with defensive error handling
    for (const food of foods) {
      try {
        // Validate food has an ID
        if (!food._id) {
          errors.push({ error: 'Food ID is required', food });
          continue;
        }
        
        // Check if user has permission to update this food
        const existingFood = await Food.findById(food._id);
        
        if (!existingFood) {
          errors.push({ error: 'Food not found', id: food._id });
          continue;
        }
        
        // Check if user can update (must be admin or own the food)
        if (!existingFood.isSystemFood && 
            existingFood.userId && 
            existingFood.userId.toString() !== userId.toString()) {
          errors.push({ error: 'Permission denied', id: food._id });
          continue;
        }
        
        // Sanitize update fields with defensive parsing
        const updateData = {
          name: typeof food.name === 'string' && food.name.trim() !== ''
            ? food.name.trim()
            : existingFood.name,
            
          description: typeof food.description === 'string'
            ? food.description.trim()
            : existingFood.description || '',
            
          servingSize: typeof food.servingSize === 'number' && food.servingSize > 0
            ? food.servingSize
            : existingFood.servingSize,
            
          servingUnit: typeof food.servingUnit === 'string' && food.servingUnit.trim() !== ''
            ? food.servingUnit.trim()
            : existingFood.servingUnit,
            
          protein: typeof food.protein === 'number'
            ? Math.max(0, food.protein)
            : existingFood.protein,
            
          carbs: typeof food.carbs === 'number'
            ? Math.max(0, food.carbs)
            : existingFood.carbs,
            
          fat: typeof food.fat === 'number'
            ? Math.max(0, food.fat)
            : existingFood.fat,
            
          calories: typeof food.calories === 'number'
            ? Math.max(0, food.calories)
            : existingFood.calories,
            
          category: typeof food.category === 'string'
            ? food.category.trim()
            : existingFood.category || ''
        };
        
        // Update the food
        const updatedFood = await Food.findByIdAndUpdate(
          food._id,
          { $set: updateData },
          { new: true, runValidators: true }
        );
        
        results.push(updatedFood);
      } catch (updateError) {
        errors.push({ 
          error: updateError.message || 'Update error', 
          id: food._id 
        });
      }
    }
    
    return apiResponse(
      { 
        updated: results,
        errors: errors.length > 0 ? errors : undefined
      },
      true,
      `Updated ${results.length} foods${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    );
  } catch (error) {
    return handleApiError(error, 'Error updating foods');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * DELETE /api/foods
 * 
 * Batch delete foods
 */
export const DELETE = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid request body', 400, 'ERR_INVALID_JSON');
    }
    
    const { ids } = body || {};
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError('No food IDs provided for deletion', 400, 'ERR_VALIDATION');
    }
    
    // Filter invalid IDs
    const validIds = ids.filter(id => id && typeof id === 'string');
    
    if (validIds.length === 0) {
      return apiError('No valid food IDs provided', 400, 'ERR_VALIDATION');
    }
    
    // Find foods user is allowed to delete
    const foods = await Food.find({
      _id: { $in: validIds },
      $or: [
        { userId: userId },
        { isSystemFood: true }
      ]
    });
    
    if (!foods || foods.length === 0) {
      return apiError('No foods found that you can delete', 404, 'ERR_NOT_FOUND');
    }
    
    // Filter to IDs user has permission to delete
    const allowedIds = foods.map(food => food._id);
    
    // Delete foods
    const result = await Food.deleteMany({ _id: { $in: allowedIds } });
    
    return apiResponse(
      { 
        deleted: result.deletedCount,
        requested: ids.length,
        authorized: allowedIds.length
      },
      true,
      `Deleted ${result.deletedCount} foods`
    );
  } catch (error) {
    return handleApiError(error, 'Error deleting foods');
  }
}, AuthLevel.DEV_OPTIONAL);