import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';

// XP reward configuration
const XP_REWARDS = {
  TASK_COMPLETION: 10,
  STREAK_MILESTONE: 25,
  WORKOUT_COMPLETION: 50,
  EXERCISE_MASTERY: 100,
  NUTRITION_GOAL_MET: 20
};

// Category mapping for various activities
const CATEGORY_MAPPING = {
  // Exercise categories
  'push-up': 'push',
  'pull-up': 'pull',
  'squat': 'legs',
  'plank': 'core',
  'dip': 'push',
  'row': 'pull',
  'bridge': 'core',
  
  // General mapping
  'upper-body': 'push',
  'lower-body': 'legs',
  'core-exercise': 'core'
};

/**
 * Award XP to a user for completing various activities
 * @param userId - User's MongoDB ObjectId
 * @param amount - Amount of XP to award
 * @param source - Source of the XP (task, workout, achievement, etc.)
 * @param category - Optional category to award XP to (core, push, pull, legs)
 * @param description - Optional description of the activity
 * @returns Object containing levelUp status and new level info
 */
export async function awardXp(
  userId: string | Types.ObjectId,
  amount: number,
  source: string,
  category?: 'core' | 'push' | 'pull' | 'legs',
  description?: string
) {
  // Ensure userId is an ObjectId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Find or create user progress document
  let userProgress = await UserProgress.findOne({ userId: userObjectId });
  
  // If no progress record exists, create one
  if (!userProgress) {
    userProgress = await UserProgress.createInitialProgress(userObjectId);
  }
  
  // Record previous state to detect level changes
  const previousLevel = userProgress.level;
  
  // Add XP to user's record
  const leveledUp = await userProgress.addXp(amount, source, category, description);
  
  // Return status including level up information
  return {
    leveledUp,
    previousLevel,
    newLevel: userProgress.level,
    currentXp: userProgress.totalXp,
    xpToNextLevel: userProgress.getXpToNextLevel()
  };
}

/**
 * Award XP for completing a task
 * @param userId - User's MongoDB ObjectId
 * @param taskName - Name of the completed task
 * @param taskCategory - Category of the task (optional)
 * @param streakCount - Current streak count (optional)
 * @returns XP award result
 */
export async function awardTaskCompletionXp(
  userId: string | Types.ObjectId,
  taskName: string,
  taskCategory?: string,
  streakCount?: number
) {
  let xpAmount = XP_REWARDS.TASK_COMPLETION;
  let category: 'core' | 'push' | 'pull' | 'legs' | undefined = undefined;
  
  // Map task category to fitness category if possible
  if (taskCategory && CATEGORY_MAPPING[taskCategory as keyof typeof CATEGORY_MAPPING]) {
    category = CATEGORY_MAPPING[taskCategory as keyof typeof CATEGORY_MAPPING] as 'core' | 'push' | 'pull' | 'legs';
  }
  
  // Add streak bonus for consistent performance
  if (streakCount && streakCount > 0) {
    // Bonus for streaks at 7, 30, 100 days
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
  
  return await awardXp(
    userId, 
    xpAmount, 
    'task_completion', 
    category,
    `Completed task: ${taskName}${streakCount ? ` (${streakCount} day streak)` : ''}`
  );
}

/**
 * Award XP for completing a workout
 * @param userId - User's MongoDB ObjectId
 * @param workoutName - Name of the completed workout
 * @param exerciseCategories - Categories of exercises completed in the workout
 * @returns XP award result for each category
 */
export async function awardWorkoutCompletionXp(
  userId: string | Types.ObjectId,
  workoutName: string,
  exerciseCategories: { category: 'core' | 'push' | 'pull' | 'legs', count: number }[]
) {
  const results = [];
  let totalXpAwarded = 0;
  
  // Base XP for workout completion
  const baseXp = XP_REWARDS.WORKOUT_COMPLETION;
  
  // Award base XP for overall workout completion (not category-specific)
  const baseResult = await awardXp(
    userId,
    baseXp,
    'workout_completion',
    undefined,
    `Completed workout: ${workoutName}`
  );
  
  totalXpAwarded += baseXp;
  
  // Award additional XP for each exercise category
  for (const { category, count } of exerciseCategories) {
    if (count > 0) {
      // Award category-specific XP based on number of exercises
      const categoryXp = Math.min(count * 5, 25); // Cap at 25 XP per category
      
      const result = await awardXp(
        userId,
        categoryXp,
        'workout_completion',
        category,
        `Completed ${count} ${category} exercises in: ${workoutName}`
      );
      
      totalXpAwarded += categoryXp;
      results.push(result);
    }
  }
  
  return {
    overall: baseResult,
    categoryResults: results,
    totalXpAwarded
  };
}

/**
 * Award XP for meeting nutrition goals
 * @param userId - User's MongoDB ObjectId
 * @param goalType - Type of nutrition goal met
 * @returns XP award result
 */
export async function awardNutritionXp(
  userId: string | Types.ObjectId,
  goalType: 'protein' | 'calories' | 'macros' | 'water'
) {
  let xpAmount = XP_REWARDS.NUTRITION_GOAL_MET;
  let description = '';
  
  switch (goalType) {
    case 'protein':
      description = 'Met daily protein goal';
      break;
    case 'calories':
      description = 'Met daily calorie goal';
      break;
    case 'macros':
      xpAmount = XP_REWARDS.NUTRITION_GOAL_MET * 1.5; // Bonus for hitting all macros
      description = 'Met all macro nutrition goals';
      break;
    case 'water':
      xpAmount = XP_REWARDS.NUTRITION_GOAL_MET / 2; // Less XP for water goals
      description = 'Met daily water intake goal';
      break;
  }
  
  return await awardXp(userId, xpAmount, 'nutrition_goal', 'core', description);
}

/**
 * Get user's level progression information
 * @param userId - User's MongoDB ObjectId
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