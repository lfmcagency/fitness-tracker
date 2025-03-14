// src/app/api/workouts/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import Workout from '@/models/Workout';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId, Types } from 'mongoose';
import { WorkoutData } from '@/types/api/workoutResponses';
import { UpdateWorkoutRequest } from '@/types/api/workoutRequests';
import { convertWorkoutToResponse } from '@/types/converters/workoutConverters';
import { IWorkout } from '@/types/models/workout';

/**
 * GET /api/workouts/[id]
 * Get a specific workout by ID
 */
export const GET = withAuth<WorkoutData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
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
      
      // Convert workout to response format with exercise details
      const workoutResponse = convertWorkoutToResponse(workout, exerciseNameMap);
      
      return apiResponse(workoutResponse, true, 'Workout retrieved successfully');
    } catch (error) {
      return handleApiError(error, "Error retrieving workout");
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/workouts/[id]
 * Update a specific workout by ID
 */
export const PUT = withAuth<WorkoutData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate workout ID from params
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Workout ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(id)) {
        return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body with defensive error handling
      let body: UpdateWorkoutRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid workout data', 400, 'ERR_INVALID_DATA');
      }
      
      // Get existing workout with defensive error handling
      let workout: IWorkout | null;
      try {
        workout = await Workout.findById(id) as IWorkout | null;
        
        if (!workout) {
          return apiError('Workout not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving workout from database');
      }
      
      // Check if user has permission to update this workout
      if (workout.user && workout.user.toString() !== userId) {
        return apiError('You do not have permission to update this workout', 403, 'ERR_FORBIDDEN');
      }
      
      // Create update object with validated fields
      const updates: Record<string, any> = {};
      
      // Validate and update name if provided
      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim() === '') {
          return apiError('Workout name must be a non-empty string', 400, 'ERR_VALIDATION');
        }
        updates.name = body.name.trim();
      }
      
      // Validate and update date if provided
      if (body.date !== undefined) {
        try {
          const date = new Date(body.date);
          if (isNaN(date.getTime())) {
            return apiError('Invalid date format', 400, 'ERR_VALIDATION');
          }
          updates.date = date;
        } catch (error) {
          return apiError('Invalid date format', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update bodyweight if provided
      if (body.bodyweight !== undefined) {
        if (body.bodyweight !== null) {
          const weight = Number(body.bodyweight);
          if (isNaN(weight) || weight <= 0) {
            return apiError('Bodyweight must be a positive number', 400, 'ERR_VALIDATION');
          }
          updates.bodyweight = weight;
        } else {
          // Allow setting to null to remove bodyweight
          updates.bodyweight = null;
        }
      }
      
      // Validate and update duration if provided
      if (body.duration !== undefined) {
        if (body.duration !== null) {
          const duration = Number(body.duration);
          if (isNaN(duration) || duration < 0) {
            return apiError('Duration must be a non-negative number', 400, 'ERR_VALIDATION');
          }
          updates.duration = duration;
        } else {
          // Allow setting to null to remove duration
          updates.duration = null;
        }
      }
      
      // Validate and update notes if provided
      if (body.notes !== undefined) {
        if (body.notes === null) {
          updates.notes = '';
        } else if (typeof body.notes === 'string') {
          updates.notes = body.notes.trim();
        } else {
          return apiError('Notes must be a string', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update completed if provided
      if (body.completed !== undefined) {
        if (typeof body.completed !== 'boolean') {
          return apiError('Completed must be a boolean', 400, 'ERR_VALIDATION');
        }
        updates.completed = body.completed;
      }
      
      // If there are no valid updates, return error
      if (Object.keys(updates).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
      }
      
      // Update workout with defensive error handling
      let updatedWorkout: IWorkout | null;
      try {
        updatedWorkout = await Workout.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true, runValidators: true }
        ) as IWorkout | null;
        
        if (!updatedWorkout) {
          return apiError('Workout not found after update', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error updating workout in database');
      }
      
      // Get exercise details for the response
      const exerciseIds = updatedWorkout.sets.map(set => 
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
      
      // Convert to response format
      const workoutResponse = convertWorkoutToResponse(updatedWorkout, exerciseNameMap);
      
      return apiResponse(workoutResponse, true, 'Workout updated successfully');
    } catch (error) {
      return handleApiError(error, "Error updating workout");
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/workouts/[id]
 * Delete a specific workout by ID
 */
export const DELETE = withAuth<{ id: string }, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate workout ID from params
      const { id } = context?.params || {};
      
      if (!id) {
        return apiError('Workout ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
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
      
      // Check if user has permission to delete this workout
      if (workout.user && workout.user.toString() !== userId) {
        return apiError('You do not have permission to delete this workout', 403, 'ERR_FORBIDDEN');
      }
      
      // Delete workout with defensive error handling
      try {
        await Workout.deleteOne({ _id: id });
      } catch (error) {
        return handleApiError(error, 'Error deleting workout from database');
      }
      
      return apiResponse({ id }, true, 'Workout deleted successfully');
    } catch (error) {
      return handleApiError(error, "Error deleting workout");
    }
  },
  AuthLevel.DEV_OPTIONAL
);