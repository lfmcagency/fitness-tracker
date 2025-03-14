// src/types/models/workout.ts
import mongoose from 'mongoose';
import { ProgressCategory } from './progress';

/**
 * Interface for a workout set (embedded document)
 */
export interface IWorkoutSet {
  _id?: mongoose.Types.ObjectId;
  exercise: mongoose.Types.ObjectId | string;
  reps?: number;
  weight?: number;
  holdTime?: number; // in seconds
  completed: boolean;
  notes?: string;
}

/**
 * Interface for the workout document
 */
export interface IWorkout extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  bodyweight?: number;
  duration?: number; // in minutes
  sets: IWorkoutSet[];
  notes?: string;
  completed: boolean;
  
  // Virtual fields
  categories?: ProgressCategory[]; // Calculated based on exercises in the workout
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods (if any)
  calculateVolume(): number;
  calculateCompletionPercentage(): number;
  getPrimaryCategory(): ProgressCategory | null;
  getExerciseCategories(): ProgressCategory[];
}

/**
 * Interface for the static methods on the Workout model
 */
export interface IWorkoutModel extends mongoose.Model<IWorkout> {
  // Static methods (if any)
  getWorkoutsInDateRange(
    userId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date
  ): Promise<IWorkout[]>;
  
  getRecentWorkouts(
    userId: mongoose.Types.ObjectId | string,
    limit?: number
  ): Promise<IWorkout[]>;
  
  getWorkoutsByExercise(
    userId: mongoose.Types.ObjectId | string,
    exerciseId: mongoose.Types.ObjectId | string
  ): Promise<IWorkout[]>;
  
  getExercisePerformance(
    userId: mongoose.Types.ObjectId | string,
    exerciseId: mongoose.Types.ObjectId | string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    date: Date;
    reps?: number;
    weight?: number;
    holdTime?: number;
    bodyweight?: number;
  }[]>;
}