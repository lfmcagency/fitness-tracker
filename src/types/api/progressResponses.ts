// src/types/api/progressResponses.ts
import { ApiResponse } from './common';
import { ProgressCategory } from '../models/progress';

// ==========================================
// EVENT CONTRACTS (what gets sent between systems)
// ==========================================

/**
 * What Ethos sends to Progress when awarding XP
 * Ethos provides context, Progress calculates XP amounts
 */
export interface ProgressEventContract {
  userId: string;
  eventId: number; // For deduplication
  source: string; // 'task_completion', 'meal_logged', etc.
  
  // Task context (from Ethos)
  taskId?: string;
  taskType?: string;
  streakCount: number;
  totalCompletions: number;
  token?: string;
  
  // Milestone context
  milestoneHit?: string; // '7_day_streak', '50_completions', etc.
  previousMetric?: string; // For 80% → 100% transitions
  currentMetric?: string; // 'macro_80_percent', 'macro_100_percent'
  
  // Category for Soma events
  category?: ProgressCategory;
  
  // Additional context for XP calculation
  difficulty?: 'easy' | 'medium' | 'hard';
  bodyweight?: number;
  reps?: number;
  exerciseName?: string;
  isSystemTask?: boolean;
  isSystemItem?: boolean;
  [key: string]: any;  // Add this to allow any additional properties
}

/**
 * What Progress sends to Achievement system
 */
export interface AchievementEventContract {
  userId: string;
  achievementId: string;
  achievementType: 'discipline' | 'usage' | 'progress';
  triggeredBy: 'streak' | 'total_count' | 'xp_threshold' | 'level_threshold';
  currentValue: number; // Current streak/count/xp/level
}

// ==========================================
// API RESPONSE TYPES (simplified)
// ==========================================

/**
 * Result from XP award - clean and simple
 */
export interface XpAwardResult {
  xpAwarded: number;
  totalXp: number;
  currentLevel: number;
  leveledUp: boolean;
  xpToNextLevel: number;
  
  // Category info (if applicable)
  categoryProgress?: {
    category: ProgressCategory;
    xp: number;
    level: number;
    leveledUp: boolean;
  };
  
  // Achievement unlocks (if any)
  achievementsUnlocked?: string[];
}

/**
 * Simple progress overview - no complex bundling
 */
export interface ProgressOverviewData {
  level: {
    current: number;
    totalXp: number;
    xpToNext: number;
    progressPercent: number;
  };
  categories: {
    core: { level: number; xp: number };
    push: { level: number; xp: number };
    pull: { level: number; xp: number };
    legs: { level: number; xp: number };
  };
  recentActivity: Array<{
    date: string;
    xp: number;
    source: string;
  }>;
  lastUpdated: string;
}

/**
 * Weight entry for bodyweight tracking
 */
export interface WeightEntryData {
  _id?: string;
  weight: number;
  date: string;
  unit: 'kg' | 'lb';
}

/**
 * History data for charts/analytics
 */
export interface ProgressHistoryData {
  timeRange: 'day' | 'week' | 'month' | 'year';
  groupBy: 'day' | 'week' | 'month';
  data: Array<{
    date: string;
    xp: number;
    cumulativeXp: number;
  }>;
  totalXp: number;
  dataPoints: number;
}

// ==========================================
// API RESPONSE WRAPPERS
// ==========================================

export type XpAwardResponse = ApiResponse<XpAwardResult>;
export type ProgressOverviewResponse = ApiResponse<ProgressOverviewData>;
export type WeightEntryResponse = ApiResponse<WeightEntryData>;
export type ProgressHistoryResponse = ApiResponse<ProgressHistoryData>;