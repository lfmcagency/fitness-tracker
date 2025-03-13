import mongoose, { Schema, Document } from 'mongoose';

export type AchievementType = 'strength' | 'consistency' | 'nutrition' | 'milestone';

export interface AchievementRequirements {
  exerciseId?: mongoose.Types.ObjectId;
  reps?: number;
  sets?: number;
  streak?: number;
  level?: number;
}

export interface IAchievement extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: AchievementType;
  xpValue: number;
  requirements: AchievementRequirements;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}