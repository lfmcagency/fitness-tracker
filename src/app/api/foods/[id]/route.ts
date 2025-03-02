export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Food from '@/models/Food';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { extractPagination, calculateSkip } from '@/lib/validation';

/**
 * GET /api/foods
 * 
 * Get all foods with filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const { page, limit } = extractPagination(url);
    const skip = calculateSkip(page, limit);
    
    // Get query parameters
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category');
    const userId = url.searchParams.get('userId') || null; // Specific user or system foods
    const isSystem = url.searchParams.get('system') === 'true';
    
    // Build query
    const query: any = {};
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by user vs system foods
    if (userId) {
      query.userId = userId;
    } else if (isSystem) {
      query.isSystemFood = true;
    }
    
    // Count total matching foods
    const totalFoods = await Food.countDocuments(query);
    
    // Get foods with pagination
    const foods = await Food.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    
    return apiResponse(
      { 
        foods, 
        categories: await Food.distinct('category'),
        pagination: {
          total: totalFoods,
          page,
          limit,
          pages: Math.ceil(totalFoods / limit),
          hasNextPage: skip + foods.length < totalFoods,
          hasPrevPage: page > 1
        }
      },
      true,                             // Add success flag
      'Foods retrieved successfully'    // Message as third parameter
    );
  } catch (error) {
    return handleApiError(error, 'Error fetching foods');
  }
}

/**
 * POST /api/foods
 * 
 * Create a new food item
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const data = await req.json();
    
    // Set system flag if not provided
    if (data.isSystemFood === undefined) {
      data.isSystemFood = false;
    }
    
    // Create the food
    const newFood = await Food.create(data);
    
    return apiResponse(
      newFood,
      true,                         // Add success flag
      'Food created successfully'   // Message as third parameter
    );
  } catch (error) {
    return handleApiError(error, 'Error creating food');
  }
}

/**
 * PUT /api/foods
 * 
 * Batch update foods (admin only)
 */
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    
    const { foods } = await req.json();
    
    if (!Array.isArray(foods) || foods.length === 0) {
      return apiError('No foods provided for update', 400);
    }
    
    const results = await Promise.all(
      foods.map(async (food) => {
        if (!food._id) {
          return { error: 'Food ID is required', food };
        }
        
        const updatedFood = await Food.findByIdAndUpdate(
          food._id,
          { $set: food },
          { new: true, runValidators: true }
        );
        
        return updatedFood || { error: 'Food not found', id: food._id };
      })
    );
    
    return apiResponse(
      { updated: results },
      true,                             // Add success flag
      `Updated ${results.length} foods` // Message as third parameter
    );
  } catch (error) {
    return handleApiError(error, 'Error updating foods');
  }
}

/**
 * DELETE /api/foods
 * 
 * Batch delete foods (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    
    const { ids } = await req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError('No food IDs provided for deletion', 400);
    }
    
    const result = await Food.deleteMany({ _id: { $in: ids } });
    
    return apiResponse(
      { deleted: result.deletedCount },
      true,                                      // Add success flag
      `Deleted ${result.deletedCount} foods`     // Message as third parameter
    );
  } catch (error) {
    return handleApiError(error, 'Error deleting foods');
  }
}