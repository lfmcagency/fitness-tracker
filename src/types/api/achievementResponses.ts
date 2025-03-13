import { ApiResponse } from './common';
import { PaginationInfo } from './pagination';

/**
 * Single achievement data structure
 */
export interface AchievementData {
  id: string;
  title: string;
  description: string;
  type: 'strength' | 'consistency' | 'nutrition' | 'milestone';
  xpReward: number;
  icon: string;
  requirements?: {
    level?: number;
    exerciseId?: string;
    reps?: number;
    sets?: number;
    streak?: number;
  };
  unlocked: boolean;
  progress?: number; // 0-100 percentage for locked achievements
  unlockedAt?: string; // ISO date string when unlocked
}

/**
 * Achievement list response with grouping and stats
 */
export interface AchievementListData {
  total: number;
  unlocked: number;
  byType: Record<string, AchievementData[]>;
  all: AchievementData[];
}

/**
 * Claim achievement response data
 */
export interface ClaimAchievementData {
  claimed: boolean;
  message: string;
  achievement?: {
    id: string;
    title: string;
    xpReward: number;
  };
  xpAwarded?: number;
}

/**
 * Achievement requirement check response
 */
export interface AchievementEligibilityData {
  eligible: boolean;
  requirementsMet: boolean;
  achievement: AchievementData;
  reason?: string;
}

// Response types using the ApiResponse wrapper
export type AchievementResponse = ApiResponse<AchievementData>;
export type AchievementListResponse = ApiResponse<AchievementListData>;
export type ClaimAchievementResponse = ApiResponse<ClaimAchievementData>;
export type AchievementEligibilityResponse = ApiResponse<AchievementEligibilityData>;