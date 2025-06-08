import { Types } from 'mongoose';
import { checkAchievements, awardAchievements } from '@/lib/achievements';
import { checkCategoryMilestone, ProgressCategory } from '@/lib/category-progress';
import { getUserProgress } from './calculations';
import { HydratedDocument } from 'mongoose';
import { IUserProgress } from '@/types/models/progress';

/**
 * Main XP coordinator for all domains
 * Handles cross-domain XP awards, achievements, and progress tracking
 */

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
 * Main XP award function - coordinates all XP awards across domains
 * @param userId User ID (string or ObjectId)
 * @param amount Amount of XP to award
 * @param source Source of the XP (e.g., 'task_completion', 'workout_completion')
 * @param category Optional category for exercise-related XP
 * @param details Optional description/details
 * @returns Comprehensive XP award result
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

  // Store category progress if category is provided
  if (category && 
    userProgress.categoryProgress && 
    userProgress.categoryProgress[category]) {
    previousCategoryLevel = userProgress.categoryProgress[category].level;
    previousCategoryXp = userProgress.categoryXp?.[category] || 0;
  } else {
    previousCategoryLevel = 1;
    previousCategoryXp = 0;
  }

  // Award XP using the model method
  const leveledUp = await userProgress.addXp(amount, source, category, details || '');

  // Check for newly unlocked achievements
  const unlockedAchievements = await checkAndAwardAchievements(userProgress);

  // Calculate next level info
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

  // Add achievement info if any were unlocked
  if (unlockedAchievements.achievements.length > 0) {
    result.achievements = {
      unlocked: unlockedAchievements.achievements,
      count: unlockedAchievements.achievements.length,
      totalXpAwarded: unlockedAchievements.totalXpAwarded,
    };
  }

  // Add category info if category was provided
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