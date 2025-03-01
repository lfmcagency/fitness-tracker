export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const id = params.id;
    
    const exercise = await Exercise.findById(id)
      .populate('previousExercise', 'name progressionLevel')
      .populate('nextExercise', 'name progressionLevel');
    
    if (!exercise) {
      return apiError('Exercise not found', 404);
    }
    
    // Get related exercises in same category
    const relatedExercises = await Exercise.find({
      category: exercise.category,
      _id: { $ne: exercise._id },
      progressionLevel: { 
        $gte: Math.max(1, exercise.progressionLevel - 2),
        $lte: exercise.progressionLevel + 2
      }
    })
    .select('name progressionLevel')
    .sort({ progressionLevel: 1 })
    .limit(5);
    
    return apiResponse({
      exercise,
      related: relatedExercises
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching exercise details');
  }
}