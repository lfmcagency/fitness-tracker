// src/app/api/workouts/[id]/sets/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import Workout from '@/models/Workout';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId, Types } from 'mongoose';
import { WorkoutSetData, WorkoutSetActionData } from '@/types/api/workoutResponses';
import { AddWorkoutSetRequest } from '@/types/api/workoutRequests';
import { convertWorkoutSetToResponse } from '@/types/converters/workoutConverters';
import { IWorkout, IWorkoutSet } from '@/types/models/workout';

/**
 * GET /api/workouts/[id]/sets
 * Get all sets for a specific workout
 */
export const GET = withAuth<WorkoutSetData[], { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Missing workout ID', 400, 'ERR_MISSING_PARAM');
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
      
      // If there are no sets, return empty array
      if (!workout.sets || workout.sets.length === 0) {
        return apiResponse([], true, 'Workout has no sets');
      }
      
      // Get exercise names and categories for the response
      const exerciseIds = workout.sets.map(set => 
        typeof set.exercise === 'string' ? set.exercise : set.exercise.toString()
      );
      
      const exerciseNameMap = new Map<string, { name: string; category?: string }>();
      
      if (exerciseIds.length > 0) {
        try {
          const exercises = await Exercise.find({ 
            _id: { $in: exerciseIds } 
          }).select('_id name category');
          
          exercises.forEach(exercise => {
            exerciseNameMap.set(
              exercise._id.toString(), 
              { 
                name: exercise.name, 
                category: exercise.category 
              }
            );
          });
        } catch (error) {
          console.error('Error fetching exercise details:', error);
          // Continue without exercise details if there's an error
        }
      }
      
      // Convert sets to response format
      const setsResponse = workout.sets.map(set => 
        convertWorkoutSetToResponse(set, exerciseNameMap)
      );
      
      return apiResponse(setsResponse, true, `Retrieved ${setsResponse.length} sets for workout`);
    } catch (error) {
      return handleApiError(error, "Error retrieving workout sets");
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/workouts/[id]/sets
 * Add a new set to a workout
 */
export const POST = withAuth<WorkoutSetActionData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Missing workout ID', 400, 'ERR_MISSING_PARAM');
      }
      
      if (!isValidObjectId(id)) {
        return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body
      let body: AddWorkoutSetRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate required field: exerciseId
      if (!body.exerciseId) {
        return apiError('Exercise ID is required', 400, 'ERR_VALIDATION');
      }
      
      if (!isValidObjectId(body.exerciseId)) {
        return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
      }
      
      // Verify exercise exists
      const exercise = await Exercise.findById(body.exerciseId);
      if (!exercise) {
        return apiError('Exercise not found', 404, 'ERR_NOT_FOUND');
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
      
      // Create new set
      const newSet: IWorkoutSet = {
        exercise: body.exerciseId,
        completed: body.completed || false
      };
      
      // Add optional fields if provided
      if (body.reps !== undefined) {
        const reps = Number(body.reps);
        if (!isNaN(reps) && reps >= 0) {
          newSet.reps = reps;
        }
      }
      
      if (body.weight !== undefined) {
        const weight = Number(body.weight);
        if (!isNaN(weight) && weight >= 0) {
          newSet.weight = weight;
        }
      }
      
      if (body.holdTime !== undefined) {
        const holdTime = Number(body.holdTime);
        if (!isNaN(holdTime) && holdTime >= 0) {
          newSet.holdTime = holdTime;
        }
      }
      
      if (body.notes !== undefined) {
        newSet.notes = String(body.notes).trim();
      }
      
      // Add new set to workout
      if (!workout.sets) {
        workout.sets = [];
      }
      
      // Handle position if specified
      if (body.position !== undefined) {
        const position = Number(body.position);
        if (!isNaN(position) && position >= 0 && position <= workout.sets.length) {
          workout.sets.splice(position, 0, newSet);
        } else {
          workout.sets.push(newSet);
        }
      } else {
        workout.sets.push(newSet);
      }
      
      // Update workout
      try {
        await workout.save();
      } catch (error) {
        return handleApiError(error, 'Error saving workout with new set');
      }
      
      // The set ID will be assigned by MongoDB
      const addedSet = workout.sets[workout.sets.length - 1];
      
      // Create a map with the exercise details for the response
      const exerciseNameMap = new Map<string, { name: string; category?: string }>();
      exerciseNameMap.set(
        exercise._id.toString(),
        {
          name: exercise.name,
          category: exercise.category
        }
      );
      
      // Convert set to response format
      const setResponse = convertWorkoutSetToResponse(addedSet, exerciseNameMap);
      
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
      
      return apiResponse(responseData, true, 'Set added to workout successfully', 201);
    } catch (error) {
      return handleApiError(error, "Error adding set to workout");
    }
  },
  AuthLevel.DEV_OPTIONAL
);