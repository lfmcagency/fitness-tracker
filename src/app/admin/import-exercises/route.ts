export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';;
import Exercise from '@/models/Exercise';
import mongoose from 'mongoose';

// This endpoint will seed exercises without requiring ODS files
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    console.log('Database connection established');
    
    // Get the current count of exercises
    const exerciseCount = await Exercise.countDocuments();
    console.log(`Current exercise count: ${exerciseCount}`);
    
    if (exerciseCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Database already has ${exerciseCount} exercises. Delete them first to reimport.`,
        count: exerciseCount
      });
    }
    
    // Basic core exercises for progression
    const coreExercises = [
      // Hollow Body progression
      {
        name: "Lying on Back",
        category: "core",
        subcategory: "hollow body",
        description: "Lying flat on your back with arms extended",
        progressionLevel: 1,
        difficulty: "beginner",
      },
      {
        name: "Hollow Hold Bent Legs",
        category: "core",
        subcategory: "hollow body",
        description: "Hollow body position with bent knees",
        progressionLevel: 2,
        difficulty: "beginner",
      },
      {
        name: "Hollow Hold Straight Legs",
        category: "core",
        subcategory: "hollow body",
        description: "Hollow body position with straight legs",
        progressionLevel: 3,
        difficulty: "intermediate",
      },
      {
        name: "Hollow Body Rocks",
        category: "core",
        subcategory: "hollow body",
        description: "Rocking back and forth in the hollow body position",
        progressionLevel: 4,
        difficulty: "intermediate",
      },
      
      // Add 3 more exercises for each category
      // ...
    ];
    
    // Basic push exercises
    const pushExercises = [
      {
        name: "Wall Push-ups",
        category: "push",
        subcategory: "push",
        description: "Push-ups against a wall",
        progressionLevel: 1,
        difficulty: "beginner",
      },
      {
        name: "Incline Push-ups",
        category: "push",
        subcategory: "push",
        description: "Push-ups with hands elevated",
        progressionLevel: 2,
        difficulty: "beginner",
      },
      {
        name: "Standard Push-ups",
        category: "push",
        subcategory: "push",
        description: "Standard push-ups on the floor",
        progressionLevel: 3,
        difficulty: "intermediate",
      },
      {
        name: "Diamond Push-ups",
        category: "push",
        subcategory: "push",
        description: "Push-ups with hands forming a diamond shape",
        progressionLevel: 4,
        difficulty: "advanced",
      },
    ];
    
    // Insert all exercises
    console.log('Creating exercises...');
    
    // Combine all exercises
    const allExercises = [
      ...coreExercises,
      ...pushExercises,
    ];
    
    // Create exercises
    const inserted = await Exercise.insertMany(allExercises);
    console.log(`Inserted ${inserted.length} exercises`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted.length} exercises`,
      count: inserted.length,
      examples: inserted.slice(0, 2)
    });
  } catch (error) {
    console.error('Error importing exercises:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}