import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { getAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Comment out DB connection temporarily to avoid errors
    // await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    
    // Mock data for development
    const mockExercises = [
      { id: 1, name: "Push-ups", category: "push", progressionLevel: 1 },
      { id: 2, name: "Pull-ups", category: "pull", progressionLevel: 2 },
      { id: 3, name: "Squats", category: "legs", progressionLevel: 1 }
    ];
    
    // Filter by category if provided
    let exercises = mockExercises;
    if (category) {
      exercises = exercises.filter(ex => ex.category === category);
    }
    
    return NextResponse.json({ success: true, data: exercises });
    
    // When MongoDB is configured correctly, use this:
    /*
    const query: any = {};
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    
    const exercises = await Exercise.find(query).sort({ progressionLevel: 1 });
    return NextResponse.json({ success: true, data: exercises });
    */
  } catch (error) {
    console.error("Error in GET /api/exercises:", error);
    return NextResponse.json({ success: false, message: 'Error fetching exercises' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Comment out DB connection temporarily to avoid errors
    // await dbConnect();
    
    const session = await getAuth();
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    
    // Mock response for development
    return NextResponse.json({ 
      success: true, 
      data: { id: Date.now(), ...body } 
    }, { status: 201 });
    
    // When MongoDB is configured correctly, use this:
    /*
    const exercise = await Exercise.create(body);
    return NextResponse.json({ success: true, data: exercise }, { status: 201 });
    */
  } catch (error) {
    console.error("Error in POST /api/exercises:", error);
    return NextResponse.json({ success: false, message: 'Error creating exercise' }, { status: 400 });
  }
}