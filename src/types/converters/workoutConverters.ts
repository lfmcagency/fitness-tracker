// src/types/converters/workoutConverters.ts
import { IWorkout, IWorkoutSet } from '../models/workout';
import { WorkoutData, WorkoutSetData, WorkoutListData } from '../api/workoutResponses';
import { PaginationInfo } from '../api/pagination';
import { ProgressCategory } from '../models/progress';
import { isValidObjectId } from 'mongoose';

/**
 * Convert a workout set from database to API response format
 * @param set The workout set document
 * @param exerciseNameMap Map of exercise IDs to names (optional, for performance)
 * @returns Formatted workout set data for API response
 */
export function convertWorkoutSetToResponse(
  set: IWorkoutSet,
  exerciseNameMap?: Map<string, { name: string; category?: string }>
): WorkoutSetData {
  // Default values for missing exercise info
  let exerciseName = 'Unknown Exercise';
  let exerciseCategory: string | undefined = undefined;
  
  // Get exercise name if we have a map
  if (exerciseNameMap && typeof set.exercise === 'string') {
    const exerciseInfo = exerciseNameMap.get(set.exercise);
    if (exerciseInfo) {
      exerciseName = exerciseInfo.name;
      exerciseCategory = exerciseInfo.category;
    }
  }
  
  return {
    id: set._id ? set._id.toString() : 'temp-id',
    exerciseId: typeof set.exercise === 'string' 
      ? set.exercise 
      : set.exercise.toString(),
    exerciseName,
    exerciseCategory,
    reps: set.reps ?? null,
    weight: set.weight ?? null,
    holdTime: set.holdTime ?? null,
    completed: set.completed || false,
    notes: set.notes,
    // Performance data would be added separately if available
    performance: {
      personalRecord: false, // This would be determined by additional logic
    }
  };
}

/**
 * Convert a workout document to API response format
 * @param workout The workout document
 * @param exerciseNameMap Map of exercise IDs to names (optional, for performance)
 * @returns Formatted workout data for API response
 */
