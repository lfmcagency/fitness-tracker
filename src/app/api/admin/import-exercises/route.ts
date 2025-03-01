export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';

// This endpoint will seed exercises without requiring ODS files
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get the current count of exercises
    const exerciseCount = await Exercise.countDocuments();
    
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
        xpValue: 5
      },
      {
        name: "Hollow Hold Bent Legs",
        category: "core",
        subcategory: "hollow body",
        description: "Hollow body position with bent knees",
        progressionLevel: 2,
        difficulty: "beginner",
        xpValue: 10
      },
      {
        name: "Hollow Hold Straight Legs",
        category: "core",
        subcategory: "hollow body",
        description: "Hollow body position with straight legs",
        progressionLevel: 3,
        difficulty: "intermediate",
        xpValue: 15
      },
      {
        name: "Hollow Body Rocks",
        category: "core",
        subcategory: "hollow body",
        description: "Rocking back and forth in the hollow body position",
        progressionLevel: 4,
        difficulty: "intermediate",
        xpValue: 20
      },
      
      // Leg Raises progression
      {
        name: "Knee Raises",
        category: "core",
        subcategory: "leg raises",
        description: "Lying on back, raising knees to chest",
        progressionLevel: 1,
        difficulty: "beginner",
        xpValue: 5
      },
      {
        name: "Flat Leg Raises",
        category: "core",
        subcategory: "leg raises",
        description: "Lying on back, raising straight legs",
        progressionLevel: 2,
        difficulty: "beginner",
        xpValue: 10
      },
      {
        name: "Hanging Knee Raises",
        category: "core",
        subcategory: "leg raises",
        description: "Hanging from bar, raising knees to chest",
        progressionLevel: 3,
        difficulty: "intermediate",
        xpValue: 15
      },
      {
        name: "Hanging Leg Raises",
        category: "core",
        subcategory: "leg raises",
        description: "Hanging from bar, raising straight legs",
        progressionLevel: 4,
        difficulty: "advanced",
        xpValue: 20
      },
      
      // Plank progression
      {
        name: "Incline Plank",
        category: "core",
        subcategory: "plank",
        description: "Plank with elevated support",
        progressionLevel: 1,
        difficulty: "beginner",
        xpValue: 5
      },
      {
        name: "Standard Plank",
        category: "core",
        subcategory: "plank",
        description: "Standard plank on forearms",
        progressionLevel: 2,
        difficulty: "beginner",
        xpValue: 10
      },
      {
        name: "One Arm Plank",
        category: "core",
        subcategory: "plank",
        description: "Plank with one arm support",
        progressionLevel: 3,
        difficulty: "intermediate",
        xpValue: 15
      },
      {
        name: "Long Lever Plank",
        category: "core",
        subcategory: "plank",
        description: "Plank with arms extended forward",
        progressionLevel: 4,
        difficulty: "advanced",
        xpValue: 20
      }
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
        xpValue: 5
      },
      {
        name: "Incline Push-ups",
        category: "push",
        subcategory: "push",
        description: "Push-ups with hands elevated",
        progressionLevel: 2,
        difficulty: "beginner",
        xpValue: 10
      },
      {
        name: "Standard Push-ups",
        category: "push",
        subcategory: "push",
        description: "Standard push-ups on the floor",
        progressionLevel: 3,
        difficulty: "intermediate",
        xpValue: 15
      },
      {
        name: "Diamond Push-ups",
        category: "push",
        subcategory: "push",
        description: "Push-ups with hands forming a diamond shape",
        progressionLevel: 4,
        difficulty: "advanced",
        xpValue: 20
      }
    ];
    
    // Basic pull exercises
    const pullExercises = [
      {
        name: "Scapular Pulls",
        category: "pull",
        subcategory: "pull",
        description: "Hanging from bar, retracting shoulder blades",
        progressionLevel: 1,
        difficulty: "beginner",
        xpValue: 5
      },
      {
        name: "Negative Pull-ups",
        category: "pull",
        subcategory: "pull",
        description: "Jumping to top position and lowering slowly",
        progressionLevel: 2,
        difficulty: "beginner",
        xpValue: 10
      },
      {
        name: "Pull-ups",
        category: "pull",
        subcategory: "pull",
        description: "Standard pull-ups",
        progressionLevel: 3,
        difficulty: "intermediate",
        xpValue: 15
      },
      {
        name: "L-sit Pull-ups",
        category: "pull",
        subcategory: "pull",
        description: "Pull-ups with legs extended forward in L-position",
        progressionLevel: 4,
        difficulty: "advanced",
        xpValue: 20
      }
    ];
    
    // Basic leg exercises
    const legExercises = [
      {
        name: "Assisted Squats",
        category: "legs",
        subcategory: "squat",
        description: "Squats with support (holding onto something)",
        progressionLevel: 1,
        difficulty: "beginner",
        xpValue: 5
      },
      {
        name: "Full Squats",
        category: "legs",
        subcategory: "squat",
        description: "Standard bodyweight squats",
        progressionLevel: 2,
        difficulty: "beginner",
        xpValue: 10
      },
      {
        name: "Bulgarian Split Squats",
        category: "legs",
        subcategory: "squat",
        description: "Single leg squats with rear foot elevated",
        progressionLevel: 3,
        difficulty: "intermediate",
        xpValue: 15
      },
      {
        name: "Pistol Squats",
        category: "legs",
        subcategory: "squat",
        description: "Single leg squats with other leg extended",
        progressionLevel: 4,
        difficulty: "advanced",
        xpValue: 20
      }
    ];
    
    // Combine all exercises
    const allExercises = [
      ...coreExercises,
      ...pushExercises,
      ...pullExercises,
      ...legExercises
    ];
    
    // Insert all exercises
    await Exercise.insertMany(allExercises);
    
    // Create progression connections
    for (let category of ["core", "push", "pull", "legs"]) {
      for (let subcategory of ["hollow body", "leg raises", "plank", "push", "pull", "squat"]) {
        const exercises = await Exercise.find({ 
          category, 
          subcategory 
        }).sort({ progressionLevel: 1 });
        
        if (exercises.length > 0) {
          for (let i = 0; i < exercises.length; i++) {
            const updates: any = {};
            
            if (i > 0) {
              updates.prerequisites = [exercises[i-1]._id];
            }
            
            if (i < exercises.length - 1) {
              updates.nextProgressions = [exercises[i+1]._id];
            }
            
            if (Object.keys(updates).length > 0) {
              await Exercise.findByIdAndUpdate(exercises[i]._id, updates);
            }
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${allExercises.length} exercises`,
      categories: {
        core: coreExercises.length,
        push: pushExercises.length,
        pull: pullExercises.length,
        legs: legExercises.length
      }
    });
  } catch (error) {
    console.error('Error importing exercises:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}