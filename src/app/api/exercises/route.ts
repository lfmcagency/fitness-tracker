export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const limit = Number(searchParams.get('limit') || '50');
    
    // Build query
    const query: any = {};
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    
    // First check if we can find any exercises at all
    const count = await Exercise.countDocuments({});
    console.log(`Found ${count} exercises in database`);
    
    // Load exercises with query
    const exercises = await Exercise.find(query)
      .limit(Math.min(limit, 100)) // Limit to prevent excessive data loads
      .sort({ category: 1, subcategory: 1, progressionLevel: 1 })
      .lean();
    
    return apiResponse(exercises, `Found ${exercises.length} exercises`);
  } catch (error) {
    return handleApiError(error, 'Error fetching exercises');
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate request body
    if (!body.name || !body.category) {
      return apiError('Name and category are required fields', 400);
    }
    
    // Create new exercise
    const exercise = await Exercise.create(body);
    
    return apiResponse(exercise, 'Exercise created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'Error creating exercise');
  }
}