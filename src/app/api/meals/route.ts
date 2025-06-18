// src/app/api/meals/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Meal from "@/models/Meal";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose, { isValidObjectId } from "mongoose";
import { MealData } from "@/types/api/mealResponses";
import { CreateMealRequest } from "@/types/api/mealRequests";
import { convertMealToResponse } from "@/types/converters/mealConverters";
import { IMeal } from "@/types/models/meal";

// Event coordinator integration
import { processEvent, generateToken } from '@/lib/event-coordinator';
import { MealEvent } from '@/lib/event-coordinator/types';
import { calculateNutritionContext, getTodayString } from '@/lib/shared-utilities';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/meals
 * Get meals with filtering and pagination
 */
export const GET = withAuth<{
  meals: MealData[];
  totals: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}>(
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
      const query: Record<string, any> = { userId };
      
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
      let meals: IMeal[] = [];
      try {
        meals = await Meal.find(query)
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit) as IMeal[];
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
      const processedMeals = meals.map(meal => {
        // Convert meal to response format
        const mealData = convertMealToResponse(meal);
        
        // Add totals to overall totals
        if (meal.totals) {
          nutritionTotals.protein += meal.totals.protein || 0;
          nutritionTotals.carbs += meal.totals.carbs || 0;
          nutritionTotals.fat += meal.totals.fat || 0;
          nutritionTotals.calories += meal.totals.calories || 0;
        }
        
        return mealData;
      });
      
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
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/meals
 * Create a new meal with CLEAN EVENT INTEGRATION
 */
export const POST = withAuth<MealData & { token?: string; achievements?: any }>(
  async (req: NextRequest, userId: string) => {
    const token = generateToken();
    
    console.log(`🥗 [MEAL-API] POST started with token: ${token}`);
    
    try {
      await dbConnect();
      
      // Parse request body with defensive error handling
      let body: CreateMealRequest;
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
      let mealDate: Date;
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
      
      // Process foods array if provided
      const foods: any[] = [];
      if (body.foods && Array.isArray(body.foods)) {
        for (const food of body.foods) {
          try {
            if (!food || typeof food !== 'object') {
              continue;
            }
            
            // Validate food ID if provided
            let foodId = null;
            if (food.foodId) {
              if (!isValidObjectId(food.foodId)) {
                continue;
              }
              foodId = food.foodId;
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
            
            // Parse nutritional values
            const protein = parseNutrientValue(food.protein);
            const carbs = parseNutrientValue(food.carbs);
            const fat = parseNutrientValue(food.fat);
            let calories = parseNutrientValue(food.calories);
            
            // Calculate calories if not provided
            if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
              calories = (protein * 4) + (carbs * 4) + (fat * 9);
            }
            
            // Add validated food to foods array
            const foodToAdd: any = {
              name,
              amount,
              protein,
              carbs,
              fat,
              calories,
            };
            
            // Add foodId if it exists
            if (foodId) {
              foodToAdd.foodId = new mongoose.Types.ObjectId(foodId);
            }
            
            // Include serving info if provided
            if (food.serving && typeof food.serving === 'object') {
              foodToAdd.serving = food.serving;
            }
            
            foods.push(foodToAdd);
          } catch (foodError) {
            console.error('Error processing food entry:', foodError);
          }
        }
      }
      
      // Create meal data object
      const mealData = {
        name: body.name.trim(),
        date: mealDate,
        time: body.time || '',
        userId,
        notes: body.notes && typeof body.notes === 'string' ? body.notes.trim() : '',
        foods: foods,
        creationToken: token  // Store creation token for threshold tracking
      };
      
      // Create meal with defensive error handling
      let newMeal: IMeal;
      try {
        newMeal = await Meal.create(mealData) as IMeal;
      } catch (error) {
        return handleApiError(error, 'Error creating meal in database');
      }
      
      // Convert to response using converter
      const mealResponse = convertMealToResponse(newMeal);
      
      // 🚀 FIRE MEAL EVENT TO COORDINATOR
      try {
        console.log('🥗 [MEAL-API] Firing meal_created event to coordinator...');
        
        // Get all meals for today to calculate total count
        const todayStart = new Date(mealDate);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        
        const allMealsToday = await Meal.find({
          userId,
          date: { $gte: todayStart, $lt: todayEnd }
        }) as IMeal[];
        
        // Get total meal count for user (lifetime)
        const totalMeals = await Meal.countDocuments({ userId });
        
        // Default macro goals (TODO: get from user profile)
        const macroGoals = {
          protein: 140,
          carbs: 200,
          fat: 70,
          calories: 2200
        };
        
        // Calculate nutrition context using shared utility
        const nutritionContext = calculateNutritionContext(
          userId,
          mealDate.toISOString().split('T')[0],
          allMealsToday.map(m => convertMealToResponse(m)),
          macroGoals
        );
        
        // Build proper MealEvent
        const mealEvent: MealEvent = {
          token,
          userId,
          source: 'trophe',
          action: 'meal_created',
          timestamp: new Date(),
          metadata: {
            mealResponse,
            nutritionContext
          },
          mealData: {
            mealId: newMeal._id.toString(),
            mealName: newMeal.name,
            mealDate: mealDate.toISOString().split('T')[0],
            totalMeals,
            dailyMacroProgress: nutritionContext.dailyMacroProgress,
            macroTotals: nutritionContext.macroTotals
          }
        };
        
        console.log('🥗 [MEAL-API] Firing meal event:', {
          token,
          action: mealEvent.action,
          mealName: mealEvent.mealData.mealName,
          macroProgress: mealEvent.mealData.dailyMacroProgress.total
        });
        
        const coordinatorResult = await processEvent(mealEvent);
        
        console.log('🎉 [MEAL-API] Coordinator processing complete:', {
          success: coordinatorResult.success,
          achievementsUnlocked: coordinatorResult.achievementsUnlocked?.length || 0,
          token: coordinatorResult.token
        });
        
        // Build response with achievement info if any were unlocked
        let message = 'Meal created successfully';
        if (coordinatorResult.achievementsUnlocked && coordinatorResult.achievementsUnlocked.length > 0) {
          message = `Meal logged and ${coordinatorResult.achievementsUnlocked.length} achievement(s) unlocked!`;
        }
        
        return apiResponse({
          ...mealResponse,
          achievements: coordinatorResult.achievementsUnlocked && coordinatorResult.achievementsUnlocked.length > 0 ? {
            unlockedCount: coordinatorResult.achievementsUnlocked.length,
            achievements: coordinatorResult.achievementsUnlocked,
            token: coordinatorResult.token
          } : undefined,
          token
        }, true, message, 201);
        
      } catch (coordinatorError) {
        console.error('💥 [MEAL-API] Coordinator error:', coordinatorError);
        
        // Still return success since meal was saved, but note coordinator failure
        return apiResponse({
          ...mealResponse,
          token
        }, true, 'Meal created successfully, but event processing failed', 201);
      }
      
    } catch (error) {
      console.error('💥 [MEAL-API] Unexpected error in POST /api/meals:', error);
      return handleApiError(error, "Error creating meal");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * Helper function to safely parse nutrient values
 */
function parseNutrientValue(value: any): number {
  if (value === undefined || value === null) return 0;
  
  let parsedValue: number;
  if (typeof value === 'string') {
    parsedValue = parseFloat(value);
  } else if (typeof value === 'number') {
    parsedValue = value;
  } else {
    return 0;
  }
  
  return !isNaN(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}