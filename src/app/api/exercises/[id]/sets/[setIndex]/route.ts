// src/app/api/exercises/[id]/sets/[setIndex]/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';;
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";

// Note: This endpoint would typically interact with a Workout model that contains
// sets for exercises. Since we don't have the complete model structure in the
// provided context, we'll implement a robust API shell that can be filled in with
// the actual implementation details.

/**
 * GET /api/exercises/[id]/sets/[setIndex]
 * Get a specific set for an exercise in the current user's workout
 */
export const GET = withAuth<ResponseType['data'], { id: string, setIndex: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      if (!context?.params?.id || !context?.params?.setIndex) {
        return apiError('Missing required parameters', 400, 'ERR_MISSING_PARAM');
      }
      
      const { id, setIndex } = context.params;
    
    if (!exerciseId || typeof exerciseId !== 'string') {
      return apiError('Exercise ID is required', 400, 'ERR_VALIDATION');
    }
    
    // Check if ID is valid MongoDB ObjectId
    if (!isValidObjectId(exerciseId)) {
      return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
    }
    
    // Validate set index from params
    const setIndex = params?.setIndex;
    let parsedIndex: number;
    
    try {
      parsedIndex = parseInt(setIndex);
      if (isNaN(parsedIndex) || parsedIndex < 0) {
        return apiError('Set index must be a non-negative integer', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Invalid set index', 400, 'ERR_VALIDATION');
    }
    
    // Get query parameters with defensive handling
    const url = new URL(req.url);
    
    // Optional workout ID parameter
    const workoutId = url.searchParams.get('workoutId') || null;
    
    // Validate workout ID if provided
    if (workoutId && !isValidObjectId(workoutId)) {
      return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
    }
    
    // TODO: Implement actual set retrieval logic
    // This would involve:
    // 1. Finding the user's current or specified workout
    // 2. Finding the exercise within that workout
    // 3. Retrieving the specified set at the given index
    
    // For now, return a mock response or error
    return apiResponse({
      message: "This endpoint needs to be implemented based on the workout model structure",
      params: {
        exerciseId,
        setIndex: parsedIndex,
        workoutId
      }
    }, true, 'Set retrieval not implemented');
  } catch (error) {
    return handleApiError(error, "Error retrieving exercise set");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PUT /api/exercises/[id]/sets/[setIndex]
 * Update a specific set for an exercise in the current user's workout
 */
export const PUT = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Validate exercise ID from params
    const exerciseId = params?.id;
    
    if (!exerciseId || typeof exerciseId !== 'string') {
      return apiError('Exercise ID is required', 400, 'ERR_VALIDATION');
    }
    
    // Check if ID is valid MongoDB ObjectId
    if (!isValidObjectId(exerciseId)) {
      return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
    }
    
    // Validate set index from params
    const setIndex = params?.setIndex;
    let parsedIndex: number;
    
    try {
      parsedIndex = parseInt(setIndex);
      if (isNaN(parsedIndex) || parsedIndex < 0) {
        return apiError('Set index must be a non-negative integer', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Invalid set index', 400, 'ERR_VALIDATION');
    }
    
    // Parse request body with defensive error handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body
    if (!body || typeof body !== 'object') {
      return apiError('Invalid set data', 400, 'ERR_INVALID_DATA');
    }
    
    // Get query parameters with defensive handling
    const url = new URL(req.url);
    
    // Optional workout ID parameter
    const workoutId = url.searchParams.get('workoutId') || body.workoutId || null;
    
    // Validate workout ID if provided
    if (workoutId && !isValidObjectId(workoutId)) {
      return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
    }
    
    // Validate set data with defensive checks
    
    // Validate reps
    let reps = null;
    if (body.reps !== undefined) {
      if (typeof body.reps === 'string') {
        reps = parseInt(body.reps);
      } else if (typeof body.reps === 'number') {
        reps = body.reps;
      } else if (body.reps === null) {
        reps = null;
      } else {
        return apiError('Reps must be a number or null', 400, 'ERR_VALIDATION');
      }
      
      if (reps !== null && (isNaN(reps) || reps < 0)) {
        return apiError('Reps must be a non-negative number or null', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate weight
    let weight = null;
    if (body.weight !== undefined) {
      if (typeof body.weight === 'string') {
        weight = parseFloat(body.weight);
      } else if (typeof body.weight === 'number') {
        weight = body.weight;
      } else if (body.weight === null) {
        weight = null;
      } else {
        return apiError('Weight must be a number or null', 400, 'ERR_VALIDATION');
      }
      
      if (weight !== null && (isNaN(weight) || weight < 0)) {
        return apiError('Weight must be a non-negative number or null', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate hold time (for isometric exercises)
    let holdTime = null;
    if (body.holdTime !== undefined) {
      if (typeof body.holdTime === 'string') {
        holdTime = parseInt(body.holdTime);
      } else if (typeof body.holdTime === 'number') {
        holdTime = body.holdTime;
      } else if (body.holdTime === null) {
        holdTime = null;
      } else {
        return apiError('Hold time must be a number or null', 400, 'ERR_VALIDATION');
      }
      
      if (holdTime !== null && (isNaN(holdTime) || holdTime < 0)) {
        return apiError('Hold time must be a non-negative number or null', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate completed status
    let completed = null;
    if (body.completed !== undefined) {
      if (typeof body.completed === 'boolean') {
        completed = body.completed;
      } else if (body.completed === 'true') {
        completed = true;
      } else if (body.completed === 'false') {
        completed = false;
      } else if (body.completed === null) {
        completed = false;
      } else {
        return apiError('Completed must be a boolean or null', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate RPE (Rate of Perceived Exertion)
    let rpe = null;
    if (body.rpe !== undefined) {
      if (typeof body.rpe === 'string') {
        rpe = parseFloat(body.rpe);
      } else if (typeof body.rpe === 'number') {
        rpe = body.rpe;
      } else if (body.rpe === null) {
        rpe = null;
      } else {
        return apiError('RPE must be a number or null', 400, 'ERR_VALIDATION');
      }
      
      if (rpe !== null && (isNaN(rpe) || rpe < 0 || rpe > 10)) {
        return apiError('RPE must be a number between 0 and 10, or null', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate notes
    let notes = null;
    if (body.notes !== undefined) {
      if (typeof body.notes === 'string') {
        notes = body.notes.trim();
      } else if (body.notes === null) {
        notes = null;
      } else {
        return apiError('Notes must be a string or null', 400, 'ERR_VALIDATION');
      }
    }
    
    // Create a validated set object
    const setData = {
      reps,
      weight,
      holdTime,
      completed,
      rpe,
      notes
    };
    
    // TODO: Implement actual set update logic
    // This would involve:
    // 1. Finding the user's current or specified workout
    // 2. Finding the exercise within that workout
    // 3. Updating the specified set at the given index
    
    // For now, return a mock response or error
    return apiResponse({
      message: "This endpoint needs to be implemented based on the workout model structure",
      params: {
        exerciseId,
        setIndex: parsedIndex,
        workoutId
      },
      setData
    }, true, 'Set update not implemented');
  } catch (error) {
    return handleApiError(error, "Error updating exercise set");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * DELETE /api/exercises/[id]/sets/[setIndex]
 * Delete a specific set for an exercise in the current user's workout
 */
export const DELETE = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Validate exercise ID from params
    const exerciseId = params?.id;
    
    if (!exerciseId || typeof exerciseId !== 'string') {
      return apiError('Exercise ID is required', 400, 'ERR_VALIDATION');
    }
    
    // Check if ID is valid MongoDB ObjectId
    if (!isValidObjectId(exerciseId)) {
      return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
    }
    
    // Validate set index from params
    const setIndex = params?.setIndex;
    let parsedIndex: number;
    
    try {
      parsedIndex = parseInt(setIndex);
      if (isNaN(parsedIndex) || parsedIndex < 0) {
        return apiError('Set index must be a non-negative integer', 400, 'ERR_VALIDATION');
      }
    } catch (error) {
      return apiError('Invalid set index', 400, 'ERR_VALIDATION');
    }
    
    // Get query parameters with defensive handling
    const url = new URL(req.url);
    
    // Optional workout ID parameter
    const workoutId = url.searchParams.get('workoutId') || null;
    
    // Validate workout ID if provided
    if (workoutId && !isValidObjectId(workoutId)) {
      return apiError('Invalid workout ID format', 400, 'ERR_VALIDATION');
    }
    
    // TODO: Implement actual set deletion logic
    // This would involve:
    // 1. Finding the user's current or specified workout
    // 2. Finding the exercise within that workout
    // 3. Removing the specified set at the given index
    
    // For now, return a mock response or error
    return apiResponse({
      message: "This endpoint needs to be implemented based on the workout model structure",
      params: {
        exerciseId,
        setIndex: parsedIndex,
        workoutId
      }
    }, true, 'Set deletion not implemented');
  } catch (error) {
    return handleApiError(error, "Error deleting exercise set");
  }
}, AuthLevel.DEV_OPTIONAL);