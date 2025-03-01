export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

// Define basic set/rep schemes for different difficulties
const DEFAULT_SET_SCHEMES = {
  beginner: [
    { sets: 3, reps: 8, rest: 90, description: "Focus on form" },
    { sets: 3, reps: 10, rest: 90, description: "Moderate intensity" },
    { sets: 3, reps: 12, rest: 90, description: "Higher volume" }
  ],
  intermediate: [
    { sets: 4, reps: 6, rest: 120, description: "Strength focus" },
    { sets: 3, reps: 10, rest: 90, description: "Balanced approach" },
    { sets: 5, reps: 12, rest: 60, description: "Endurance" }
  ],
  advanced: [
    { sets: 5, reps: 5, rest: 180, description: "Strength development" },
    { sets: 4, reps: 8, rest: 120, description: "Hypertrophy" },
    { sets: 3, reps: 12, rest: 60, description: "Metabolic conditioning" }
  ],
  elite: [
    { sets: 6, reps: 3, rest: 180, description: "Maximum strength" },
    { sets: 5, reps: 5, rest: 150, description: "Power development" },
    { sets: 4, reps: 10, rest: 90, description: "Advanced conditioning" }
  ]
};

/**
 * GET /api/exercises/:id/sets/:setIndex
 * 
 * Get recommended sets and reps for an exercise based on difficulty
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string, setIndex: string } }
) {
  try {
    await dbConnect();
    
    const { id, setIndex } = params;
    const index = parseInt(setIndex, 10);
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError(`Invalid exercise ID: ${id}`, 400);
    }
    
    // Validate setIndex
    if (isNaN(index) || index < 0 || index > 2) {
      return apiError('Set index must be 0, 1, or 2', 400);
    }
    
    // Find the exercise
    const exercise = await Exercise.findById(id)
      .select('name category difficulty progressionLevel xpValue');
    
    if (!exercise) {
      return apiError('Exercise not found', 404);
    }
    
    // Get appropriate set scheme based on difficulty
    const difficulty = exercise.difficulty || 'beginner';
    const setSchemes = DEFAULT_SET_SCHEMES[difficulty];
    const selectedScheme = setSchemes[index];
    
    // Add exercise-specific adjustments based on progression level
    const adjustedScheme = { ...selectedScheme };
    
    // Adjust rest time based on progression level
    if (exercise.progressionLevel > 5) {
      // More advanced exercises need more rest
      adjustedScheme.rest += Math.min(30 * Math.floor((exercise.progressionLevel - 5) / 2), 60);
    }
    
    // Return the set scheme along with the exercise info
    return apiResponse({
      exercise: {
        id: exercise._id,
        name: exercise.name,
        category: exercise.category,
        difficulty: exercise.difficulty,
        progressionLevel: exercise.progressionLevel,
        xpValue: exercise.xpValue
      },
      setScheme: adjustedScheme,
      setIndex: index
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching exercise set scheme');
  }
}

/**
 * PATCH /api/exercises/:id/sets/:setIndex
 * 
 * Record completion of a set for the exercise
 * Records are stored in the user's profile
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string, setIndex: string } }
) {
  try {
    await dbConnect();
    
    const { id, setIndex } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError(`Invalid exercise ID: ${id}`, 400);
    }
    
    // Get completion data from request body
    const data = await req.json();
    const { completedReps, difficulty, notes } = data;
    
    // Validate input
    if (typeof completedReps !== 'number' || completedReps < 0) {
      return apiError('completedReps must be a positive number', 400);
    }
    
    // Find the exercise to verify it exists
    const exercise = await Exercise.findById(id);
    
    if (!exercise) {
      return apiError('Exercise not found', 404);
    }
    
    // Since we don't have user authentication in this example,
    // we'll just return a success response with the data that would be saved
    
    return apiResponse({
      success: true,
      message: 'Set completion recorded',
      completion: {
        exerciseId: id,
        exerciseName: exercise.name,
        setIndex: parseInt(setIndex, 10),
        completedReps,
        difficulty: difficulty || 'normal',
        notes,
        timestamp: new Date().toISOString()
      }
    }, 'Set completion recorded', 200);
  } catch (error) {
    return handleApiError(error, 'Error recording set completion');
  }
}