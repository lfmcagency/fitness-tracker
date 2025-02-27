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
    
    // Fetch exercises
    const exercises = await Exercise.find(query)
      .select('name category subcategory progressionLevel difficulty xpValue')
      .sort({ category: 1, progressionLevel: 1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Exercise.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: exercises,
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
      { success: false, message: 'Error fetching exercises' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.category) {
      return NextResponse.json(
        { success: false, message: 'Name and category are required' },
        { status: 400 }
      );
    }
    
    // Create new exercise
    const exercise = await Exercise.create(body);
    
    return NextResponse.json(
      { success: true, data: exercise },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating exercise:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'Exercise with this name and category already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Error creating exercise' },
      { status: 500 }
    );
  }
}