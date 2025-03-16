// src/lib/xp-manager-improved.ts
import { Types } from 'mongoose';
import UserProgress from '@/models/UserProgress';
import { checkAchievements, awardAchievements } from './achievements';
import { checkCategoryMilestone, ProgressCategory, ProgressCategoryEnum } from './category-progress';
import { HydratedDocument } from 'mongoose';
import { IUserProgress } from '@/types/models/progress';

/**
 * XP reward configuration
 */
export const XP_REWARDS = {
  TASK_COMPLETION: 10,
  STREAK_MILESTONE: 25,
  WORKOUT_COMPLETION: 50,
  EXERCISE_MASTERY: 100,
  NUTRITION_GOAL_MET: 20,
};

/**
 * Comprehensive result from XP award operations
 */
export interface XpAwardResult {
  previousXp: number;
  previousLevel: number;
  totalXp: number;
  currentLevel: number;
  xpAdded: number;
  leveledUp: boolean;
  xpToNextLevel: number;
  progressPercent: number;
  achievements?: {
    unlocked: Array<any>;
    count: number;
    totalXpAwarded: number;
  };
  category?: {
    name: ProgressCategory;
    previousXp: number;
    currentXp: number;
    previousLevel: number;
    currentLevel: number;
    leveledUp: boolean;
    milestone: any | null;
  };
}

/**
 * Enhanced XP award function with comprehensive tracking
 * @param userId MongoDB ObjectID of the user
 * @param amount Amount of XP to award
 * @param source Source of the XP (e.g., 'workout', 'task')
 * @param category Optional category to which the XP applies
 * @param details Optional detailed description of the XP source
 * @returns Detailed result of the XP award operation including leveling and achievements
 */
export async function awardXp(
  userId: string | Types.ObjectId,
  amount: number,
  source: string,
  category?: ProgressCategory,
  details?: string
): Promise<XpAwardResult> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

  let userProgress = await getUserProgress(userObjectId);

  const previousXp = userProgress.totalXp;
  const previousLevel = userProgress.level;
  let previousCategoryLevel: number | undefined;
  let previousCategoryXp: number | undefined;

  if (category && 
    userProgress.categoryProgress && 
    userProgress.categoryProgress[category]) {
  previousCategoryLevel = userProgress.categoryProgress[category].level;
  previousCategoryXp = userProgress.categoryXp?.[category] || 0;
} else {
  // Set defaults if category progress doesn't exist
  previousCategoryLevel = 1;
  previousCategoryXp = 0;
}

  const leveledUp = await userProgress.addXp(amount, source, category, details || '');

  const unlockedAchievements = await checkAndAwardAchievements(userProgress);

  const nextLevelXp = userProgress.getNextLevelXp();
  const xpToNextLevel = userProgress.getXpToNextLevel();
  const progressPercent = Math.min(
    100,
    Math.floor(((userProgress.totalXp - (nextLevelXp - xpToNextLevel)) / xpToNextLevel) * 100)
  );

  const result: XpAwardResult = {
    previousXp,
    previousLevel,
    totalXp: userProgress.totalXp,
    currentLevel: userProgress.level,
    xpAdded: amount,
    leveledUp,
    xpToNextLevel,
    progressPercent,
  };

  if (unlockedAchievements.achievements.length > 0) {
    result.achievements = {
      unlocked: unlockedAchievements.achievements,
      count: unlockedAchievements.achievements.length,
      totalXpAwarded: unlockedAchievements.totalXpAwarded,
    };
  }

  if (category && previousCategoryLevel !== undefined && previousCategoryXp !== undefined) {
    const categoryLeveledUp = userProgress.categoryProgress[category].level > previousCategoryLevel;
    const currentCategoryXp = userProgress.categoryXp[category];

    const milestone = checkCategoryMilestone(category, previousCategoryXp, currentCategoryXp);

    result.category = {
      name: category,
      previousXp: previousCategoryXp,
      currentXp: currentCategoryXp,
      previousLevel: previousCategoryLevel,
      currentLevel: userProgress.categoryProgress[category].level,
      leveledUp: categoryLeveledUp,
      milestone,
    };
  }

  return result;
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

/**
 * Check for and award newly unlocked achievements
 * @param userProgress User progress document
 * @returns Object containing awarded achievements and XP
 */
async function checkAndAwardAchievements(userProgress: HydratedDocument<IUserProgress>) {
  const newlyUnlockedAchievements = await checkAchievements(userProgress);

  if (newlyUnlockedAchievements.length === 0) {
    return {
      achievements: [],
      totalXpAwarded: 0,
    };
  }

  const { updatedProgress, totalXpAwarded } = await awardAchievements(userProgress, newlyUnlockedAchievements);

  const formattedAchievements = newlyUnlockedAchievements.map((achievement: any) => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
    xpReward: achievement.xpReward,
    type: achievement.type,
    badgeColor: achievement.badgeColor,
  }));

  return {
    achievements: formattedAchievements,
    totalXpAwarded,
  };
}

/**
 * Award XP for specific activities with bonuses
 */
export async function awardTaskCompletionXp(
  userId: string | Types.ObjectId,
  taskName: string,
  streakCount?: number,
  category?: ProgressCategory
): Promise<XpAwardResult> {
  let xpAmount = XP_REWARDS.TASK_COMPLETION;

  if (streakCount && streakCount > 0) {
    if (streakCount === 7) {
      xpAmount += XP_REWARDS.STREAK_MILESTONE / 2;
    } else if (streakCount === 30) {
      xpAmount += XP_REWARDS.STREAK_MILESTONE;
    } else if (streakCount === 100) {
      xpAmount += XP_REWARDS.STREAK_MILESTONE * 2;
    } else if (streakCount % 7 === 0) {
      xpAmount += 5;
    }
  }

  const description = `Completed task: ${taskName}${streakCount ? ` (${streakCount} day streak)` : ''}`;
  return await awardXp(userId, xpAmount, 'task_completion', category, description);
}

/**
 * Award XP for workout completion
 */
export async function awardWorkoutCompletionXp(
  userId: string | Types.ObjectId,
  workoutName: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  categories?: ProgressCategory[]
): Promise<XpAwardResult> {
  let xpAmount = XP_REWARDS.WORKOUT_COMPLETION;

  if (difficulty === 'easy') {
    xpAmount = Math.floor(xpAmount * 0.75);
  } else if (difficulty === 'hard') {
    xpAmount = Math.floor(xpAmount * 1.5);
  }

  const description = `Completed workout: ${workoutName} (${difficulty} difficulty)`;

  if (categories && categories.length > 0) {
    const primaryCategory = categories[0];
    const result = await awardXp(userId, xpAmount, 'workout_completion', primaryCategory, description);

    if (categories.length > 1) {
      const secondaryXp = Math.floor(xpAmount * 0.3);
      for (let i = 1; i < categories.length; i++) {
        await awardXp(userId, secondaryXp, 'workout_completion', categories[i], `Secondary category XP for: ${workoutName}`);
      }
    }

    return result;
  }

  return await awardXp(userId, xpAmount, 'workout_completion', undefined, description);
}

/**
 * Get user's level progression information
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
      [ProgressCategoryEnum.core]: userProgress.categoryProgress[ProgressCategoryEnum.core].level,
      [ProgressCategoryEnum.push]: userProgress.categoryProgress[ProgressCategoryEnum.push].level,
      [ProgressCategoryEnum.pull]: userProgress.categoryProgress[ProgressCategoryEnum.pull].level,
      [ProgressCategoryEnum.legs]: userProgress.categoryProgress[ProgressCategoryEnum.legs].level,
    },
  };
}