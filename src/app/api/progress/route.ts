// File: src/app/api/progress/route.ts

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel, getUserProgressOrCreate } from '@/lib/auth-utils';
import { getAllAchievementsWithStatus } from '@/lib/achievements';
import { ProgressCategory, getCategoriesComparison, isValidCategory } from '@/lib/category-progress';
import { Types } from 'mongoose';

/**
 * GET /api/progress
 * 
 * Get user's complete progress data
 */
export const GET = withAuth(async (req: NextRequest, userId: Types.ObjectId) => {
  try {
    await dbConnect();
    
    // Get user's progress
    const userProgress = await UserProgress.findOne({ userId });
    
    if (!userProgress) {
      return apiError('User progress not found', 404);
    }
    
    // Get achievements with unlock status
    const achievements = await getAllAchievementsWithStatus(userProgress);
    
    // Get category comparison
    const categoryComparison = getCategoriesComparison(userProgress);
    
    // Return comprehensive progress data
    return apiResponse({
      level: {
        current: userProgress.level,
        xp: userProgress.totalXp,
        nextLevelXp: userProgress.getNextLevelXp(),
        xpToNextLevel: userProgress.getXpToNextLevel(),
        progress: Math.floor(((userProgress.totalXp % userProgress.getNextLevelXp()) / userProgress.getNextLevelXp()) * 100)
      },
      categories: {
        core: {
          level: userProgress.categoryProgress.core.level,
          xp: userProgress.categoryXp.core
        },
        push: {
          level: userProgress.categoryProgress.push.level,
          xp: userProgress.categoryXp.push
        },
        pull: {
          level: userProgress.categoryProgress.pull.level,
          xp: userProgress.categoryXp.pull
        },
        legs: {
          level: userProgress.categoryProgress.legs.level,
          xp: userProgress.categoryXp.legs
        },
        comparison: categoryComparison
      },
      achievements: {
        total: achievements.length,
        unlocked: achievements.filter(a => a.unlocked).length,
        list: achievements
      },
      lastUpdated: userProgress.lastUpdated
    }, true, 'User progress retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving user progress');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/progress
 * 
 * Add XP, award achievements, or perform other progress operations
 */
export const POST = withAuth(async (req: NextRequest, userId: Types.ObjectId) => {
  try {
    await dbConnect();
    
    const { action, ...params } = await req.json();
    
    // Different actions based on request
    switch (action) {
      case 'add_xp': {
        // Add XP to user's progress
        const { amount, category, source, description } = params;
        
        // Validate parameters
        if (!amount || amount <= 0) {
          return apiError('XP amount must be a positive number', 400);
        }
        
        if (!source) {
          return apiError('Source is required', 400);
        }
        
        // Validate category if provided
        if (category && !isValidCategory(category)) {
          return apiError(`Invalid category: ${category}`, 400);
        }
        
        // Get or create user's progress
        const userProgress = await getUserProgressOrCreate(userId);
        
        if (!userProgress) {
          return apiError('Failed to get or create user progress', 500);
        }
        
        // Store previous values to detect changes
        const previousXp = userProgress.totalXp;
        const previousLevel = userProgress.level;
        
        // Add XP 
        await userProgress.addXp(amount, source, category as ProgressCategory, description);
        
        // Check if user leveled up
        const leveledUp = userProgress.level > previousLevel;
        
        // Refresh progress data after update
        const updatedProgress = await UserProgress.findOne({ userId });
        
        if (!updatedProgress) {
          return apiError('Failed to retrieve updated progress', 500);
        }
        
        // Format response
        interface ProgressResponse {
          success: boolean;
          leveledUp: boolean;
          level: number;
          totalXp: number;
          xpToNextLevel: number;
          xpAdded: number;
          [key: string]: any; // Add index signature for dynamic category
        }
        
        const response: ProgressResponse = {
          success: true,
          leveledUp,
          level: updatedProgress.level,
          totalXp: updatedProgress.totalXp,
          xpToNextLevel: updatedProgress.getXpToNextLevel(),
          xpAdded: amount
        };
        
        // Add category-specific progress if a category was provided
        if (category) {
          response[category] = {
            level: updatedProgress.categoryProgress[category as ProgressCategory].level,
            xp: updatedProgress.categoryXp[category as ProgressCategory]
          };
        }
        
        return apiResponse(response, true, leveledUp 
          ? `Gained ${amount} XP and leveled up to ${updatedProgress.level}!` 
          : `Gained ${amount} XP. ${updatedProgress.getXpToNextLevel()} XP until next level.`);
      }
      
      case 'award_achievement': {
        // Award a specific achievement to the user
        const { achievementId } = params;
        
        if (!achievementId) {
          return apiError('Achievement ID is required', 400);
        }
        
        // Implement achievement awarding logic here
        
        return apiResponse({
          success: true,
          achievementId,
          awarded: true
        }, true, 'Achievement awarded successfully');
      }
      
      default:
        return apiError(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    return handleApiError(error, 'Error processing progress action');
  }
}, AuthLevel.DEV_OPTIONAL);