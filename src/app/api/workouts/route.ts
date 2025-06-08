// src/app/api/workouts/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel, getUserProgressOrCreate } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Workout from "@/models/Workout";
import Exercise from "@/models/Exercise";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId, SortOrder } from "mongoose";
import { WorkoutListData, WorkoutData } from "@/types/api/workoutResponses";
import { CreateWorkoutRequest } from "@/types/api/workoutRequests";
import { convertWorkoutToResponse, convertWorkoutListToResponse, parseWorkoutQueryParams } from "@/types/converters/workoutConverters";
import { IWorkout } from "@/types/models/workout";
import { awardWorkoutCompletionXp } from "@/lib/xp/soma";
import { Types } from "mongoose";
import { ProgressCategory } from "@/lib/category-progress";

/**
 * GET /api/workouts
 * List workouts with filtering and pagination
 */
export const GET = withAuth<WorkoutListData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse URL query parameters
      const url = new URL(req.url);
      const { query, pagination, sort } = parseWorkoutQueryParams(url);
      
      // Ensure we only get workouts for the authenticated user
      query.user = isValidObjectId(userId) ? new Types.ObjectId(userId) : userId;
      
      // Count total documents for pagination
      const total = await Workout.countDocuments(query);
      
      // Fetch workouts with pagination
      const workouts = await Workout.find(query)
        .sort(sort as { [key: string]: SortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean() as IWorkout[];
      
      // For better performance, prefetch exercise names and categories
      const exerciseIds = new Set<string>();
      
      // Collect all unique exercise IDs from workout sets
      workouts.forEach(workout => {
        workout.sets.forEach(set => {
          if (set.exercise) {
            const exerciseId = typeof set.exercise === 'string' 
              ? set.exercise 
              : set.exercise.toString();
            exerciseIds.add(exerciseId);
          }
        });
      });
      
      // Create exercise name/category map if we have exercise IDs
      let exerciseNameMap: Map<string, { name: string; category?: string }> | undefined;
      
      if (exerciseIds.size > 0) {
        // Fetch exercise details
        const exercises = await Exercise.find(
          { _id: { $in: Array.from(exerciseIds) } },
          { _id: 1, name: 1, category: 1 }
        ).lean();
        
        // Build the map of exercise ID to name/category
        exerciseNameMap = new Map();
        exercises.forEach(exercise => {
          exerciseNameMap!.set(exercise._id.toString(), {
            name: exercise.name,
            category: exercise.category
          });
        });
      }
      
      // Convert to response format
      const responseData = convertWorkoutListToResponse(
        workouts,
        total,
        pagination.page,
        pagination.limit
      );
      
      return apiResponse(responseData, true, 'Workouts retrieved successfully');
    } catch (error) {
      return handleApiError(error, "Error retrieving workouts");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/workouts
 * Create a new workout
 */
export const POST = withAuth<WorkoutData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse request body with defensive error handling
      let body: CreateWorkoutRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate required fields
      if (!body || typeof body !== 'object') {
        return apiError('Invalid workout data', 400, 'ERR_INVALID_DATA');
      }
      
      if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
        return apiError('Workout name is required', 400, 'ERR_VALIDATION');
      }
      
      // Process date (default to current date if not provided or invalid)
      let workoutDate = new Date();
      if (body.date) {
        const parsedDate = new Date(body.date);
        if (!isNaN(parsedDate.getTime())) {
          workoutDate = parsedDate;
        }
      }
      
      // Prepare workout data
      const workoutData: Record<string, any> = {
        user: userId,
        name: body.name.trim(),
        date: workoutDate,
        completed: body.completed || false
      };
      
      // Add optional fields if they exist
      if (body.bodyweight !== undefined && !isNaN(Number(body.bodyweight))) {
        workoutData.bodyweight = Number(body.bodyweight);
      }
      
      if (body.duration !== undefined && !isNaN(Number(body.duration))) {
        workoutData.duration = Number(body.duration);
      }
      
      if (body.notes) {
        workoutData.notes = body.notes.trim();
      }
      
      // Prepare sets if provided
      if (Array.isArray(body.sets) && body.sets.length > 0) {
        // Validate exercise IDs
        const validSets = body.sets.filter(set => 
          set.exerciseId && isValidObjectId(set.exerciseId)
        );
        
        if (validSets.length > 0) {
          workoutData.sets = validSets.map(set => ({
            exercise: set.exerciseId,
            reps: set.reps !== undefined ? Number(set.reps) : undefined,
            weight: set.weight !== undefined ? Number(set.weight) : undefined,
            holdTime: set.holdTime !== undefined ? Number(set.holdTime) : undefined,
            completed: set.completed || false,
            notes: set.notes
          }));
        } else {
          workoutData.sets = [];
        }
      } else {
        workoutData.sets = [];
      }
      
      // Create new workout
      const newWorkout = await Workout.create(workoutData) as IWorkout;
      
      // Award XP if the workout is marked as completed
      if (body.completed) {
        try {
          // Award XP based on the number of sets and exercise categories
          // This would be more sophisticated in a real implementation
          const xpAmount = Math.min(100, 10 * workoutData.sets.length);
          
          // Get primary category for the workout (if available)
          let category = undefined;
          if (workoutData.sets.length > 0) {
            // Fetch the first exercise to get its category
            const firstExerciseId = workoutData.sets[0].exercise;
            if (firstExerciseId) {
              const exercise = await Exercise.findById(firstExerciseId, 'category');
              if (exercise && exercise.category) {
                category = exercise.category;
              }
            }
          }
          
          // Award XP with workout completion as source
          await awardWorkoutCompletionXp(
                userId,
                body.name,
                'medium', // or calculate difficulty based on workout
          category ? [category as ProgressCategory] : undefined
);
        } catch (xpError) {
          // Log but don't fail if XP award fails
          console.error('Error awarding XP for workout completion:', xpError);
        }
      }
      
      // Fetch complete workout with populated references
      const createdWorkout = await Workout.findById(newWorkout._id) as IWorkout;
      
      // Convert to response format
      const workoutResponse = convertWorkoutToResponse(createdWorkout);
      
      return apiResponse(workoutResponse, true, 'Workout created successfully', 201);
    } catch (error) {
      return handleApiError(error, "Error creating workout");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);