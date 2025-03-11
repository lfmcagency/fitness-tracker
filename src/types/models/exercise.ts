import mongoose from 'mongoose';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type ExerciseCategory = 'core' | 'push' | 'pull' | 'legs';

export interface IExercise extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: ExerciseCategory;
  subcategory?: string;
  progressionLevel: number;
  description?: string;
  primaryMuscleGroup?: string;
  secondaryMuscleGroups?: string[];
  difficulty: ExerciseDifficulty;
  uniqueId?: string;
  relPrev?: string;
  relNext?: string;
  xpValue: number; // This matches what was called pyValue in the error
  unlockRequirements?: string;
  formCues?: string[];
  previousExercise?: mongoose.Types.ObjectId;
  nextExercise?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExerciseModel extends mongoose.Model<IExercise> {
  findByDifficulty(difficulty: string): Promise<IExercise[]>;
  findNextProgressions(exerciseId: mongoose.Types.ObjectId | string): Promise<IExercise[] | null>;
}