export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/exercises/search
 * 
 * Search exercises by text query with advanced filtering
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q'); // Search query
    
    // Filtering parameters
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const difficulty = searchParams.get('difficulty');
    const minLevel = searchParams.get('minLevel');
    const maxLevel = searchParams.get('maxLevel');
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const page = parseInt(searchParams.get('page') || '1', 10);
    
    // Build the search query
    const searchQuery: any = {};
    
    // Text search if query is provided
    if (q && q.trim().length > 0) {
      // Use text search if query has multiple words
      if (q.trim().includes(' ')) {
        searchQuery.$text = { $search: q };
      } else {
        // For single word, use regex for more flexible matching
        searchQuery.$or = [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { formCues: { $regex: q, $options: 'i' } },
          { primaryMuscleGroup: { $regex: q, $options: 'i' } },
          { secondaryMuscleGroups: { $regex: q, $options: 'i' } }
        ];
      }
    }
    
    // Add filters if provided
    if (category) searchQuery.category = category;
    if (subcategory) searchQuery.subcategory = subcategory;
    if (difficulty) searchQuery.difficulty = difficulty;
    
    // Add progression level range if provided
    if (minLevel || maxLevel) {
      searchQuery.progressionLevel = {};
      if (minLevel) searchQuery.progressionLevel.$gte = parseInt(minLevel, 10);
      if (maxLevel) searchQuery.progressionLevel.$lte = parseInt(maxLevel, 10);
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build the query
    let query = Exercise.find(searchQuery);
    
    // Add text score sorting if using text search
    if (q && q.trim().includes(' ')) {
      query = query.sort({ score: { $meta: 'textScore' } });
    } else {
      // Otherwise sort by category and progression level
      query = query.sort({ category: 1, progressionLevel: 1 });
    }
    
    // Apply pagination and field selection
    const exercises = await query
      .select('name category subcategory progressionLevel difficulty description uniqueId')
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Exercise.countDocuments(searchQuery);
    
    return apiResponse({
      exercises,
      query: q || '',
      filters: {
        category,
        subcategory,
        difficulty,
        minLevel: minLevel ? parseInt(minLevel, 10) : undefined,
        maxLevel: maxLevel ? parseInt(maxLevel, 10) : undefined
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error searching exercises');
  }
}