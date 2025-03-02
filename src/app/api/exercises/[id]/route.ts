export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

/**
 * GET /api/exercises/:id
 * 
 * Get a single exercise by ID with related exercises
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const id = params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError(`Invalid exercise ID: ${id}`, 400);
    }
    
    // Find the exercise with populated relationships
    const exercise = await Exercise.findById(id)
      .populate('previousExercise', 'name progressionLevel difficulty uniqueId')
      .populate('nextExercise', 'name progressionLevel difficulty uniqueId');
    
    if (!exercise) {
      return apiError('Exercise not found', 404);
    }
    
    // Get related exercises in the same category & subcategory
    const relatedExercises = await Exercise.find({
      category: exercise.category,
      subcategory: exercise.subcategory,
      _id: { $ne: exercise._id },
      progressionLevel: { 
        $gte: Math.max(1, exercise.progressionLevel - 2),
        $lte: exercise.progressionLevel + 2
      }
    })
    .select('name progressionLevel difficulty uniqueId')
    .sort({ progressionLevel: 1 })
    .limit(5);
    
    // Get the full progression path if available
    const progressionPath = await getProgressionPath(exercise);
    
    return apiResponse({
      exercise,
      related: relatedExercises,
      progressionPath
    }, true); // Added true for success parameter
  } catch (error) {
    return handleApiError(error, 'Error fetching exercise details');
  }
}

/**
 * PUT /api/exercises/:id
 * 
 * Update an exercise by ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const id = params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError(`Invalid exercise ID: ${id}`, 400);
    }
    
    // Get the existing exercise
    const existingExercise = await Exercise.findById(id);
    
    if (!existingExercise) {
      return apiError('Exercise not found', 404);
    }
    
    // Get update data
    const data = await req.json();
    
    // Store old relationships for later cleanup
    const oldPreviousExercise = existingExercise.previousExercise;
    const oldNextExercise = existingExercise.nextExercise;
    
    // Handle relationship changes
    if (data.previousExerciseId !== undefined) {
      if (data.previousExerciseId) {
        // Verify the new previous exercise exists
        if (!mongoose.Types.ObjectId.isValid(data.previousExerciseId)) {
          return apiError(`Invalid previous exercise ID: ${data.previousExerciseId}`, 400);
        }
        
        const prevExists = await Exercise.exists({ _id: data.previousExerciseId });
        if (!prevExists) {
          return apiError(`Previous exercise with ID '${data.previousExerciseId}' not found`, 400);
        }
        
        // Set the new reference
        data.previousExercise = data.previousExerciseId;
      } else {
        // Remove the reference
        data.previousExercise = null;
      }
      
      delete data.previousExerciseId;
    }
    
    if (data.nextExerciseId !== undefined) {
      if (data.nextExerciseId) {
        // Verify the new next exercise exists
        if (!mongoose.Types.ObjectId.isValid(data.nextExerciseId)) {
          return apiError(`Invalid next exercise ID: ${data.nextExerciseId}`, 400);
        }
        
        const nextExists = await Exercise.exists({ _id: data.nextExerciseId });
        if (!nextExists) {
          return apiError(`Next exercise with ID '${data.nextExerciseId}' not found`, 400);
        }
        
        // Set the new reference
        data.nextExercise = data.nextExerciseId;
      } else {
        // Remove the reference
        data.nextExercise = null;
      }
      
      delete data.nextExerciseId;
    }
    
    // Update the exercise
    const updatedExercise = await Exercise.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    
    // Update relationships in the other direction
    
    // Clean up old relationships
    if (oldPreviousExercise && 
        (!data.previousExercise || !oldPreviousExercise.equals(data.previousExercise))) {
      await Exercise.findByIdAndUpdate(
        oldPreviousExercise,
        { $unset: { nextExercise: 1 } }
      );
    }
    
    if (oldNextExercise && 
        (!data.nextExercise || !oldNextExercise.equals(data.nextExercise))) {
      await Exercise.findByIdAndUpdate(
        oldNextExercise,
        { $unset: { previousExercise: 1 } }
      );
    }
    
    // Set new relationships
    if (data.previousExercise) {
      await Exercise.findByIdAndUpdate(
        data.previousExercise,
        { nextExercise: id }
      );
    }
    
    if (data.nextExercise) {
      await Exercise.findByIdAndUpdate(
        data.nextExercise,
        { previousExercise: id }
      );
    }
    
    return apiResponse(updatedExercise, true, "Exercise updated successfully"); // Fixed: added true as success param
  } catch (error) {
    return handleApiError(error, 'Error updating exercise');
  }
}

/**
 * DELETE /api/exercises/:id
 * 
 * Delete an exercise by ID and update relationships
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const id = params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError(`Invalid exercise ID: ${id}`, 400);
    }
    
    // Find the exercise to check relationships before deletion
    const exercise = await Exercise.findById(id);
    
    if (!exercise) {
      return apiError('Exercise not found', 404);
    }
    
    // Store relationships for updating
    const previousExercise = exercise.previousExercise;
    const nextExercise = exercise.nextExercise;
    
    // Delete the exercise
    await Exercise.findByIdAndDelete(id);
    
    // Update relationships between previous and next exercises if both exist
    if (previousExercise && nextExercise) {
      // Connect previous and next exercises directly
      await Exercise.findByIdAndUpdate(
        previousExercise,
        { nextExercise }
      );
      
      await Exercise.findByIdAndUpdate(
        nextExercise,
        { previousExercise }
      );
    } else {
      // Just remove the reference from one side if needed
      if (previousExercise) {
        await Exercise.findByIdAndUpdate(
          previousExercise,
          { $unset: { nextExercise: 1 } }
        );
      }
      
      if (nextExercise) {
        await Exercise.findByIdAndUpdate(
          nextExercise,
          { $unset: { previousExercise: 1 } }
        );
      }
    }
    
    return apiResponse(
      { id, previousExercise, nextExercise },
      true, // Added true for success parameter
      'Exercise deleted successfully'
    );
  } catch (error) {
    return handleApiError(error, 'Error deleting exercise');
  }
}

/**
 * Helper function to get the complete progression path for an exercise
 */
async function getProgressionPath(exercise: any) {
  const path = [exercise];
  
  // Get all previous exercises in the progression
  let current = exercise;
  while (current.previousExercise) {
    const previousId = typeof current.previousExercise === 'object' 
      ? current.previousExercise._id 
      : current.previousExercise;
      
    const prev = await Exercise.findById(previousId)
      .select('name progressionLevel difficulty uniqueId previousExercise');
      
    if (!prev) break;
    
    path.unshift(prev);
    current = prev;
  }
  
  // Reset to the original exercise
  current = exercise;
  
  // Get all next exercises in the progression
  while (current.nextExercise) {
    const nextId = typeof current.nextExercise === 'object'
      ? current.nextExercise._id
      : current.nextExercise;
      
    const next = await Exercise.findById(nextId)
      .select('name progressionLevel difficulty uniqueId nextExercise');
      
    if (!next) break;
    
    path.push(next);
    current = next;
  }
  
  return path;
}