// src/app/api/foods/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';;
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/foods
 * Get foods with filtering, searching and pagination
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get query parameters with defensive handling
    const url = new URL(req.url);
    
    // Search term
    const search = url.searchParams.get('search') || '';
    
    // Pagination params with defensive parsing
    let page = DEFAULT_PAGE;
    let limit = DEFAULT_LIMIT;
    
    try {
      const pageParam = url.searchParams.get('page');
      if (pageParam) {
        const parsedPage = parseInt(pageParam);
        if (!isNaN(parsedPage) && parsedPage > 0) {
          page = parsedPage;
        }
      }
    } catch (error) {
      console.error('Error parsing page parameter:', error);
    }
    
    try {
      const limitParam = url.searchParams.get('limit');
      if (limitParam) {
        const parsedLimit = parseInt(limitParam);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, MAX_LIMIT);
        }
      }
    } catch (error) {
      console.error('Error parsing limit parameter:', error);
    }
    
    const skip = (page - 1) * limit;
    
    // Category filter
    const category = url.searchParams.get('category') || null;
    
    // User filter - allow admins to see all foods, regular users see system foods + their own
    const userFilter = url.searchParams.get('user');
    let userQuery = {};
    
    // Default to showing system foods (null userId) and user's foods
    if (!userFilter || userFilter === 'all') {
      userQuery = { $or: [{ userId: null }, { userId: userId }] };
    } else if (userFilter === 'system') {
      userQuery = { userId: null };
    } else if (userFilter === 'user') {
      userQuery = { userId: userId };
    }
    
    // Nutritional value filters with defensive parsing
    const nutritionFilters = {};
    const nutritionParams = ['minProtein', 'maxProtein', 'minCarbs', 'maxCarbs', 'minFat', 'maxFat', 'minCalories', 'maxCalories'];
    
    for (const param of nutritionParams) {
      try {
        const value = url.searchParams.get(param);
        if (value !== null) {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            const field = param.substring(3).toLowerCase(); // Remove 'min'/'max' prefix
            const operator = param.startsWith('min') ? '$gte' : '$lte';
            
            if (!nutritionFilters[field]) {
              nutritionFilters[field] = {};
            }
            nutritionFilters[field][operator] = parsed;
          }
        }
      } catch (error) {
        console.error(`Error parsing nutrition parameter ${param}:`, error);
      }
    }
    
    // Build query
    const query: any = { ...userQuery };
    
    // Add search if provided
    if (search && search.trim() !== '') {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Add category if provided
    if (category && category.trim() !== '') {
      query.category = category;
    }
    
    // Add nutrition filters
    Object.entries(nutritionFilters).forEach(([field, value]) => {
      query[field] = value;
    });
    
    // Get count for pagination with defensive error handling
    let total = 0;
    try {
      total = await Food.countDocuments(query);
    } catch (countError) {
      console.error('Error counting foods:', countError);
    }
    
    // Get foods with defensive error handling
    let foods = [];
    try {
      foods = await Food.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);
    } catch (error) {
      return handleApiError(error, 'Error querying foods database');
    }
    
    // Calculate pagination info with defensive math
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    
    // Safely transform food documents to objects
    const formattedFoods = [];
    
    for (const food of foods) {
      try {
        const foodObj = food.toObject();
        formattedFoods.push({
          ...foodObj,
          id: foodObj._id.toString(),
          _id: undefined,
          // Ensure critical fields exist
          name: foodObj.name || 'Unknown Food',
          protein: foodObj.protein || 0,
          carbs: foodObj.carbs || 0,
          fat: foodObj.fat || 0,
          calories: foodObj.calories || 0,
          isUserFood: foodObj.userId ? true : false,
          isVerified: foodObj.isVerified || false
        });
      } catch (error) {
        console.error('Error formatting food object:', error);
        // Add minimal food data as fallback
        formattedFoods.push({
          id: food._id?.toString() || 'unknown',
          name: food.name || 'Unknown Food',
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
          calories: food.calories || 0
        });
      }
    }
    
    return apiResponse({
      foods: formattedFoods,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    }, true, `Retrieved ${formattedFoods.length} foods`);
  } catch (error) {
    return handleApiError(error, "Error retrieving foods");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/foods
 * Create a new food
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
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
    
    // Basic validation with defensive string/number checks
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return apiError('Food name is required', 400, 'ERR_VALIDATION');
    }
    
    // Validate nutritional values with safe parsing
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let calories = 0;
    
    // Validate protein
    if (body.protein !== undefined) {
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
    }
    
    // Validate carbs
    if (body.carbs !== undefined) {
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
    }
    
    // Validate fat
    if (body.fat !== undefined) {
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
    }
    
    // Validate calories
    if (body.calories !== undefined) {
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
    }
    
    // Validate serving data
    const serving = {
      size: 100, // Default
      unit: 'g'   // Default
    };
    
    if (body.serving && typeof body.serving === 'object') {
      // Validate serving size
      if (body.serving.size !== undefined) {
        if (typeof body.serving.size === 'string') {
          serving.size = parseFloat(body.serving.size);
        } else if (typeof body.serving.size === 'number') {
          serving.size = body.serving.size;
        }
        
        if (isNaN(serving.size) || serving.size <= 0) {
          return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate serving unit
      if (body.serving.unit !== undefined) {
        if (typeof body.serving.unit === 'string' && body.serving.unit.trim() !== '') {
          const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];
          const unit = body.serving.unit.toLowerCase().trim();
          
          if (validUnits.includes(unit)) {
            serving.unit = unit;
          } else {
            return apiError(`Invalid serving unit. Valid units: ${validUnits.join(', ')}`, 400, 'ERR_VALIDATION');
          }
        } else {
          return apiError('Serving unit must be a non-empty string', 400, 'ERR_VALIDATION');
        }
      }
    }
    
    // Calculate calories if not provided using standard multipliers
    if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
      calories = (protein * 4) + (carbs * 4) + (fat * 9);
    }
    
    // Create food data object
    const foodData: any = {
      name: body.name.trim(),
      protein,
      carbs,
      fat,
      calories,
      serving,
      userId, // Associate with current user
      isVerified: false, // User-added foods are not verified by default
      category: body.category && typeof body.category === 'string' ? body.category.trim() : 'Other',
      description: body.description && typeof body.description === 'string' ? body.description.trim() : '',
      brand: body.brand && typeof body.brand === 'string' ? body.brand.trim() : '',
    };
    
    // Add barcode if provided
    if (body.barcode && typeof body.barcode === 'string' && body.barcode.trim() !== '') {
      foodData.barcode = body.barcode.trim();
    }
    
    // Create food with defensive error handling
    let newFood;
    try {
      newFood = await Food.create(foodData);
    } catch (error) {
      return handleApiError(error, 'Error creating food in database');
    }
    
    // Format response
    let foodResponse;
    try {
      const foodObj = newFood.toObject();
      foodResponse = {
        ...foodObj,
        id: foodObj._id.toString(),
        _id: undefined
      };
    } catch (error) {
      console.error('Error formatting new food response:', error);
      // Fallback with minimal data
      foodResponse = {
        id: newFood._id?.toString(),
        name: newFood.name,
        protein,
        carbs,
        fat,
        calories
      };
    }
    
    return apiResponse(foodResponse, true, 'Food created successfully', 201);
  } catch (error) {
    return handleApiError(error, "Error creating food");
  }
}, AuthLevel.DEV_OPTIONAL);