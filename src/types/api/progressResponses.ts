// src/types/api/progressResponses.ts
import { ApiResponse } from './common';
import { AchievementData } from './achievementResponses';
import { ProgressCategory } from '../models/progress';

export interface LevelData {
  current: number;
  xp: number;
  nextLevelXp: number;
  xpToNextLevel: number;
  progress: number; // Percentage to next level
}

export interface CategoryProgressData {
  level: number;
  xp: number;
}

export interface CategoryComparison {
  categories: { category: ProgressCategory; xp: number; level: number }[];
  strongest: { category: ProgressCategory; xp: number; level: number };
  weakest: { category: ProgressCategory; xp: number; level: number };
  balanceScore: number;
  balanceMessage: string;
}

export interface ProgressHistoryEntry {
  date: string;
  xp: number;
  totalXp: number;
}

export interface ProgressResponseData {
  level: LevelData;
  categories: {
    core: CategoryProgressData;
    push: CategoryProgressData;
    pull: CategoryProgressData;
    legs: CategoryProgressData;
    comparison: CategoryComparison;
  };
  achievements: {
    total: number;
    unlocked: number;
    list: AchievementData[];
  };
  lastUpdated: string; // ISO date string
}

export interface AddXpResponseData {
  success: boolean;
  leveledUp: boolean;
  level: number;
  totalXp: number;
  xpToNextLevel: number;
  xpAdded: number;
  [key: string]: any; // For category-specific data
}

export interface HistoryResponseData {
  data: ProgressHistoryEntry[];
  dataPoints: number;
  totalXp: number;
  timeRange: 'day' | 'week' | 'month' | 'year' | 'all';
  groupBy: 'day' | 'week' | 'month';
  category: string | 'all';
  dataSource: 'transactions' | 'summaries' | 'none';
  startDate: string;
  endDate: string;
}

export interface BodyweightEntry {
  date: Date;
  value: number;
  unit: 'kg' | 'lb';
}

export type ProgressResponse = ApiResponse<ProgressResponseData>;
export type AddXpResponse = ApiResponse<AddXpResponseData>;
export type HistoryResponse = ApiResponse<HistoryResponseData>;
export type BodyweightResponse = ApiResponse<BodyweightEntry[]>;