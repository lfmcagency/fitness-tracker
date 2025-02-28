export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, handleApiError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    
    // Build query
    const query: any = {};
    if (category) query.category = category;
    if (level) query.progressionLevel = parseInt(level, 10);
    
    // Pagination
    const skip = (page - 1) * limit;
    
    // Fetch exercises
    const exercises = await Exercise.find(query)
      .select('name category subcategory progressionLevel difficulty xpValue')
      .sort({ category: 1, progressionLevel: 1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Exercise.countDocuments(query);
    
    return apiResponse({
      data: exercises,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching exercises');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.category) {
      return apiResponse(
        null,
        'Name and category are required',
        400
      );
    }
    
    // Create new exercise
    const exercise = await Exercise.create(body);
    
    return apiResponse(
      exercise,
      'Exercise created successfully',
      201
    );
  } catch (error) {
    return handleApiError(error, 'Error creating exercise');
  }
}