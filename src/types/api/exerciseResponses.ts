import { ApiResponse } from './common';
import { PaginationInfo } from './pagination';

// Exercise data structure
export interface ExerciseData {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  progressionLevel: number;
  description?: string;
  primaryMuscleGroup?: string;
  secondaryMuscleGroups?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  xpValue: number;
  unlockRequirements?: string;
  formCues?: string[];
  previousExercise?: {
    id: string;
    name: string;
    category: string;
    subcategory?: string;
    progressionLevel: number;
  } | null;
  nextExercise?: {
    id: string;
    name: string;
    category: string;
    subcategory?: string;
    progressionLevel: number;
  } | null;
}

// List results for exercises
export interface ExerciseListData {
  exercises: ExerciseData[];
  pagination: PaginationInfo;
}

// Progression data
export interface ProgressionData {
  exercise?: ExerciseData;
  progressionPath: ExerciseData[];
  root?: {
    id: string;
    name: string;
    progressionLevel: number;
  } | null;
}

export interface CategoryProgressionData {
  category: string;
  subcategory: string | null;
  progressionTrees: {
    trees: Array<{
      root: {
        id: string;
        name: string;
        progressionLevel: number;
      };
      exercises: ExerciseData[];
      length: number;
      category: string;
      subcategory: string | null;
    }>;
    bySubcategory: Record<string, any[]>;
    rootCount: number;
  };
  exerciseCount: number;
}

export interface SearchResultData {
  query: string;
  results: Array<ExerciseData & { relevance?: number }>;
  filters: {
    category: string | null;
    subcategory: string | null;
    difficulty: string | null;
    muscleGroup: string | null;
    progressionLevel: {
      min: number | null;
      max: number | null;
    };
  };
  pagination: PaginationInfo;
}

export interface ExerciseSetData {
  exerciseId: string;
  setIndex: number;
  reps?: number | null;
  weight?: number | null;
  holdTime?: number | null;
  completed: boolean;
  rpe?: number | null;
  notes?: string | null;
}

// Response types
export type ExerciseResponse = ApiResponse<ExerciseData>;
export type ExerciseListResponse = ApiResponse<ExerciseListData>;
export type ExerciseProgressionResponse = ApiResponse<ProgressionData>;
export type CategoryProgressionResponse = ApiResponse<CategoryProgressionData>;
export type ExerciseSearchResponse = ApiResponse<SearchResultData>;
export type ExerciseSetResponse = ApiResponse<ExerciseSetData>;