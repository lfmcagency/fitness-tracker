export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import Exercise from '@/models/Exercise';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    
    // Build query
    const query: any = {};
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    
    // Use direct mongoose query for troubleshooting
    if (!mongoose.models.Exercise) {
      console.error('Exercise model not found!');
      return NextResponse.json({ 
        success: false,
        message: 'Error: Exercise model not found' 
      }, { status: 500 });
    }
    
    // First check if we can find any exercises at all
    const count = await Exercise.countDocuments({});
    console.log(`Found ${count} exercises in database`);
    
    // Load exercises with simple query
    const exercises = await Exercise.find(query).limit(50).lean();
    
    return NextResponse.json({ 
      success: true, 
      data: exercises,
      count: exercises.length,
      totalCount: count
    });
  } catch (error) {
    console.error("Error in GET /api/exercises:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching exercises',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}