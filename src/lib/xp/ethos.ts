import { Types } from 'mongoose';
import UserProgress from '@/models/UserProgress';
import { HydratedDocument } from 'mongoose';
import { IUserProgress } from '@/types/models/progress';

/**
 * Task completion XP logic for the Ethos domain
 * Handles XP awards for completing tasks and maintaining streaks
 */

/**
 * XP reward configuration for tasks
 */
export const TASK_XP_REWARDS = {
  BASE_COMPLETION: 10,
  STREAK_BONUS_PER_DAY: 2,
  MAX_STREAK_BONUS: 50,
  MILESTONE_7_DAYS: 25,
  MILESTONE_30_DAYS: 100,
  MILESTONE_100_DAYS: 500,
};

/**
 * Result from XP award operations
 */
export interface TaskXpAwardResult {
  xpAdded: number;
  currentLevel: number;
  previousLevel: number;
  leveledUp: boolean;
  totalXp: number;
}

/**
 * Awards XP for completing a task with streak bonuses
 * @param userId User ID (string or ObjectId)
 * @param taskName Name of the completed task
 * @param streakCount Current streak count (optional)
 * @returns XP award result with level information
 */
export async function awardTaskCompletionXp(
  userId: string | Types.ObjectId,
  taskName: string,
  streakCount?: number
): Promise<TaskXpAwardResult> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Get or create user progress
  let userProgress = await getUserProgress(userObjectId);
  
  // Store previous values
  const previousXp = userProgress.totalXp;
  const previousLevel = userProgress.level;
  
  // Calculate XP amount
  const xpAmount = calculateTaskXp(streakCount || 0);
  
  // Award XP
  const leveledUp = await userProgress.addXp(
    xpAmount,
    'task_completion',
    undefined, // No category for tasks
    `Completed task: ${taskName}${streakCount ? ` (${streakCount} day streak)` : ''}`
  );
  
  return {
    xpAdded: xpAmount,
    currentLevel: userProgress.level,
    previousLevel: previousLevel,
    leveledUp: leveledUp,
    totalXp: userProgress.totalXp
  };
}

/**
 * Calculates XP amount based on task completion and streak
 * @param streakCount Current streak count
 * @returns Total XP to award
 */
export function calculateTaskXp(streakCount: number = 0): number {
  let xpAmount = TASK_XP_REWARDS.BASE_COMPLETION;
  
  // Streak bonus: +2 XP per day in streak, max 50 bonus
  const streakBonus = Math.min(streakCount * TASK_XP_REWARDS.STREAK_BONUS_PER_DAY, TASK_XP_REWARDS.MAX_STREAK_BONUS);
  xpAmount += streakBonus;
  
  // Milestone bonuses
  if (streakCount === 7) {
    xpAmount += TASK_XP_REWARDS.MILESTONE_7_DAYS;
  } else if (streakCount === 30) {
    xpAmount += TASK_XP_REWARDS.MILESTONE_30_DAYS;
  } else if (streakCount === 100) {
    xpAmount += TASK_XP_REWARDS.MILESTONE_100_DAYS;
  }
  
  return xpAmount;
}

/**
 * Get user's progress document, creating it if it doesn't exist
 * @param userId MongoDB ObjectId of the user
 * @returns UserProgress document
 */
async function getUserProgress(userId: Types.ObjectId): Promise<HydratedDocument<IUserProgress>> {
  let userProgress = await UserProgress.findOne({ userId });
  
  if (!userProgress) {
    userProgress = await UserProgress.createInitialProgress(userId);
  }
  
  return userProgress;
}