// Exercise query parameters
export interface ExerciseQueryParams {
    search?: string;
    category?: string;
    subcategory?: string;
    difficulty?: string;
    minLevel?: number;
    maxLevel?: number;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  
  // Request body for creating a new exercise
  export interface CreateExerciseRequest {
    name: string;
    category: string;
    subcategory?: string;
    progressionLevel?: number;
    description?: string;
    primaryMuscleGroup?: string;
    secondaryMuscleGroups?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
    xpValue?: number;
    unlockRequirements?: string;
    formCues?: string[];
    previousExercise?: string;
    nextExercise?: string;
    unique_id?: string;
  }
  
  // Request body for updating an exercise
  export interface UpdateExerciseRequest {
    name?: string;
    category?: string;
    subcategory?: string;
    progressionLevel?: number;
    description?: string;
    primaryMuscleGroup?: string;
    secondaryMuscleGroups?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
    xpValue?: number;
    unlockRequirements?: string;
    formCues?: string[];
    previousExercise?: string | null;
    nextExercise?: string | null;
    unique_id?: string;
  }
  
  // Parameters for exercise progression
  export interface ProgressionQueryParams {
    exerciseId?: string;
    category?: string;
    subcategory?: string;
  }
  
  // Query parameters for exercise search
  export interface ExerciseSearchParams extends ExerciseQueryParams {
    q?: string;
    query?: string;
    muscle?: string;
    muscleGroup?: string;
  }
  
  // Request for updating exercise set
  export interface UpdateExerciseSetRequest {
    reps?: number | null;
    weight?: number | null;
    holdTime?: number | null;
    completed?: boolean;
    rpe?: number | null;
    notes?: string | null;
    workoutId?: string;
  }