// src/app/api/foods/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { FoodData, FoodListData } from "@/types/api/foodResponses";
import { CreateFoodRequest } from "@/types/api/foodRequests";
import { convertFoodToResponse } from "@/types/converters/foodConverters";
import { IFood } from "@/types/models/food";

// Event coordinator integration
import { processEvent, generateToken } from '@/lib/event-coordinator';
import { FoodEvent } from '@/lib/event-coordinator/types';

/**
 * GET /api/foods
 * List foods with optional search
 */
export const GET = withAuth<FoodListData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      
      // Build query - user can see system foods + their own foods
      const query: any = {
        $or: [
          { isSystemFood: true },
          { userId: userId }
        ]
      };
      
      // Add search filter if provided
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$and = [
          query.$or ? { $or: query.$or } : {},
          {
            $or: [
              { name: searchRegex },
              { brand: searchRegex },
              { category: searchRegex },
              { description: searchRegex }
            ]
          }
        ];
        delete query.$or; // Replace with $and structure
      }
      
      // Get foods with pagination
      const skip = (page - 1) * limit;
      
      const [foods, total] = await Promise.all([
        Food.find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit) as Promise<IFood[]>,
        Food.countDocuments(query)
      ]);
      
      // Convert to response format
      const foodResponses = foods.map(food => convertFoodToResponse(food));
      
      return apiResponse({
        foods: foodResponses,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }, true, `Found ${foodResponses.length} foods`);
      
    } catch (error) {
      return handleApiError(error, "Error fetching foods");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/foods
 * Create a new food with EVENT INTEGRATION
 */
export const POST = withAuth<FoodData & { token?: string; achievements?: any }>(  
  async (req: NextRequest, userId: string) => {
    const token = generateToken();
    
    console.log(`🥕 [FOOD-API] POST started with token: ${token}`);
    
    try {
      await dbConnect();
      
      // Parse request body
      let body: CreateFoodRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate required fields
      if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
        return apiError('Food name is required', 400, 'ERR_VALIDATION');
      }
      
      // Validate numeric fields
      const protein = typeof body.protein === 'string' ? parseFloat(body.protein) : body.protein;
      const carbs = typeof body.carbs === 'string' ? parseFloat(body.carbs) : body.carbs;
      const fat = typeof body.fat === 'string' ? parseFloat(body.fat) : body.fat;
      const calories = typeof body.calories === 'string' ? parseFloat(body.calories) : body.calories;
      const servingSize = typeof body.servingSize === 'string' ? parseFloat(body.servingSize) : body.servingSize;
      
      if (isNaN(protein) || protein < 0) {
        return apiError('Protein must be a non-negative number', 400, 'ERR_VALIDATION');
      }
      if (isNaN(carbs) || carbs < 0) {
        return apiError('Carbs must be a non-negative number', 400, 'ERR_VALIDATION');
      }
      if (isNaN(fat) || fat < 0) {
        return apiError('Fat must be a non-negative number', 400, 'ERR_VALIDATION');
      }
      if (isNaN(calories) || calories < 0) {
        return apiError('Calories must be a non-negative number', 400, 'ERR_VALIDATION');
      }
      if (isNaN(servingSize) || servingSize <= 0) {
        return apiError('Serving size must be a positive number', 400, 'ERR_VALIDATION');
      }
      
      // Validate serving unit
      const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];
      const servingUnit = body.servingUnit || 'g';
      if (!validUnits.includes(servingUnit)) {
        return apiError(`Invalid serving unit. Valid units: ${validUnits.join(', ')}`, 400, 'ERR_VALIDATION');
      }
      
      // Create food data
      const foodData = {
        name: body.name.trim(),
        brand: body.brand?.trim(),
        description: body.description?.trim(),
        category: body.category?.trim() || 'Other',
        servingSize,
        servingUnit,
        protein,
        carbs,
        fat,
        calories,
        barcode: body.barcode?.trim(),
        userId: userId, // Associate with user
        isSystemFood: false // User-created food
      };
      
      // Create food
      let newFood: IFood;
      try {
        newFood = await Food.create(foodData) as IFood;
      } catch (error) {
        return handleApiError(error, 'Error creating food in database');
      }
      
      // Convert to response
      const foodResponse = convertFoodToResponse(newFood);
      
      // 🚀 FIRE FOOD EVENT TO COORDINATOR
      try {
        console.log('🥕 [FOOD-API] Firing food_created event to coordinator...');
        
        // Get total food count for user (lifetime)
        const totalFoods = await Food.countDocuments({ userId });
        
        // Build proper FoodEvent
        const foodEvent: FoodEvent = {
          token,
          userId,
          source: 'trophe',
          action: 'food_created',
          timestamp: new Date(),
          metadata: {
            foodResponse
          },
          foodData: {
            foodId: newFood._id.toString(),
            foodName: newFood.name,
            totalFoods,
            isSystemFood: false
          }
        };
        
        console.log('🥕 [FOOD-API] Firing food event:', {
          token,
          action: foodEvent.action,
          foodName: foodEvent.foodData.foodName,
          totalFoods: foodEvent.foodData.totalFoods
        });
        
        const coordinatorResult = await processEvent(foodEvent);
        
        console.log('🎉 [FOOD-API] Coordinator processing complete:', {
          success: coordinatorResult.success,
          achievementsUnlocked: coordinatorResult.achievementsUnlocked?.length || 0,
          token: coordinatorResult.token
        });
        
        // Build response with achievement info if any were unlocked
        let message = 'Food created successfully';
        if (coordinatorResult.achievementsUnlocked && coordinatorResult.achievementsUnlocked.length > 0) {
          message = `Food created and ${coordinatorResult.achievementsUnlocked.length} achievement(s) unlocked!`;
        }
        
        return apiResponse({
          ...foodResponse,
          achievements: coordinatorResult.achievementsUnlocked && coordinatorResult.achievementsUnlocked.length > 0 ? {
            unlockedCount: coordinatorResult.achievementsUnlocked.length,
            achievements: coordinatorResult.achievementsUnlocked,
            token: coordinatorResult.token
          } : undefined,
          token
        }, true, message, 201);
        
      } catch (coordinatorError) {
        console.error('💥 [FOOD-API] Coordinator error:', coordinatorError);
        
        // Still return success since food was saved, but note coordinator failure
        return apiResponse({
          ...foodResponse,
          token
        }, true, 'Food created successfully, but event processing failed', 201);
      }
      
    } catch (error) {
      console.error('💥 [FOOD-API] Unexpected error in POST /api/foods:', error);
      return handleApiError(error, "Error creating food");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);