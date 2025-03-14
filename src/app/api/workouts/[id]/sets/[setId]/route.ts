// src/app/api/workouts/[id]/sets/[setId]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import Workout from '@/models/Workout';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId, Types } from 'mongoose';
import { WorkoutSetData, WorkoutSetActionData } from '@/types/api/workoutResponses';
import { UpdateWorkoutSetRequest } from '@/types/api/workoutRequests';
import { convertWorkoutSetToResponse } from '@/types/converters/workoutConverters';
import { IWorkout, IWorkoutSet } from '@/types/models/workout';

/**
 * GET /api/workouts/[id]/sets/[setId]
 * Get a specific set from a workout
 */
export const GET = withAuth<WorkoutSetData, { id: string; setId: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { id, setId } = context?.params || {};
      
      if (!id || !setId) {
        return apiError('Missing required parameters', 400, 'ERR_MISSING_PARAM');
      }
      
      if (!isValidObjectId(id)) {
        return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get workout with defensive error handling
      let workout: IWorkout | null;
      try {
        workout = await Workout.findById(id) as IWorkout | null;
        
        if (!workout) {
          return apiError('Workout not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving workout from database');
      }
      
      // Check if user has access to this workout
      if (workout.user && workout.user.toString() !== userId) {
        return apiError('You do not have permission to access this workout', 403, 'ERR_FORBIDDEN');
      }
      
      // Find the set by ID
      if (!workout.sets || workout.sets.length === 0) {
        return apiError('Workout has no sets', 404, 'ERR_NOT_FOUND');
      }
      
      const set = workout.sets.find(s => s._id?.toString() === setId);
      
      if (!set) {
        return apiError('Set not found in workout', 404, 'ERR_NOT_FOUND');
      }
      
      // Get exercise details
      const exerciseId = typeof set.exercise === 'string' 
        ? set.exercise 
        : set.exercise.toString();
      
      const exerciseNameMap = new Map<string, { name: string; category?: string }>();
      
      try {
        const exercise = await Exercise.findById(exerciseId).select('name category');
        
        if (exercise) {
          exerciseNameMap.set(
            exerciseId, 
            { 
              name: exercise.name, 
              category: exercise.category 
            }
          );
        }
      } catch (error) {
        console.error('Error fetching exercise details:', error);
        // Continue without exercise details if there's an error
      }
      
      // Convert set to response format
      const setResponse = convertWorkoutSetToResponse(set, exerciseNameMap);
      
      return apiResponse(setResponse, true, 'Set retrieved successfully');
    } catch (error) {
      return handleApiError(error, "Error retrieving workout set");
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/workouts/[id]/sets/[setId]
 * Update a specific set in a workout
 */
export const PUT = withAuth<WorkoutSetActionData, { id: string; setId: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { id, setId } = context?.params || {};
      
      if (!id || !setId) {
        return apiError('Missing required parameters', 400, 'ERR_MISSING_PARAM');
      }
      
      if (!isValidObjectId(id)) {
        return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body
      let body: UpdateWorkoutSetRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid set data', 400, 'ERR_INVALID_DATA');
      }
      
      // Get workout
      let workout: IWorkout | null;
      try {
        workout = await Workout.findById(id) as IWorkout | null;
        
        if (!workout) {
          return apiError('Workout not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving workout from database');
      }
      
      // Check if user has permission to modify this workout
      if (workout.user && workout.user.toString() !== userId) {
        return apiError('You do not have permission to modify this workout', 403, 'ERR_FORBIDDEN');
      }
      
      // Find the set by ID
      if (!workout.sets || workout.sets.length === 0) {
        return apiError('Workout has no sets', 404, 'ERR_NOT_FOUND');
      }
      
      const setIndex = workout.sets.findIndex(s => s._id?.toString() === setId);
      
      if (setIndex === -1) {
        return apiError('Set not found in workout', 404, 'ERR_NOT_FOUND');
      }
      
      const set = workout.sets[setIndex];
      
      // Create update object with validated fields
      const updates: Partial<IWorkoutSet> = {};
      
      // Validate and update exercise if provided
      if (body.exerciseId !== undefined) {
        if (!body.exerciseId) {
          return apiError('Exercise ID cannot be empty', 400, 'ERR_VALIDATION');
        }
        
        if (!isValidObjectId(body.exerciseId)) {
          return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
        }
        
        // Verify exercise exists
        const exercise = await Exercise.findById(body.exerciseId);
        if (!exercise) {
          return apiError('Exercise not found', 404, 'ERR_NOT_FOUND');
        }
        
        updates.exercise = body.exerciseId;
      }
      
      // Validate and update reps if provided
      if (body.reps !== undefined) {
        if (body.reps === null) {
          updates.reps = undefined;
        } else {
          const reps = Number(body.reps);
          if (isNaN(reps) || reps < 0) {
            return apiError('Reps must be a non-negative number', 400, 'ERR_VALIDATION');
          }
          updates.reps = reps;
        }
      }
      
      // Validate and update weight if provided
      if (body.weight !== undefined) {
        if (body.weight === null) {
          updates.weight = undefined;
        } else {
          const weight = Number(body.weight);
          if (isNaN(weight) || weight < 0) {
            return apiError('Weight must be a non-negative number', 400, 'ERR_VALIDATION');
          }
          updates.weight = weight;
        }
      }
      
      // Validate and update holdTime if provided
      if (body.holdTime !== undefined) {
        if (body.holdTime === null) {
          updates.holdTime = undefined;
        } else {
          const holdTime = Number(body.holdTime);
          if (isNaN(holdTime) || holdTime < 0) {
            return apiError('Hold time must be a non-negative number', 400, 'ERR_VALIDATION');
          }
          updates.holdTime = holdTime;
        }
      }
      
      // Validate and update completed if provided
      if (body.completed !== undefined) {
        if (typeof body.completed !== 'boolean') {
          return apiError('Completed must be a boolean', 400, 'ERR_VALIDATION');
        }
        updates.completed = body.completed;
      }
      
      // Validate and update notes if provided
      if (body.notes !== undefined) {
        if (body.notes === null) {
          updates.notes = '';
        } else {
          updates.notes = String(body.notes).trim();
        }
      }
      
      // If there are no valid updates, return error
      if (Object.keys(updates).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
      }
      
      // Apply updates to the set
      workout.sets[setIndex] = {
        ...set,
        ...updates
      };
      
      // Save workout
      try {
        await workout.save();
      } catch (error) {
        return handleApiError(error, 'Error saving workout with updated set');
      }
      
      // Get updated set
      const updatedSet = workout.sets[setIndex];
      
      // Get exercise details for response
      const exerciseId = typeof updatedSet.exercise === 'string' 
        ? updatedSet.exercise 
        : updatedSet.exercise.toString();
      
      const exerciseNameMap = new Map<string, { name: string; category?: string }>();
      
      try {
        const exercise = await Exercise.findById(exerciseId).select('name category');
        
        if (exercise) {
          exerciseNameMap.set(
            exerciseId, 
            { 
              name: exercise.name, 
              category: exercise.category 
            }
          );
        }
      } catch (error) {
        console.error('Error fetching exercise details:', error);
        // Continue without exercise details if there's an error
      }
      
      // Convert to response format
      const setResponse = convertWorkoutSetToResponse(updatedSet, exerciseNameMap);
      
      // Prepare response
      const responseData: WorkoutSetActionData = {
        workoutId: workout._id.toString(),
        set: setResponse,
        workout: {
          name: workout.name,
          date: workout.date.toISOString(),
          totalSets: workout.sets.length
        }
      };
      
      return apiResponse(responseData, true, 'Set updated successfully');
    } catch (error) {
      return handleApiError(error, "Error updating workout set");
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/workouts/[id]/sets/[setId]
 * Delete a specific set from a workout
 */
export const DELETE = withAuth<{ workoutId: string; setId: string }, { id: string; setId: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { id, setId } = context?.params || {};
      
      if (!id || !setId) {
        return apiError('Missing required parameters', 400, 'ERR_MISSING_PARAM');
      }
      
      if (!isValidObjectId(id)) {
        return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get workout
      let workout: IWorkout | null;
      try {
        workout = await Workout.findById(id) as IWorkout | null;
        
        if (!workout) {
          return apiError('Workout not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving workout from database');
      }
      
      // Check if user has permission to modify this workout
      if (workout.user && workout.user.toString() !== userId) {
        return apiError('You do not have permission to modify this workout', 403, 'ERR_FORBIDDEN');
      }
      
      // Find the set by ID
      if (!workout.sets || workout.sets.length === 0) {
        return apiError('Workout has no sets', 404, 'ERR_NOT_FOUND');
      }
      
      const setIndex = workout.sets.findIndex(s => s._id?.toString() === setId);
      
      if (setIndex === -1) {
        return apiError('Set not found in workout', 404, 'ERR_NOT_FOUND');
      }
      
      // Remove the set
      workout.sets.splice(setIndex, 1);
      
      // Save workout
      try {
        await workout.save();
      } catch (error) {
        return handleApiError(error, 'Error saving workout after removing set');
      }
      
      return apiResponse(
        { workoutId: id, setId },
        true,
        'Set removed from workout successfully'
      );
    } catch (error) {
      return handleApiError(error, "Error removing set from workout");
    }
  },
  AuthLevel.DEV_OPTIONAL
);