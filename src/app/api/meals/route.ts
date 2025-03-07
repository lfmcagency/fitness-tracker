// src/app/api/meals/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Meal from "@/models/Meal";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose, { isValidObjectId } from "mongoose";

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/meals
 * Get meals with filtering and pagination
 */
export const GET = withAuth<ResponseType['data']>(
  async (req: NextRequest, userId: string) => {
    try {
    await dbConnect();
    
    // Get query parameters with defensive handling
    const url = new URL(req.url);
    
    // Date filters
    let startDate = null;
    let endDate = null;
    
    try {
      const startDateParam = url.searchParams.get('startDate');
      if (startDateParam) {
        startDate = new Date(startDateParam);
        if (isNaN(startDate.getTime())) {
          startDate = null;
        }
      }
    } catch (error) {
      console.error('Error parsing startDate parameter:', error);
    }
    
    try {
      const endDateParam = url.searchParams.get('endDate');
      if (endDateParam) {
        endDate = new Date(endDateParam);
        if (isNaN(endDate.getTime())) {
          endDate = null;
        }
      }
    } catch (error) {
      console.error('Error parsing endDate parameter:', error);
    }
    
    // Single date query (for a specific day)
    let date = null;
    try {
      const dateParam = url.searchParams.get('date');
      if (dateParam) {
        date = new Date(dateParam);
        if (isNaN(date.getTime())) {
          date = null;
        } else {
          // Set to start of day
          date.setHours(0, 0, 0, 0);
        }
      }
    } catch (error) {
      console.error('Error parsing date parameter:', error);
    }
    
    // Pagination with defensive parsing
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
    
    // Build query
    const query: any = { userId };
    
    // Date filtering
    if (date) {
      // Find meals for this specific day
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.date = {
        $gte: date,
        $lt: nextDay
      };
    } else if (startDate || endDate) {
      query.date = {};
      
      if (startDate) {
        query.date.$gte = startDate;
      }
      
      if (endDate) {
        query.date.$lte = endDate;
      }
    }
    
    // Get count for pagination with defensive error handling
    let total = 0;
    try {
      total = await Meal.countDocuments(query);
    } catch (countError) {
      console.error('Error counting meals:', countError);
    }
    
    // Get meals with defensive error handling
    let meals = [];
    try {
      meals = await Meal.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);
    } catch (error) {
      return handleApiError(error, 'Error querying meals database');
    }
    
    // Calculate pagination info with defensive math
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    
    // Calculate nutritional totals for returned meals
    const nutritionTotals = {
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0
    };
    
    // Process meals with nutritional calculations and formatting
    const processedMeals = [];
    
    for (const meal of meals) {
      try {
        const mealObj = meal.toObject();
        
        // Calculate meal nutritional totals
        let mealTotals = {
          protein: 0,
          carbs: 0,
          fat: 0,
          calories: 0
        };
        
        // Process foods with defensive array handling
        const processedFoods = [];
        if (Array.isArray(mealObj.foods)) {
          for (const food of mealObj.foods) {
            // Safely add food nutritional values
            mealTotals.protein += food.protein || 0;
            mealTotals.carbs += food.carbs || 0;
            mealTotals.fat += food.fat || 0;
            mealTotals.calories += food.calories || 0;
            
            // Add processed food
            processedFoods.push({
              ...food,
              // Ensure critical fields exist
              name: food.name || 'Unknown Food',
              protein: food.protein || 0,
              carbs: food.carbs || 0,
              fat: food.fat || 0,
              calories: food.calories || 0,
              amount: food.amount || 0
            });
          }
        }
        
        // Add meal totals to overall totals
        nutritionTotals.protein += mealTotals.protein;
        nutritionTotals.carbs += mealTotals.carbs;
        nutritionTotals.fat += mealTotals.fat;
        nutritionTotals.calories += mealTotals.calories;
        
        // Add processed meal to result
        processedMeals.push({
          id: mealObj._id.toString(),
          name: mealObj.name || 'Unnamed Meal',
          date: mealObj.date,
          time: mealObj.time || '',
          notes: mealObj.notes || '',
          foods: processedFoods,
          totals: mealTotals
        });
      } catch (error) {
        console.error('Error processing meal:', error);
        // Add minimal meal data as fallback
        processedMeals.push({
          id: meal._id?.toString() || 'unknown',
          name: meal.name || 'Unnamed Meal',
          date: meal.date,
          foods: []
        });
      }
    }
    
    return apiResponse({
      meals: processedMeals,
      totals: nutritionTotals,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    }, true, `Retrieved ${processedMeals.length} meals`);
  } catch (error) {
    return handleApiError(error, "Error retrieving meals");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/meals
 * Create a new meal
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
      return apiError('Invalid meal data', 400, 'ERR_INVALID_DATA');
    }
    
    // Validate meal name
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return apiError('Meal name is required', 400, 'ERR_VALIDATION');
    }
    
    // Validate and process date
    let mealDate;
    if (body.date) {
      try {
        mealDate = new Date(body.date);
        if (isNaN(mealDate.getTime())) {
          return apiError('Invalid date format', 400, 'ERR_VALIDATION');
        }
      } catch (error) {
        return apiError('Invalid date format', 400, 'ERR_VALIDATION');
      }
    } else {
      mealDate = new Date(); // Default to current date
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (body.time && (typeof body.time !== 'string' || !timeRegex.test(body.time))) {
      return apiError('Invalid time format. Use HH:MM format.', 400, 'ERR_VALIDATION');
    }
    
    // Validate foods array if provided
    const foods = [];
    if (body.foods) {
      if (!Array.isArray(body.foods)) {
        return apiError('Foods must be an array', 400, 'ERR_VALIDATION');
      }
      
      // Process each food with validation
      for (const food of body.foods) {
        try {
          if (!food || typeof food !== 'object') {
            console.warn('Skipping invalid food entry:', food);
            continue;
          }
          
          // Validate food ID if provided
          let foodId = null;
          if (food.foodId) {
            if (!isValidObjectId(food.foodId)) {
              console.warn('Skipping food with invalid foodId:', food.foodId);
              continue;
            }
            foodId = food.foodId;
          } else if (food.id) {
            if (!isValidObjectId(food.id)) {
              console.warn('Skipping food with invalid id:', food.id);
              continue;
            }
            foodId = food.id;
          } else {
            // All foods must have an ID
            console.warn('Skipping food without ID');
            continue;
          }
          
          // Validate name
          const name = food.name && typeof food.name === 'string' ? food.name : 'Unknown Food';
          
          // Validate amount with safe parsing
          let amount = 100; // Default 100g/ml
          if (food.amount !== undefined) {
            if (typeof food.amount === 'string') {
              amount = parseFloat(food.amount);
            } else if (typeof food.amount === 'number') {
              amount = food.amount;
            }
            
            if (isNaN(amount) || amount <= 0) {
              amount = 100; // Default if invalid
            }
          }
          
          // Validate nutritional values with safe parsing
          let protein = 0;
          let carbs = 0;
          let fat = 0;
          let calories = 0;
          
          // Parse protein
          if (food.protein !== undefined) {
            if (typeof food.protein === 'string') {
              protein = parseFloat(food.protein);
            } else if (typeof food.protein === 'number') {
              protein = food.protein;
            }
            
            if (isNaN(protein) || protein < 0) {
              protein = 0;
            }
          }
          
          // Parse carbs
          if (food.carbs !== undefined) {
            if (typeof food.carbs === 'string') {
              carbs = parseFloat(food.carbs);
            } else if (typeof food.carbs === 'number') {
              carbs = food.carbs;
            }
            
            if (isNaN(carbs) || carbs < 0) {
              carbs = 0;
            }
          }
          
          // Parse fat
          if (food.fat !== undefined) {
            if (typeof food.fat === 'string') {
              fat = parseFloat(food.fat);
            } else if (typeof food.fat === 'number') {
              fat = food.fat;
            }
            
            if (isNaN(fat) || fat < 0) {
              fat = 0;
            }
          }
          
          // Parse calories
          if (food.calories !== undefined) {
            if (typeof food.calories === 'string') {
              calories = parseFloat(food.calories);
            } else if (typeof food.calories === 'number') {
              calories = food.calories;
            }
            
            if (isNaN(calories) || calories < 0) {
              calories = 0;
            }
          }
          
          // Calculate calories if not provided
          if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
            calories = (protein * 4) + (carbs * 4) + (fat * 9);
          }
          
          // Add validated food to foods array
          foods.push({
            foodId: new mongoose.Types.ObjectId(foodId),
            name,
            amount,
            protein,
            carbs,
            fat,
            calories,
            // Include serving info if provided
            serving: food.serving && typeof food.serving === 'object' ? food.serving : undefined
          });
        } catch (foodError) {
          console.error('Error processing food entry:', foodError);
          // Skip this food but continue processing others
        }
      }
    }
    
    // Create meal data object
    const mealData = {
      name: body.name.trim(),
      date: mealDate,
      time: body.time || '',
      userId, // Associate with current user
      notes: body.notes && typeof body.notes === 'string' ? body.notes.trim() : '',
      foods: foods
    };
    
    // Create meal with defensive error handling
    let newMeal;
    try {
      newMeal = await Meal.create(mealData);
    } catch (error) {
      return handleApiError(error, 'Error creating meal in database');
    }
    
    // Calculate meal nutritional totals
    const mealTotals = {
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0
    };
    
    for (const food of foods) {
      mealTotals.protein += food.protein || 0;
      mealTotals.carbs += food.carbs || 0;
      mealTotals.fat += food.fat || 0;
      mealTotals.calories += food.calories || 0;
    }
    
    // Format response
    let mealResponse;
    try {
      const mealObj = newMeal.toObject();
      mealResponse = {
        id: mealObj._id.toString(),
        name: mealObj.name,
        date: mealObj.date,
        time: mealObj.time || '',
        notes: mealObj.notes || '',
        foods: mealObj.foods || [],
        totals: mealTotals
      };
    } catch (error) {
      console.error('Error formatting new meal response:', error);
      // Fallback with minimal data
      mealResponse = {
        id: newMeal._id?.toString(),
        name: newMeal.name,
        date: newMeal.date,
        foods: foods.length
      };
    }
    
    return apiResponse(mealResponse, true, 'Meal created successfully', 201);
  } catch (error) {
    return handleApiError(error, "Error creating meal");
  }
}, AuthLevel.DEV_OPTIONAL);