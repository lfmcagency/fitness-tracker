// src/types/models/progress.ts
import mongoose from 'mongoose';
import { ProgressCategory } from '@/lib/category-progress';

export type { ProgressCategory };

export type LocalProgressCategory = 'core' | 'push' | 'pull' | 'legs';

export interface XpTransaction {
  amount: number;
  source: string;
  category?: LocalProgressCategory;
  date: Date;
  description?: string;
  timestamp?: number;
}

export interface XpDailySummary {
  date: Date;
  totalXp: number;
  sources: {
    [key: string]: number;
  };
  categories: {
    core: number;
    push: number;
    pull: number;
    legs: number;
  };
}

export interface CategoryProgress {
  level: number;
  xp: number;
  unlockedExercises: mongoose.Types.ObjectId[];
}

export interface BodyweightEntry {
  date: Date;
  value: number;
  unit: 'kg' | 'lb';
}

export interface IUserProgress extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  totalXp: number;
  level: number;
  categoryXp: {
    core: number;
    push: number;
    pull: number;
    legs: number;
  };
  categoryProgress: {
    core: CategoryProgress;
    push: CategoryProgress;
    pull: CategoryProgress;
    legs: CategoryProgress;
  };
  achievements: mongoose.Types.ObjectId[];
  xpHistory: XpTransaction[];
  dailySummaries: XpDailySummary[];
  bodyweight: BodyweightEntry[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  pendingAchievements: string[];
  
  // Methods
  calculateLevel(xp: number): number;
  addXp(amount: number, source: string, category?: ProgressCategory, description?: string): Promise<boolean>;
  
  // 🆕 NEW: Subtraction method for clean reversal handling
  subtractXp(amount: number, source: string, category?: ProgressCategory, description?: string): Promise<boolean>;
  
  getNextLevelXp(): number;
  getXpToNextLevel(): number;
  hasLeveledUp(previousXp: number, newXp: number): boolean;
  summarizeDailyXp(date?: Date): Promise<XpDailySummary>;
  purgeOldHistory(olderThan: Date): Promise<number>;
  addPendingAchievement(achievementId: string): Promise<void>;
  claimPendingAchievement(achievementId: string): Promise<boolean>;
  getPendingAchievements(): string[];
  hasPendingAchievement(achievementId: string): boolean;
}

export interface IUserProgressModel extends mongoose.Model<IUserProgress> {
  createInitialProgress(userId: mongoose.Types.ObjectId): Promise<IUserProgress>;
  calculateLevelFromXp(xp: number): number;
}