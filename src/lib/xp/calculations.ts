import { Types, HydratedDocument } from 'mongoose';
import UserProgress from '@/models/UserProgress';
import { IUserProgress } from '@/types/models/progress';

/**
 * Shared XP calculation utilities
 */

/**
 * Level calculation based on XP
 * Uses the same formula as UserProgress model
 */
export function calculateLevelFromXp(xp: number): number {
  return Math.floor(1 + Math.pow(xp / 100, 0.8));
}

/**
 * Calculate XP required for next level
 */
export function calculateNextLevelXp(currentLevel: number): number {
  return Math.ceil(Math.pow(currentLevel, 1.25) * 100);
}

/**
 * Calculate XP remaining to next level
 */
export function calculateXpToNextLevel(currentXp: number, currentLevel: number): number {
  const nextLevelXp = calculateNextLevelXp(currentLevel + 1);
  return Math.max(0, nextLevelXp - currentXp);
}

/**
 * Calculate progress percentage to next level
 */
export function calculateProgressPercent(currentXp: number, currentLevel: number): number {
  const currentLevelXp = calculateNextLevelXp(currentLevel);
  const nextLevelXp = calculateNextLevelXp(currentLevel + 1);
  const xpInCurrentLevel = currentXp - currentLevelXp;
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  
  return Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpNeededForLevel) * 100)));
}

/**
 * Get or create user progress document
 * @param userId User's MongoDB ObjectId
 * @returns UserProgress document
 */
export async function getUserProgress(userId: string | Types.ObjectId): Promise<HydratedDocument<IUserProgress>> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  let userProgress = await UserProgress.findOne({ userId: userObjectId });
  
  if (!userProgress) {
    userProgress = await UserProgress.createInitialProgress(userObjectId);
  }
  
  return userProgress;
}

/**
 * Get comprehensive user level information
 * @param userId User ID (string or ObjectId)
 * @returns User level info or null if user not found
 */
export async function getUserLevelInfo(userId: string | Types.ObjectId) {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

  const userProgress = await UserProgress.findOne({ userId: userObjectId });

  if (!userProgress) {
    return null;
  }

  return {
    totalXp: userProgress.totalXp,
    level: userProgress.level,
    nextLevelXp: userProgress.getNextLevelXp(),
    xpToNextLevel: userProgress.getXpToNextLevel(),
    progressPercent: Math.floor(
      ((userProgress.totalXp % userProgress.getNextLevelXp()) / userProgress.getNextLevelXp()) * 100
    ),
    categoryLevels: {
      core: userProgress.categoryProgress.core.level,
      push: userProgress.categoryProgress.push.level,
      pull: userProgress.categoryProgress.pull.level,
      legs: userProgress.categoryProgress.legs.level,
    },
  };
}