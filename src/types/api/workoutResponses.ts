// src/types/api/workoutResponses.ts
import { ApiResponse } from './common';
import { PaginationInfo } from './pagination';

/**
 * Data structure for a workout set
 */
export interface WorkoutSetData {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory?: string;
  reps?: number | null;
  weight?: number | null;
  holdTime?: number | null; // in seconds
  completed: boolean;
  notes?: string;
  performance?: {
    previousBest?: number;
    improvement?: number; // percentage
    personalRecord: boolean;
  };
}

/**
 * Data structure for a workout
 */
export interface WorkoutData {
  id: string;
  name: string;
  date: string; // ISO date string
  duration?: number; // in minutes
  bodyweight?: number;
  sets: WorkoutSetData[];
  notes?: string;
  completed: boolean;
  categories: string[]; // exercise categories included in the workout
  stats?: {
    totalSets: number;
    completedSets: number;
    totalVolume: number; // calculated based on reps × weight
    xpEarned: number;
    primaryCategory?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Data structure for a list of workouts
 */
export interface WorkoutListData {
  workouts: WorkoutData[];
  pagination: PaginationInfo;
  summary?: {
    totalWorkouts: number;
    completedWorkouts: number;
    averageDuration: number;
    frequencyPerWeek: number;
    recentCategories: string[];
    mostFrequentCategory?: string;
  };
}

/**
 * Data structure for workout performance metrics
 */
export interface WorkoutPerformanceData {
  exercise: {
    id: string;
    name: string;
    category: string;
  };
  data: Array<{
    date: string;
    reps?: number;
    weight?: number;
    holdTime?: number;
    volume?: number;
    bodyweight?: number;
    relativeStrength?: number; // calculated as weight/bodyweight
  }>;
  trends: {
    improvement: number; // percentage
    volumeChange: number;
    bestSet: {
      date: string;
      reps?: number;
      weight?: number;
      holdTime?: number;
    };
  };
  timespan: {
    start: string;
    end: string;
    days: number;
  };
}

/**
 * Response for creating/updating a set in a workout
 */
export interface WorkoutSetActionData {
  workoutId: string;
  set: WorkoutSetData;
  workout?: {
    name: string;
    date: string;
    totalSets: number;
  };
}

// API response types
export type WorkoutResponse = ApiResponse<WorkoutData>;
export type WorkoutListResponse = ApiResponse<WorkoutListData>;
export type WorkoutPerformanceResponse = ApiResponse<WorkoutPerformanceData>;
export type WorkoutSetResponse = ApiResponse<WorkoutSetActionData>;