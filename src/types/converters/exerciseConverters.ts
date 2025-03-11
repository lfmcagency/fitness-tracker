import { IExercise, ExerciseCategory, ExerciseDifficulty } from '../models/exercise';

export interface ExerciseData {
  id: string;
  name: string;
  category: ExerciseCategory;
  subcategory?: string;
  progressionLevel: number;
  description?: string;
  primaryMuscleGroup?: string;
  secondaryMuscleGroups: string[];
  difficulty: ExerciseDifficulty;
  xpValue: number;
  unlockRequirements?: string;
  formCues?: string[];
  previousExercise?: string;
  nextExercise?: string;
  unlocked?: boolean;
  progress?: number;
}

/**
 * Converts an Exercise document to ExerciseData response format
 */
export function convertExerciseToResponse(
  exercise: IExercise, 
  options?: { 
    includeProgress?: boolean,
    unlocked?: boolean,
    userId?: string 
  }
): ExerciseData {
  return {
    id: exercise._id.toString(),
    name: exercise.name,
    category: exercise.category,
    subcategory: exercise.subcategory,
    progressionLevel: exercise.progressionLevel,
    description: exercise.description,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    secondaryMuscleGroups: Array.isArray(exercise.secondaryMuscleGroups) 
      ? exercise.secondaryMuscleGroups 
      : [],
    difficulty: exercise.difficulty,
    xpValue: exercise.xpValue, // This is what was called pyValue in the error
    unlockRequirements: exercise.unlockRequirements,
    formCues: Array.isArray(exercise.formCues) ? exercise.formCues : [],
    previousExercise: exercise.previousExercise?.toString(),
    nextExercise: exercise.nextExercise?.toString(),
    unlocked: options?.unlocked || false,
    progress: options?.includeProgress ? 0 : undefined
  };
}

/**
 * Parses exercise query parameters with validation
 */
export function parseExerciseQueryParams(url: URL): {
  query: Record<string, any>;
  pagination: { page: number; limit: number; skip: number };
  sort: { [key: string]: number };
} {
  // Implementation details...
  // This function would handle parsing and validating search parameters
  
  // Default values to avoid undefined issues
  const page = 1;
  const limit = 20;
  const skip = 0;
  
  return {
    query: {},
    pagination: { page, limit, skip },
    sort: { progressionLevel: 1 }
  };
}