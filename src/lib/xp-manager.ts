// src/lib/xp-manager.ts
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
 * Response from XP award operations
 */
export interface XpAwardResult {
  previousXp: number;
  totalXp: number;
  xpAdded: number;
  previousLevel: number;
  currentLevel: number;
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
 * Award XP to a user with basic tracking
 * @param userId MongoDB ObjectID of the user
 * @param amount Amount of XP to award
 * @param source Source of the XP
 * @param category Optional category
 * @param description Optional description
 * @returns XP award result
 */
export async function awardXp(
  userId: string | Types.ObjectId,
  amount: number,
  source: string,
  category?: ProgressCategory,
  description?: string
): Promise<XpAwardResult> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

  let userProgress = await getUserProgress(userObjectId);

  const previousXp = userProgress.totalXp;
  const previousLevel = userProgress.level;
  let previousCategoryLevel: number | undefined;
  let previousCategoryXp: number | undefined;

  if (category) {
    previousCategoryLevel = userProgress.categoryProgress[category].level;
    previousCategoryXp = userProgress.categoryXp[category];
  }

  const leveledUp = await userProgress.addXp(amount, source, category, description || '');

  const unlockedAchievements = await checkAndAwardAchievements(userProgress);

  const nextLevelXp = userProgress.getNextLevelXp();
  const xpToNextLevel = userProgress.getXpToNextLevel();
  const progressPercent = Math.min(
    100,
    Math.floor(((userProgress.totalXp - (nextLevelXp - xpToNextLevel)) / xpToNextLevel) * 100)
  );

  const result: XpAwardResult = {
    previousXp,
    totalXp: userProgress.totalXp,
    xpAdded: amount,
    previousLevel,
    currentLevel: userProgress.level,
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
 * @param userId MongoDB ObjectId
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
 * Check for and award achievements
 * @param userProgress User progress document
 * @returns Achievement results
 */
async function checkAndAwardAchievements(userProgress: HydratedDocument<IUserProgress>) {
  const newlyUnlockedAchievements = await checkAchievements(userProgress);

  if (newlyUnlockedAchievements.length === 0) {
    return { achievements: [], totalXpAwarded: 0 };
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