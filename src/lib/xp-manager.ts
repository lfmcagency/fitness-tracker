import { Types } from 'mongoose';
import UserProgress from '@/models/UserProgress';
import { checkAchievements, awardAchievements } from './achievements';
import { checkCategoryMilestone, ProgressCategory } from './category-progress';

/**
 * XP reward configuration
 */
export const XP_REWARDS = {
  TASK_COMPLETION: 10,
  STREAK_MILESTONE: 25,
  WORKOUT_COMPLETION: 50,
  EXERCISE_MASTERY: 100,
  NUTRITION_GOAL_MET: 20
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
 * Award XP to a user with comprehensive tracking and milestone detection
 * @param userId MongoDB ObjectID of the user
 * @param amount Amount of XP to award
 * @param source Source of the XP (e.g., 'workout', 'task')
 * @param category Optional category to which the XP applies
 * @param description Optional detailed description of the XP source
 * @returns Detailed result of the XP award operation
 */
export async function awardXp(
  userId: string | Types.ObjectId,
  amount: number,
  source: string,
  category?: ProgressCategory,
  description?: string
): Promise<XpAwardResult> {
  // Ensure userId is an ObjectId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Get or create user progress document
  let userProgress = await getUserProgress(userObjectId);
  
  // Store previous values to detect changes
  const previousXp = userProgress.totalXp;
  const previousLevel = userProgress.level;
  let previousCategoryLevel: number | undefined;
  let previousCategoryXp: number | undefined;
  
  if (category) {
    previousCategoryLevel = userProgress.categoryProgress[category].level;
    previousCategoryXp = userProgress.categoryXp[category];
  }
  
  // Add XP and save changes
  const leveledUp = await userProgress.addXp(amount, source, category, description || '');
  
  // Check for newly unlocked achievements
  const unlockedAchievements = await checkAndAwardAchievements(userProgress);
  
  // Calculate progress toward next level
  const nextLevelXp = userProgress.getNextLevelXp();
  const xpToNextLevel = userProgress.getXpToNextLevel();
  const progressPercent = Math.floor(
    ((userProgress.totalXp - (nextLevelXp - xpToNextLevel)) / xpToNextLevel) * 100
  );
  
  // Prepare result object
  const result: XpAwardResult = {
    previousXp,
    totalXp: userProgress.totalXp,
    xpAdded: amount,
    previousLevel,
    currentLevel: userProgress.level,
    leveledUp,
    xpToNextLevel,
    progressPercent
  };
  
  // Add achievement information if any were unlocked
  if (unlockedAchievements.achievements.length > 0) {
    result.achievements = {
      unlocked: unlockedAchievements.achievements,
      count: unlockedAchievements.achievements.length,
      totalXpAwarded: unlockedAchievements.totalXpAwarded
    };
  }
  
  // Add category-specific information if a category was provided
  if (category && previousCategoryLevel !== undefined && previousCategoryXp !== undefined) {
    const categoryLeveledUp = userProgress.categoryProgress[category].level > previousCategoryLevel;
    const currentCategoryXp = userProgress.categoryXp[category];
    
    // Check for category milestone
    const milestone = checkCategoryMilestone(
      category,
      previousCategoryXp,
      currentCategoryXp
    );
    
    result.category = {
      name: category,
      previousXp: previousCategoryXp,
      currentXp: currentCategoryXp,
      previousLevel: previousCategoryLevel,
      currentLevel: userProgress.categoryProgress[category].level,
      leveledUp: categoryLeveledUp,
      milestone: milestone
    };
  }
  
  return result;
}

/**
 * Get user's progress document, creating it if it doesn't exist
 * @param userId MongoDB ObjectID of the user
 * @returns UserProgress document
 */
async function getUserProgress(userId: Types.ObjectId) {
  let userProgress = await UserProgress.findOne({ userId });
  
  // If no progress document exists, create one
  if (!userProgress) {
    userProgress = await UserProgress.createInitialProgress(userId);
  }
  
  return userProgress;
}

/**
 * Check for and award newly unlocked achievements
 * @param userProgress User progress document
 * @returns Object containing updated progress and awarded achievements
 */
async function checkAndAwardAchievements(userProgress: any) {
  const newlyUnlockedAchievements = await checkAchievements(userProgress);
  
  // If no achievements were unlocked, return early
  if (newlyUnlockedAchievements.length === 0) {
    return {
      achievements: [],
      totalXpAwarded: 0
    };
  }
  
  // Award the achievements
  const { updatedProgress, totalXpAwarded } = await awardAchievements(
    userProgress,
    newlyUnlockedAchievements
  );
  
  // Format achievements for response
  const formattedAchievements = newlyUnlockedAchievements.map(achievement => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
    xpReward: achievement.xpReward,
    type: achievement.type,
    badgeColor: achievement.badgeColor
  }));
  
  return {
    achievements: formattedAchievements,
    totalXpAwarded
  };
}

/**
 * Award XP for completing a task with streak bonuses
 * @param userId MongoDB ObjectID of the user
 * @param taskName Name of the completed task
 * @param streakCount Current streak count (optional)
 * @param category Optional fitness category the task belongs to
 * @returns XP award result
 */
export async function awardTaskCompletionXp(
  userId: string | Types.ObjectId,
  taskName: string,
  streakCount?: number,
  category?: ProgressCategory
): Promise<XpAwardResult> {
  let xpAmount = XP_REWARDS.TASK_COMPLETION;
  
  // Add streak bonus for consistent performance
  if (streakCount && streakCount > 0) {
    // Bonus for streak milestones
    if (streakCount === 7) {
      xpAmount += XP_REWARDS.STREAK_MILESTONE / 2;
    } else if (streakCount === 30) {
      xpAmount += XP_REWARDS.STREAK_MILESTONE;
    } else if (streakCount === 100) {
      xpAmount += XP_REWARDS.STREAK_MILESTONE * 2;
    } else if (streakCount % 7 === 0) {
      // Small bonus every 7 days
      xpAmount += 5;
    }
  }
  
  const description = `Completed task: ${taskName}${
    streakCount ? ` (${streakCount} day streak)` : ''
  }`;
  
  return await awardXp(userId, xpAmount, 'task_completion', category, description);
}

/**
 * Get user's level progression information
 * @param userId MongoDB ObjectID of the user
 * @returns User's level info or null if not found
 */
export async function getUserLevelInfo(userId: string | Types.ObjectId) {
  // Ensure userId is an ObjectId
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
    categoryLevels: {
      core: userProgress.categoryProgress.core.level,
      push: userProgress.categoryProgress.push.level,
      pull: userProgress.categoryProgress.pull.level,
      legs: userProgress.categoryProgress.legs.level
    }
  };
}