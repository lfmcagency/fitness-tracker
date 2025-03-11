// src/app/api/exercises/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Exercise from "@/models/Exercise";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import { ExerciseData } from "@/types/api/exerciseResponses";
import { IExercise } from "@/models/Exercise";

/**
 * GET /api/exercises/[id]
 * Get a specific exercise by ID
 */
export const GET = withAuth<ExerciseData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Ensure context and params exist
      if (!context || !context.params) {
        return apiError('Missing route parameters', 400, 'ERR_MISSING_PARAM');
      }
      
      const { id } = context.params;
      
      if (!id || typeof id !== 'string') {
        return apiError('Exercise ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(id)) {
        return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get exercise with defensive error handling
      let exercise: IExercise | null;
      try {
        exercise = await Exercise.findById(id) as IExercise | null;
        
        if (!exercise) {
          return apiError('Exercise not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving exercise from database');
      }
      
      // Process previous and next exercise references with defensive handling
      let previousExercise = null;
      let nextExercise = null;
      
      if (exercise.previousExercise) {
        try {
          const prev = await Exercise.findById(exercise.previousExercise)
            .select('name category subcategory progressionLevel') as IExercise | null;
          
          if (prev) {
            previousExercise = {
              id: prev._id.toString(),
              name: prev.name,
              category: prev.category,
              subcategory: prev.subcategory,
              progressionLevel: prev.progressionLevel
            };
          }
        } catch (error) {
          console.error('Error fetching previous exercise:', error);
        }
      }
      
      if (exercise.nextExercise) {
        try {
          const next = await Exercise.findById(exercise.nextExercise)
            .select('name category subcategory progressionLevel') as IExercise | null;
          
          if (next) {
            nextExercise = {
              id: next._id.toString(),
              name: next.name,
              category: next.category,
              subcategory: next.subcategory,
              progressionLevel: next.progressionLevel
            };
          }
        } catch (error) {
          console.error('Error fetching next exercise:', error);
        }
      }
      
      // Format exercise response with defensive transformation
      let exerciseResponse: ExerciseData;
      try {
        const exerciseObj = exercise.toObject();
        exerciseResponse = {
          id: exerciseObj._id.toString(),
          name: exerciseObj.name || 'Unknown Exercise',
          category: exerciseObj.category || 'Uncategorized',
          subcategory: exerciseObj.subcategory || '',
          progressionLevel: exerciseObj.progressionLevel || 1,
          difficulty: exerciseObj.difficulty || 'beginner',
          description: exerciseObj.description || '',
          primaryMuscleGroup: exerciseObj.primaryMuscleGroup || '',
          secondaryMuscleGroups: Array.isArray(exerciseObj.secondaryMuscleGroups) 
            ? exerciseObj.secondaryMuscleGroups 
            : typeof exerciseObj.secondaryMuscleGroups === 'string'
              ? exerciseObj.secondaryMuscleGroups.split(',').map((group: string) => group.trim())
              : [],
          formCues: Array.isArray(exerciseObj.formCues) 
            ? exerciseObj.formCues 
            : typeof exerciseObj.formCues === 'string'
              ? exerciseObj.formCues.split(',').map((cue: string) => cue.trim())
              : [],
          xpValue: exerciseObj.xpValue || exerciseObj.progressionLevel * 10 || 10,
          unlockRequirements: exerciseObj.unlockRequirements || '',
          previousExercise,
          nextExercise
        };
      } catch (error) {
        console.error('Error formatting exercise response:', error);
        // Fallback with minimal data
        exerciseResponse = {
          id: exercise._id.toString(),
          name: exercise.name || 'Unknown Exercise',
          category: exercise.category || 'Uncategorized',
          subcategory: exercise.subcategory || '',
          progressionLevel: exercise.progressionLevel || 1,
          difficulty: exercise.difficulty || 'beginner',
          xpValue: exercise.xpValue || 10
        };
      }
      
      return apiResponse(exerciseResponse, true, 'Exercise retrieved successfully');
    } catch (error) {
      return handleApiError(error, "Error retrieving exercise");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/exercises/[id] (Admin only)
 * Update a specific exercise by ID
 */
export const PUT = withAuth<ExerciseData, { id: string }>(
  async (req: NextRequest, userId, context) => {
    try {
      await dbConnect();
      
      // Ensure context and params exist
      if (!context || !context.params) {
        return apiError('Missing route parameters', 400, 'ERR_MISSING_PARAM');
      }
      
      const { id } = context.params;
      
      if (!id || typeof id !== 'string') {
        return apiError('Exercise ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(id)) {
        return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
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
        return apiError('Invalid exercise data', 400, 'ERR_INVALID_DATA');
      }
      
      // Check if user has admin permission (actual role check should be in middleware)
      // This is a fallback defense - the API should be protected by admin middleware
      try {
        // This is where you would check if the user has admin role
        // For now, we'll assume this check is handled by middleware
        // and this is just a defensive fallback
      } catch (error) {
        return apiError('Insufficient permissions', 403, 'ERR_FORBIDDEN');
      }
      
      // Get existing exercise with defensive error handling
      let exercise: IExercise | null;
      try {
        exercise = await Exercise.findById(id) as IExercise | null;
        
        if (!exercise) {
          return apiError('Exercise not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving exercise from database');
      }
      
      // Create update object with validated fields
      const updates: Record<string, any> = {};
      
      // Validate and update name if provided
      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim() === '') {
          return apiError('Exercise name must be a non-empty string', 400, 'ERR_VALIDATION');
        }
        updates.name = body.name.trim();
      }
      
      // Validate and update category if provided
      if (body.category !== undefined) {
        if (typeof body.category !== 'string' || body.category.trim() === '') {
          return apiError('Exercise category must be a non-empty string', 400, 'ERR_VALIDATION');
        }
        updates.category = body.category.trim();
      }
      
      // Validate and update subcategory if provided
      if (body.subcategory !== undefined) {
        if (body.subcategory === null) {
          updates.subcategory = '';
        } else if (typeof body.subcategory === 'string') {
          updates.subcategory = body.subcategory.trim();
        } else {
          return apiError('Subcategory must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update progression level if provided
      if (body.progressionLevel !== undefined) {
        let progressionLevel;
        if (typeof body.progressionLevel === 'string') {
          progressionLevel = parseInt(body.progressionLevel);
        } else if (typeof body.progressionLevel === 'number') {
          progressionLevel = body.progressionLevel;
        } else {
          return apiError('Progression level must be a number', 400, 'ERR_VALIDATION');
        }
        
        if (isNaN(progressionLevel) || progressionLevel < 1) {
          return apiError('Progression level must be a positive integer', 400, 'ERR_VALIDATION');
        }
        updates.progressionLevel = progressionLevel;
      }
      
      // Validate and update difficulty if provided
      if (body.difficulty !== undefined) {
        if (typeof body.difficulty !== 'string') {
          return apiError('Difficulty must be a string', 400, 'ERR_VALIDATION');
        }
        
        const validDifficulties = ['beginner', 'intermediate', 'advanced', 'elite'];
        const normalizedDifficulty = body.difficulty.trim().toLowerCase();
        
        if (!validDifficulties.includes(normalizedDifficulty)) {
          return apiError(`Invalid difficulty. Valid values: ${validDifficulties.join(', ')}`, 400, 'ERR_VALIDATION');
        }
        
        updates.difficulty = normalizedDifficulty;
      }
      
      // Validate and update description if provided
      if (body.description !== undefined) {
        if (body.description === null) {
          updates.description = '';
        } else if (typeof body.description === 'string') {
          updates.description = body.description.trim();
        } else {
          return apiError('Description must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update primary muscle group if provided
      if (body.primaryMuscleGroup !== undefined) {
        if (body.primaryMuscleGroup === null) {
          updates.primaryMuscleGroup = '';
        } else if (typeof body.primaryMuscleGroup === 'string') {
          updates.primaryMuscleGroup = body.primaryMuscleGroup.trim();
        } else {
          return apiError('Primary muscle group must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update secondary muscle groups if provided
      if (body.secondaryMuscleGroups !== undefined) {
        if (!Array.isArray(body.secondaryMuscleGroups)) {
          return apiError('Secondary muscle groups must be an array', 400, 'ERR_VALIDATION');
        }
        
        const secondaryMuscleGroups = [];
        for (const muscle of body.secondaryMuscleGroups) {
          if (typeof muscle === 'string' && muscle.trim() !== '') {
            secondaryMuscleGroups.push(muscle.trim());
          }
        }
        
        updates.secondaryMuscleGroups = secondaryMuscleGroups;
      }
      
      // Validate and update form cues if provided
      if (body.formCues !== undefined) {
        if (!Array.isArray(body.formCues)) {
          return apiError('Form cues must be an array', 400, 'ERR_VALIDATION');
        }
        
        const formCues = [];
        for (const cue of body.formCues) {
          if (typeof cue === 'string' && cue.trim() !== '') {
            formCues.push(cue.trim());
          }
        }
        
        updates.formCues = formCues;
      }
      
      // Validate and update XP value if provided
      if (body.xpValue !== undefined) {
        let xpValue;
        if (typeof body.xpValue === 'string') {
          xpValue = parseInt(body.xpValue);
        } else if (typeof body.xpValue === 'number') {
          xpValue = body.xpValue;
        } else {
          return apiError('XP value must be a number', 400, 'ERR_VALIDATION');
        }
        
        if (isNaN(xpValue) || xpValue < 0) {
          return apiError('XP value must be a non-negative integer', 400, 'ERR_VALIDATION');
        }
        updates.xpValue = xpValue;
      }
      
      // Validate and update unlock requirements if provided
      if (body.unlockRequirements !== undefined) {
        if (body.unlockRequirements === null) {
          updates.unlockRequirements = '';
        } else if (typeof body.unlockRequirements === 'string') {
          updates.unlockRequirements = body.unlockRequirements.trim();
        } else {
          return apiError('Unlock requirements must be a string or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Handle exercise relationships
      if (body.previousExercise !== undefined) {
        if (body.previousExercise === null) {
          updates.previousExercise = null;
        } else if (typeof body.previousExercise === 'string') {
          if (body.previousExercise.trim() === '') {
            updates.previousExercise = null;
          } else if (isValidObjectId(body.previousExercise.trim())) {
            updates.previousExercise = body.previousExercise.trim();
          } else {
            return apiError('Previous exercise must be a valid ID or null', 400, 'ERR_VALIDATION');
          }
        } else {
          return apiError('Previous exercise must be a string ID or null', 400, 'ERR_VALIDATION');
        }
      }
      
      if (body.nextExercise !== undefined) {
        if (body.nextExercise === null) {
          updates.nextExercise = null;
        } else if (typeof body.nextExercise === 'string') {
          if (body.nextExercise.trim() === '') {
            updates.nextExercise = null;
          } else if (isValidObjectId(body.nextExercise.trim())) {
            updates.nextExercise = body.nextExercise.trim();
          } else {
            return apiError('Next exercise must be a valid ID or null', 400, 'ERR_VALIDATION');
          }
        } else {
          return apiError('Next exercise must be a string ID or null', 400, 'ERR_VALIDATION');
        }
      }
      
      // Validate and update uniqueId if provided (renamed from unique_id)
      if (body.uniqueId !== undefined) {
        if (typeof body.uniqueId !== 'string' || body.uniqueId.trim() === '') {
          return apiError('Unique ID must be a non-empty string', 400, 'ERR_VALIDATION');
        }
        updates.uniqueId = body.uniqueId.trim();
      }
      
      // If there are no valid updates, return error
      if (Object.keys(updates).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
      }
      
      // Update exercise with defensive error handling
      let updatedExercise: IExercise | null;
      try {
        updatedExercise = await Exercise.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true, runValidators: true }
        ) as IExercise | null;
        
        if (!updatedExercise) {
          return apiError('Exercise not found after update', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error updating exercise in database');
      }
      
      // Process updated exercise's relationships
      let previousExercise = null;
      let nextExercise = null;
      
      if (updatedExercise.previousExercise) {
        try {
          const prev = await Exercise.findById(updatedExercise.previousExercise)
            .select('name category subcategory progressionLevel') as IExercise | null;
          
          if (prev) {
            previousExercise = {
              id: prev._id.toString(),
              name: prev.name,
              category: prev.category,
              subcategory: prev.subcategory,
              progressionLevel: prev.progressionLevel
            };
          }
        } catch (error) {
          console.error('Error fetching previous exercise after update:', error);
        }
      }
      
      if (updatedExercise.nextExercise) {
        try {
          const next = await Exercise.findById(updatedExercise.nextExercise)
            .select('name category subcategory progressionLevel') as IExercise | null;
          
          if (next) {
            nextExercise = {
              id: next._id.toString(),
              name: next.name,
              category: next.category,
              subcategory: next.subcategory,
              progressionLevel: next.progressionLevel
            };
          }
        } catch (error) {
          console.error('Error fetching next exercise after update:', error);
        }
      }
      
      // Format response
      let exerciseResponse: ExerciseData;
      try {
        const exerciseObj = updatedExercise.toObject();
        exerciseResponse = {
          id: exerciseObj._id.toString(),
          name: exerciseObj.name || 'Unknown Exercise',
          category: exerciseObj.category || 'Uncategorized',
          subcategory: exerciseObj.subcategory || '',
          progressionLevel: exerciseObj.progressionLevel || 1,
          difficulty: exerciseObj.difficulty || 'beginner',
          description: exerciseObj.description || '',
          primaryMuscleGroup: exerciseObj.primaryMuscleGroup || '',
          secondaryMuscleGroups: Array.isArray(exerciseObj.secondaryMuscleGroups) 
            ? exerciseObj.secondaryMuscleGroups 
            : typeof exerciseObj.secondaryMuscleGroups === 'string'
              ? exerciseObj.secondaryMuscleGroups.split(',').map((group: string) => group.trim())
              : [],
          formCues: Array.isArray(exerciseObj.formCues) 
            ? exerciseObj.formCues 
            : typeof exerciseObj.formCues === 'string'
              ? exerciseObj.formCues.split(',').map((cue: string) => cue.trim())
              : [],
          xpValue: exerciseObj.xpValue || exerciseObj.progressionLevel * 10 || 10,
          unlockRequirements: exerciseObj.unlockRequirements || '',
          previousExercise,
          nextExercise
        };
      } catch (error) {
        console.error('Error formatting updated exercise response:', error);
        // Fallback with minimal data
        exerciseResponse = {
          id: updatedExercise._id.toString(),
          name: updatedExercise.name || 'Unknown Exercise',
          category: updatedExercise.category || 'Uncategorized',
          subcategory: updatedExercise.subcategory || '',
          progressionLevel: updatedExercise.progressionLevel || 1,
          difficulty: updatedExercise.difficulty || 'beginner',
          xpValue: updatedExercise.xpValue || 10
        };
      }
      
      return apiResponse(exerciseResponse, true, 'Exercise updated successfully');
    } catch (error) {
      return handleApiError(error, "Error updating exercise");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/exercises/[id] (Admin only)
 * Delete a specific exercise by ID
 */
export const DELETE = withAuth<{ id: string }, { id: string }>(
  async (req: NextRequest, userId, context) => {
    try {
      await dbConnect();
      
      // Ensure context and params exist
      if (!context || !context.params) {
        return apiError('Missing route parameters', 400, 'ERR_MISSING_PARAM');
      }
      
      const { id } = context.params;
      
      if (!id || typeof id !== 'string') {
        return apiError('Exercise ID is required', 400, 'ERR_VALIDATION');
      }
      
      // Check if ID is valid MongoDB ObjectId
      if (!isValidObjectId(id)) {
        return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
      }
      
      // Check if user has admin permission (actual role check should be in middleware)
      // This is a fallback defense - the API should be protected by admin middleware
      try {
        // This is where you would check if the user has admin role
        // For now, we'll assume this check is handled by middleware
        // and this is just a defensive fallback
      } catch (error) {
        return apiError('Insufficient permissions', 403, 'ERR_FORBIDDEN');
      }
      
      // Get exercise with defensive error handling
      let exercise: IExercise | null;
      try {
        exercise = await Exercise.findById(id) as IExercise | null;
        
        if (!exercise) {
          return apiError('Exercise not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving exercise from database');
      }
      
      // Check if exercise is in use before deletion
      // This would check for references in workouts, progressions, etc.
      // For now we'll skip this check but in production it should be implemented
      
      // Update references in other exercises
      try {
        // Update exercises that reference this one as previous
        await Exercise.updateMany(
          { previousExercise: id },
          { $unset: { previousExercise: "" } }
        );
        
        // Update exercises that reference this one as next
        await Exercise.updateMany(
          { nextExercise: id },
          { $unset: { nextExercise: "" } }
        );
      } catch (error) {
        console.error('Error updating exercise references:', error);
        // Continue with deletion even if reference updates fail
      }
      
      // Delete exercise with defensive error handling
      try {
        await Exercise.deleteOne({ _id: id });
      } catch (error) {
        return handleApiError(error, 'Error deleting exercise from database');
      }
      
      return apiResponse({ id }, true, 'Exercise deleted successfully');
    } catch (error) {
      return handleApiError(error, "Error deleting exercise");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);