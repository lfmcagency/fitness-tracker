export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { checkAchievements, awardAchievements } from '@/lib/achievements';
import { 
  ProgressCategory, 
  checkCategoryMilestone 
} from '@/lib/category-progress';

/**
 * POST /api/progress/add-xp
 * 
 * Adds XP to a user's progress and returns updated progress information.
 * Detects level-ups and updates category-specific XP if provided.
 * Checks for and awards any newly unlocked achievements.
 * 
 * Request payload:
 * - xpAmount: number (required) - Amount of XP to award
 * - category: string (optional) - One of: "core", "push", "pull", "legs"
 * - source: string (required) - Describes the activity that earned the XP
 * - details: string (optional) - Additional context about the XP award
 * 
 * Response:
 * - totalXp: number - Updated total XP
 * - level: number - Current level after XP award
 * - leveledUp: boolean - Whether this XP award caused a level-up
 * - categoryXp: object (if category provided) - Updated category XP
 * - categoryLevel: number (if category provided) - Updated category level
 * - xpToNextLevel: number - How much XP needed for next level
 * - progressPercent: number - Progress toward next level as percentage
 * - achievements: object (if any unlocked) - Newly unlocked achievements
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication in production
    if (!session && process.env.NODE_ENV === 'production') {
      return apiError('Authentication required', 401);
    }
    
    const userId = session?.user?.id || '000000000000000000000000'; // Mock ID for development
    let userObjectId: Types.ObjectId;
    
    try {
      userObjectId = new Types.ObjectId(userId);
    } catch (error) {
      return apiError('Invalid user ID', 400);
    }
    
    // Parse and validate request body
    const { xpAmount, category, source, details } = await req.json();
    
    // Validate xpAmount
    if (!xpAmount || typeof xpAmount !== 'number' || xpAmount <= 0) {
      return apiError('XP amount must be a positive number', 400);
    }
    
    // Validate source
    if (!source || typeof source !== 'string' || source.trim() === '') {
      return apiError('Source is required and must be a non-empty string', 400);
    }
    
    // Validate category if provided
    if (category && !['core', 'push', 'pull', 'legs'].includes(category)) {
      return apiError('Category must be one of: core, push, pull, legs', 400);
    }
    
    // Get or create user progress document
    let userProgress = await UserProgress.findOne({ userId: userObjectId });
    if (!userProgress) {
      try {
        userProgress = await UserProgress.createInitialProgress(userObjectId);
      } catch (error) {
        return handleApiError(error, 'Failed to create initial progress record');
      }
    }
    
    // Store previous values to detect changes
    const previousXp = userProgress.totalXp;
    const previousLevel = userProgress.level;
    let previousCategoryLevel;
    let previousCategoryXp;
    
    if (category) {
      previousCategoryLevel = userProgress.categoryProgress[category].level;
      previousCategoryXp = userProgress.categoryXp[category];
    }
    
    // Add XP and save changes
    try {
      const leveledUp = await userProgress.addXp(
        xpAmount,
        source,
        category as 'core' | 'push' | 'pull' | 'legs' | undefined,
        details || ''
      );
      
      // Check for newly unlocked achievements
      const newlyUnlockedAchievements = await checkAchievements(userProgress);
      
      // Award any newly unlocked achievements
      let achievementXpAwarded = 0;
      let unlockedAchievements = [];
      
      if (newlyUnlockedAchievements.length > 0) {
        // Award achievements
        const { updatedProgress, totalXpAwarded } = await awardAchievements(
          userProgress,
          newlyUnlockedAchievements
        );
        
        // Update references
        userProgress = updatedProgress;
        achievementXpAwarded = totalXpAwarded;
        
        // Format achievements for response
        unlockedAchievements = newlyUnlockedAchievements.map(achievement => ({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
          type: achievement.type,
          badgeColor: achievement.badgeColor
        }));
      }
      
      // Calculate progress toward next level
      const nextLevelXp = userProgress.getNextLevelXp();
      const xpToNextLevel = userProgress.getXpToNextLevel();
      const progressPercent = Math.floor(
        ((userProgress.totalXp - (nextLevelXp - xpToNextLevel)) / xpToNextLevel) * 100
      );
      
      // Prepare response
      const response: any = {
        success: true,
        previousXp,
        totalXp: userProgress.totalXp,
        xpAdded: xpAmount,
        achievementXpAwarded,
        totalXpAwarded: xpAmount + achievementXpAwarded,
        previousLevel,
        currentLevel: userProgress.level,
        leveledUp,
        xpToNextLevel,
        progressPercent
      };
      
      // Add category-specific information if a category was provided
      if (category) {
        const categoryLeveledUp = userProgress.categoryProgress[category].level > previousCategoryLevel;
        const currentCategoryXp = userProgress.categoryXp[category];
        
        // Check for category milestone
        const milestone = checkCategoryMilestone(
          category as ProgressCategory,
          previousCategoryXp,
          currentCategoryXp
        );
        
        response.category = {
          name: category,
          previousXp: previousCategoryXp,
          currentXp: currentCategoryXp,
          previousLevel: previousCategoryLevel,
          currentLevel: userProgress.categoryProgress[category].level,
          leveledUp: categoryLeveledUp,
          milestone: milestone
        };
      }
      
      // Add transaction information
      response.transaction = {
        source,
        amount: xpAmount,
        category,
        timestamp: new Date().toISOString(),
        details: details || undefined
      };
      
      // Add achievements information if any were unlocked
      if (unlockedAchievements.length > 0) {
        response.achievements = {
          unlocked: unlockedAchievements,
          count: unlockedAchievements.length,
          totalXpAwarded: achievementXpAwarded
        };
      }
      
      // Determine success message based on level up, achievements, and milestones
      let message;
      const milestone = response.category?.milestone;
      
      if (leveledUp && unlockedAchievements.length > 0 && milestone) {
        message = `Congratulations! You've leveled up to ${userProgress.level}, reached the ${milestone.milestone} milestone in ${category}, and unlocked ${unlockedAchievements.length} achievement(s)!`;
      } else if (leveledUp && milestone) {
        message = `Congratulations! You've leveled up to ${userProgress.level} and reached the ${milestone.milestone} milestone in ${category}!`;
      } else if (unlockedAchievements.length > 0 && milestone) {
        message = `You've earned ${xpAmount} XP, reached the ${milestone.milestone} milestone in ${category}, and unlocked ${unlockedAchievements.length} achievement(s)!`;
      } else if (milestone) {
        message = `You've earned ${xpAmount} XP and reached the ${milestone.milestone} milestone in ${category}!`;
      } else if (leveledUp && unlockedAchievements.length > 0) {
        message = `Congratulations! You've leveled up to level ${userProgress.level} and unlocked ${unlockedAchievements.length} new achievement(s)!`;
      } else if (leveledUp) {
        message = `Congratulations! You've leveled up to level ${userProgress.level}!`;
      } else if (unlockedAchievements.length > 0) {
        message = `You've earned ${xpAmount} XP and unlocked ${unlockedAchievements.length} new achievement(s)!`;
      } else {
        message = `You've earned ${xpAmount} XP from ${source}. ${xpToNextLevel} XP until next level.`;
      }
      
      return apiResponse(response, message);
    } catch (error) {
      return handleApiError(error, 'Failed to add XP');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing XP award');
  }
}