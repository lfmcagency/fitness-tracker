// src/types/api/workoutRequests.ts

/**
 * Query parameters for workout listing
 */
export interface WorkoutQueryParams {
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    category?: string; // filter by workout category
    completed?: boolean; // filter by completion status
    page?: number;
    limit?: number;
    sort?: string; // field to sort by
    order?: 'asc' | 'desc';
  }
  
  /**
   * Request body for creating a new workout
   */
  export interface CreateWorkoutRequest {
    name: string;
    date?: string; // ISO date string, defaults to current date
    bodyweight?: number;
    duration?: number; // in minutes
    notes?: string;
    // Optional initial sets to add
    sets?: Array<{
      exerciseId: string;
      reps?: number;
      weight?: number;
      holdTime?: number; // in seconds
      completed?: boolean;
      notes?: string;
    }>;
    completed?: boolean; // whether the workout is completed
  }
  
  /**
   * Request body for updating a workout
   */
  export interface UpdateWorkoutRequest {
    name?: string;
    date?: string; // ISO date string
    bodyweight?: number;
    duration?: number; // in minutes
    notes?: string;
    completed?: boolean;
  }
  
  /**
   * Request body for adding a set to a workout
   */
  export interface AddWorkoutSetRequest {
    exerciseId: string;
    reps?: number;
    weight?: number;
    holdTime?: number; // in seconds
    completed?: boolean;
    notes?: string;
    position?: number; // position in the set order, adds to end if not specified
  }
  
  /**
   * Request body for updating a set in a workout
   */
  export interface UpdateWorkoutSetRequest {
    exerciseId?: string;
    reps?: number;
    weight?: number;
    holdTime?: number; // in seconds
    completed?: boolean;
    notes?: string;
  }
  
  /**
   * Request body for bulk set updates
   */
  export interface BulkUpdateSetsRequest {
    sets: Array<{
      id: string;
      updates: UpdateWorkoutSetRequest;
    }>;
  }
  
  /**
   * Parameters for workout performance queries
   */
  export interface WorkoutPerformanceParams {
    exerciseId: string;
    timeRange?: 'week' | 'month' | '3months' | '6months' | 'year' | 'all';
    startDate?: string;
    endDate?: string;
    includeBodyweight?: boolean;
    calculateTrends?: boolean;
  }