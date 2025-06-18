// src/types/api/progressResponses.ts
import { ApiResponse } from './common';
import { ProgressCategory } from '../models/progress';

// ==========================================
// SIMPLIFIED EVENT CONTRACTS
// ==========================================

/**
 * What coordinator sends to Progress - simplified from old rich contracts
 * This replaces the complex ProgressEventContract
 */
export interface ProgressEventContract {
  userId: string;
  token: string;
  source: 'ethos' | 'trophe' | 'arete';
  action: string;
  timestamp: Date;
  
  // Simple context from domain processors
  context: {
    // Common fields
    milestoneHit?: string;
    
    // Task context (ethos)
    taskId?: string;
    taskName?: string;
    streakCount?: number;
    totalCompletions?: number;
    isSystemTask?: boolean;
    
    // Meal context (trophe)
    mealId?: string;
    mealName?: string;
    totalMeals?: number;
    dailyMacroProgress?: number;
    macroGoalsMet?: boolean;
    
    // Weight context (arete)
    weightEntryId?: string;
    currentWeight?: number;
    totalEntries?: number;
  };
}

/**
 * What Progress sends to Achievement system (future)
 */
export interface AchievementEventContract {
  userId: string;
  achievementId: string;
  achievementType: 'discipline' | 'usage' | 'progress';
  triggeredBy: 'streak' | 'total_count' | 'xp_threshold' | 'level_threshold';
  currentValue: number;
  token?: string;
}

// ==========================================
// API RESPONSE TYPES (simplified)
// ==========================================

/**
 * Clean XP award result - no more complex contracts
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
 * Simple progress overview - clean dashboard data
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
 * Individual category progress data
 */
export interface CategoryProgressData {
  level: number;
  xp: number;
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
export type CategoryProgressResponse = ApiResponse<CategoryProgressData>;
export type WeightEntryResponse = ApiResponse<WeightEntryData>;
export type ProgressHistoryResponse = ApiResponse<ProgressHistoryData>;