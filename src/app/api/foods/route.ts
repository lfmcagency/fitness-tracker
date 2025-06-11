export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Food from "@/models/Food";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { FoodData } from "@/types/api/foodResponses";
import { CreateFoodRequest } from "@/types/api/foodRequests";
import { convertFoodToResponse } from "@/types/converters/foodConverters";
import { IFood } from "@/types/models/food";

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/foods
 * Get foods with optional search and pagination
 */
export const GET = withAuth<{
  foods: FoodData[];
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
      
      // Get query parameters
      const url = new URL(req.url);
      const search = url.searchParams.get('search');
      const category = url.searchParams.get('category');
      
      // Pagination
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
      
      // Build query - include system foods and user's custom foods
      const query: Record<string, any> = {
        $or: [
          { isSystemFood: true },
          { userId: userId }
        ]
      };
      
      // Add search filter
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$and = [
          query.$or ? { $or: query.$or } : {},
          {
            $or: [
              { name: searchRegex },
              { brand: searchRegex },
              { description: searchRegex }
            ]
          }
        ];
        delete query.$or; // Move to $and
      }
      
      // Add category filter
      if (category && category.trim()) {
        if (query.$and) {
          query.$and.push({ category: category.trim() });
        } else {
          query.category = category.trim();
        }
      }
      
      // Get count for pagination
      let total = 0;
      try {
        total = await Food.countDocuments(query);
      } catch (countError) {
        console.error('Error counting foods:', countError);
      }
      
      // Get foods
      let foods: IFood[] = [];
      try {
        foods = await Food.find(query)
          .sort({ name: 1 }) // Sort alphabetically
          .skip(skip)
          .limit(limit) as IFood[];
      } catch (error) {
        return handleApiError(error, 'Error querying foods database');
      }
      
      // Calculate pagination info
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
      
      // Convert foods to response format
      const processedFoods = foods.map(food => convertFoodToResponse(food));
      
      return apiResponse({
        foods: processedFoods,
        pagination: {
          total,
          page,
          limit,
          pages: totalPages
        }
      }, true, `Retrieved ${processedFoods.length} foods`);
    } catch (error) {
      return handleApiError(error, "Error retrieving foods");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/foods
 * Create a new custom food
 */
export const POST = withAuth<FoodData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse request body
      let body: CreateFoodRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid food data', 400, 'ERR_INVALID_DATA');
      }
      
      // Validate required fields
      if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
        return apiError('Food name is required', 400, 'ERR_VALIDATION');
      }
      
      // Create food data
      const foodData = {
        name: body.name.trim(),
        brand: body.brand?.trim() || '',
        description: body.description?.trim() || '',
        category: body.category?.trim() || 'Other',
        servingSize: body.servingSize || 100,
        servingUnit: body.servingUnit || 'g',
        protein: body.protein || 0,
        carbs: body.carbs || 0,
        fat: body.fat || 0,
        calories: body.calories || 0,
        barcode: body.barcode?.trim() || '',
        userId, // Associate with current user
        isSystemFood: false // User-created foods are not system foods
      };
      
      // Auto-calculate calories if not provided
      if (!foodData.calories && (foodData.protein || foodData.carbs || foodData.fat)) {
        foodData.calories = Math.round(
          (foodData.protein * 4) + (foodData.carbs * 4) + (foodData.fat * 9)
        );
      }
      
      // Create food
      let newFood: IFood;
      try {
        newFood = await Food.create(foodData) as IFood;
      } catch (error) {
        return handleApiError(error, 'Error creating food in database');
      }
      
      // Convert to response format
      const foodResponse = convertFoodToResponse(newFood);
      
      return apiResponse(foodResponse, true, 'Food created successfully', 201);
    } catch (error) {
      return handleApiError(error, "Error creating food");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);