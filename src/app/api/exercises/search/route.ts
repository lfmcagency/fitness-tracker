export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, handleApiError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    
    if (!query && !category && !level) {
      return apiResponse([], 'No search criteria provided');
    }
    
    // Build the search query
    const searchQuery: any = {};
    
    // Text search if query is provided
    if (query && query.length >= 2) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Add category filter
    if (category) {
      searchQuery.category = category;
    }
    
    // Add level filter
    if (level) {
      const levelNum = parseInt(level);
      if (!isNaN(levelNum)) {
        searchQuery.progressionLevel = levelNum;
      }
    }
    
    const exercises = await Exercise.find(searchQuery)
      .select('name category subcategory progressionLevel description')
      .sort({ progressionLevel: 1 })
      .limit(20);
    
    return apiResponse(exercises);
  } catch (error) {
    return handleApiError(error, 'Error searching exercises');
  }
}