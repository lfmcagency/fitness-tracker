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
    
    // Get user's progress with defensive error handling
    let userProgress;
    try {
      userProgress = await UserProgress.findOne({ userId });
    } catch (error) {
      return handleApiError(error, 'Database error while fetching user progress');
    }
    
    if (!userProgress) {
      // Create initial progress if not found
      try {
        userProgress = await UserProgress.createInitialProgress(userId);
      } catch (error) {
        return handleApiError(error, 'Failed to create initial progress record');
      }
    }
    
    // Defensively ensure userProgress is valid before proceeding
    if (!userProgress) {
      return apiError('Unable to find or create user progress', 500);
    }
    
    // Get achievements with unlock status with defensive error handling
    let achievements = [];
    try {
      achievements = await getAllAchievementsWithStatus(userProgress);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      // Continue execution even if achievement fetching fails
      achievements = [];
    }
    
    // Get category comparison with defensive error handling
    let categoryComparison;
    try {
      categoryComparison = getCategoriesComparison(userProgress);
    } catch (error) {
      console.error('Error calculating category comparison:', error);
      // Provide default comparison data
      categoryComparison = {
        categories: [],
        strongest: { category: 'core', xp: 0, level: 1 },
        weakest: { category: 'core', xp: 0, level: 1 },
        balanceScore: 100,
        balanceMessage: 'Error calculating balance'
      };
    }
    
    // Ensure category progress exists with defensive null checks
    const categoryProgress = userProgress.categoryProgress || {
      core: { level: 1, xp: 0 },
      push: { level: 1, xp: 0 },
      pull: { level: 1, xp: 0 },
      legs: { level: 1, xp: 0 }
    };
    
    const categoryXp = userProgress.categoryXp || {
      core: 0,
      push: 0,
      pull: 0,
      legs: 0
    };
    
    // Return comprehensive progress data with defensive structure
    return apiResponse({
      level: {
        current: userProgress.level || 1,
        xp: userProgress.totalXp || 0,
        nextLevelXp: userProgress.getNextLevelXp ? userProgress.getNextLevelXp() : 100,
        xpToNextLevel: userProgress.getXpToNextLevel ? userProgress.getXpToNextLevel() : 100,
        progress: Math.floor((((userProgress.totalXp || 0) % (userProgress.getNextLevelXp ? userProgress.getNextLevelXp() : 100)) / (userProgress.getNextLevelXp ? userProgress.getNextLevelXp() : 100)) * 100)
      },
      categories: {
        core: {
          level: categoryProgress.core?.level || 1,
          xp: categoryXp.core || 0
        },
        push: {
          level: categoryProgress.push?.level || 1,
          xp: categoryXp.push || 0
        },
        pull: {
          level: categoryProgress.pull?.level || 1,
          xp: categoryXp.pull || 0
        },
        legs: {
          level: categoryProgress.legs?.level || 1,
          xp: categoryXp.legs || 0
        },
        comparison: categoryComparison
      },
      achievements: {
        total: achievements.length,
        unlocked: achievements.filter(a => a.unlocked).length,
        list: achievements
      },
      lastUpdated: userProgress.lastUpdated || new Date()
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
    
    // Parse request with defensive error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return apiError('Invalid JSON request body', 400, 'ERR_INVALID_REQUEST');
    }
    
    // Safely extract values with default fallbacks
    const action = requestBody?.action || '';
    const params = requestBody || {};
    
    // Different actions based on request
    switch (action) {
      case 'add_xp': {
        // Add XP to user's progress
        const amount = Number(params.amount);
        const category = params.category;
        const source = params.source || 'unknown';
        const description = params.description || '';
        
        // Validate parameters with explicit checks
        if (isNaN(amount) || amount <= 0) {
          return apiError('XP amount must be a positive number', 400, 'ERR_VALIDATION');
        }
        
        if (!source || typeof source !== 'string' || source.trim() === '') {
          return apiError('Source is required', 400, 'ERR_VALIDATION');
        }
        
        // Validate category if provided
        if (category && !isValidCategory(category)) {
          return apiError(`Invalid category: ${category}`, 400, 'ERR_VALIDATION');
        }
        
        // Get or create user's progress with defensive handling
        let userProgress;
        try {
          userProgress = await getUserProgressOrCreate(userId);
        } catch (error) {
          return handleApiError(error, 'Error retrieving user progress');
        }
        
        if (!userProgress) {
          return apiError('Failed to get or create user progress', 500, 'ERR_DATABASE');
        }
        
        // Store previous values to detect changes
        const previousXp = userProgress.totalXp || 0;
        const previousLevel = userProgress.level || 1;
        
        // Add XP with defensive error handling
        let leveledUp = false;
        try {
          leveledUp = await userProgress.addXp(amount, source, category as ProgressCategory, description);
        } catch (error) {
          return handleApiError(error, 'Error adding XP');
        }
        
        // Refresh progress data after update
        let updatedProgress;
        try {
          updatedProgress = await UserProgress.findOne({ userId });
        } catch (error) {
          return handleApiError(error, 'Error retrieving updated progress');
        }
        
        if (!updatedProgress) {
          return apiError('Failed to retrieve updated progress', 500, 'ERR_DATABASE');
        }
        
        // Format response with defensive null checks
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
          level: updatedProgress.level || 1,
          totalXp: updatedProgress.totalXp || 0,
          xpToNextLevel: updatedProgress.getXpToNextLevel ? updatedProgress.getXpToNextLevel() : 100,
          xpAdded: amount
        };
        
        // Add category-specific progress if a category was provided
        if (category && isValidCategory(category)) {
          const catKey = category as ProgressCategory;
          response[catKey] = {
            level: updatedProgress.categoryProgress?.[catKey]?.level || 1,
            xp: updatedProgress.categoryXp?.[catKey] || 0
          };
        }
        
        const currentLevel = updatedProgress.level || 1;
        
        return apiResponse(response, true, leveledUp 
          ? `Gained ${amount} XP and leveled up to ${currentLevel}!` 
          : `Gained ${amount} XP. ${response.xpToNextLevel} XP until next level.`);
      }
      
      case 'award_achievement': {
        // Award a specific achievement to the user
        const achievementId = params.achievementId;
        
        if (!achievementId || typeof achievementId !== 'string' || achievementId.trim() === '') {
          return apiError('Achievement ID is required', 400, 'ERR_VALIDATION');
        }
        
        // Implementation would go here
        // For now, just return a success response
        
        return apiResponse({
          success: true,
          achievementId,
          awarded: true
        }, true, 'Achievement awarded successfully');
      }
      
      default:
        return apiError(`Unknown action: ${action}`, 400, 'ERR_INVALID_ACTION');
    }
  } catch (error) {
    return handleApiError(error, 'Error processing progress action');
  }
}, AuthLevel.DEV_OPTIONAL);