export function convertWorkoutToResponse(
  workout: IWorkout,
  exerciseNameMap?: Map<string, { name: string; category?: string }>
): WorkoutData {
  // Convert all sets
  const convertedSets = workout.sets.map(set => 
    convertWorkoutSetToResponse(set, exerciseNameMap)
  );
  
  // Calculate basic stats
  const totalSets = convertedSets.length;
  const completedSets = convertedSets.filter(set => set.completed).length;
  
  // Calculate total volume (simplified: sum of reps × weight across all sets)
  const totalVolume = workout.sets.reduce((sum, set) => {
    if (set.completed && set.reps && set.weight) {
      return sum + (set.reps * set.weight);
    }
    return sum;
  }, 0);
  
  // Get categories from workout (either from virtual field or manually calculate)
  const categories = workout.categories || 
    (workout.getExerciseCategories ? workout.getExerciseCategories() : []);
  
  // Format for response
  return {
    id: workout._id.toString(),
    name: workout.name,
    date: workout.date.toISOString(),
    duration: workout.duration,
    bodyweight: workout.bodyweight,
    sets: convertedSets,
    notes: workout.notes,
    completed: workout.completed || false,
    categories: categories.map(c => c.toString()),
    stats: {
      totalSets,
      completedSets,
      totalVolume,
      xpEarned: 0, // This would be populated from UserProgress if available
      primaryCategory: workout.getPrimaryCategory ? 
        workout.getPrimaryCategory()?.toString() : undefined
    },
    createdAt: workout.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: workout.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert a list of workouts to response format with pagination
 * @param workouts Array of workout documents
 * @param total Total number of workouts (for pagination)
 * @param page Current page number
 * @param limit Items per page
 * @returns Formatted workout list data for API response
 */
export function convertWorkoutListToResponse(
  workouts: IWorkout[],
  total: number,
  page: number,
  limit: number
): WorkoutListData {
  // Convert all workouts
  const convertedWorkouts = workouts.map(workout => convertWorkoutToResponse(workout));
  
  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const pagination: PaginationInfo = {
    total,
    page,
    limit,
    pages: totalPages
  };
  
  // Build response with summary data if workouts exist
  const response: WorkoutListData = {
    workouts: convertedWorkouts,
    pagination
  };
  
  // Add summary data if we have workouts
  if (workouts.length > 0) {
    // Calculate summary statistics
    const completedWorkouts = workouts.filter(w => w.completed).length;
    const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const averageDuration = workouts.length > 0 ? totalDuration / workouts.length : 0;
    
    // Get all categories from workouts
    const allCategories = workouts
      .flatMap(w => w.categories || [])
      .filter(Boolean) as ProgressCategory[];
    
    // Count occurrences of each category
    const categoryCounts = allCategories.reduce<Record<string, number>>((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    // Get most frequent category
    let mostFrequentCategory: string | undefined;
    let maxCount = 0;
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count > maxCount) {
        mostFrequentCategory = category;
        maxCount = count;
      }
    });
    
    // Get recent (unique) categories
    const recentCategories = [...new Set(allCategories.slice(0, 5))];
    
    // Calculate workouts per week (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const recentWorkouts = workouts.filter(w => w.date >= fourWeeksAgo);
    const frequencyPerWeek = recentWorkouts.length / 4;
    
    // Add summary to response
    response.summary = {
      totalWorkouts: total,
      completedWorkouts,
      averageDuration,
      frequencyPerWeek,
      recentCategories,
      mostFrequentCategory
    };
  }
  
  return response;
}

/**
 * Parse URL query parameters for workout listing
 * @param url URL object with query parameters
 * @returns Object containing query, pagination, and sort parameters
 */
export function parseWorkoutQueryParams(url: URL): {
  query: Record<string, any>;
  pagination: { page: number; limit: number; skip: number };
  sort: { [key: string]: number };
} {
  // Initialize query object
  const query: Record<string, any> = {};
  
  // Parse date range parameters
  const startDateParam = url.searchParams.get('startDate');
  const endDateParam = url.searchParams.get('endDate');
  
  if (startDateParam || endDateParam) {
    query.date = {};
    
    if (startDateParam) {
      const startDate = new Date(startDateParam);
      if (!isNaN(startDate.getTime())) {
        query.date.$gte = startDate;
      }
    }
    
    if (endDateParam) {
      const endDate = new Date(endDateParam);
      if (!isNaN(endDate.getTime())) {
        query.date.$lte = endDate;
      }
    }
  }
  
  // Parse completed parameter
  const completedParam = url.searchParams.get('completed');
  if (completedParam !== null) {
    query.completed = completedParam === 'true';
  }
  
  // Parse category parameter
  const categoryParam = url.searchParams.get('category');
  if (categoryParam) {
    // This would need logic to match workouts with a specific category
    // Implementation depends on how categories are stored/indexed
  }
  
  // Parse pagination parameters
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');
  
  let page = 1;
  if (pageParam && !isNaN(Number(pageParam))) {
    page = Math.max(1, parseInt(pageParam));
  }
  
  let limit = 20;
  if (limitParam && !isNaN(Number(limitParam))) {
    limit = Math.min(100, Math.max(1, parseInt(limitParam)));
  }
  
  const skip = (page - 1) * limit;
  
  // Parse sort parameters
  const sortParam = url.searchParams.get('sort') || 'date';
  const orderParam = url.searchParams.get('order') || 'desc';
  
  const sort: { [key: string]: number } = {
    [sortParam]: orderParam === 'asc' ? 1 : -1
  };
  
  return { query, pagination: { page, limit, skip }, sort };
}

/**
 * Validate exercise IDs in workout sets
 * @param exerciseIds Array of exercise IDs to validate
 * @returns Array of valid exercise IDs
 */
export function validateExerciseIds(exerciseIds: string[]): string[] {
  return exerciseIds.filter(id => isValidObjectId(id));
}