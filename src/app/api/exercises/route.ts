export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';

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
    
    // Fetch exercises - adding debug logs
    console.log('Fetching exercises with query:', JSON.stringify(query));
    
    // Check if the Exercise model is registered
    console.log('Registered models:', Object.keys(require('mongoose').models));
    
    const exercises = await Exercise.find(query)
      .select('name category subcategory progressionLevel difficulty description')
      .sort({ category: 1, progressionLevel: 1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`Found ${exercises.length} exercises`);
    
    // Get total count for pagination
    const total = await Exercise.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: exercises || [], // Ensure data is always an array
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching exercises',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}