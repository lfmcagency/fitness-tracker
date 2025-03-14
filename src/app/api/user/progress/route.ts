// File: src/app/api/user/progress/route.ts

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel, getUserProgressOrCreate } from '@/lib/auth-utils';
import { ProgressCategory, isValidCategory } from '@/lib/category-progress';
import { awardXp } from '@/lib/xp-manager-improved';
import UserProgress from '@/models/UserProgress';
import { IUserProgress, IUserProgressModel } from '@/types/models/progress';
import { 
  ProgressResponseData, 
  AddXpResponseData 
} from '@/types/api/progressResponses';

/**
 * GET /api/user/progress
 * 
 * Get user's progress summary
 */
export const GET = withAuth<ProgressResponseData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Get or create user progress
      const userProgress = await getUserProgressOrCreate(userId);
      
      if (!userProgress) {
        return apiError('Failed to retrieve user progress', 500);
      }
      
      const nextLevelXp = userProgress.getNextLevelXp();
      const xpToNextLevel = userProgress.getXpToNextLevel();
      const progressPercent = Math.floor(
        ((userProgress.totalXp - (nextLevelXp - xpToNextLevel)) / xpToNextLevel) * 100
      );
      
      // Return formatted progress data matching ProgressResponseData type
      return apiResponse({
        level: {
          current: userProgress.level,
          xp: userProgress.totalXp,
          nextLevelXp,
          xpToNextLevel,
          progress: progressPercent
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
          comparison: {
            categories: Object.entries(userProgress.categoryXp).map(([category, xp]) => ({
              category: category as ProgressCategory,
              xp,
              level: userProgress.categoryProgress[category as ProgressCategory].level
            })),
            strongest: {
              category: 'core', // This would need actual logic to determine strongest
              xp: userProgress.categoryXp.core,
              level: userProgress.categoryProgress.core.level
            },
            weakest: {
              category: 'legs', // This would need actual logic to determine weakest
              xp: userProgress.categoryXp.legs,
              level: userProgress.categoryProgress.legs.level
            },
            balanceScore: 0, // This would need actual calculation
            balanceMessage: "See your category progress balance" // This would need actual message
          }
        },
        achievements: {
          total: 0, // This would need actual count
          unlocked: userProgress.achievements.length,
          list: [] // This would need actual achievement data
        },
        lastUpdated: userProgress.lastUpdated.toISOString()
      }, true, 'User progress retrieved successfully');
    } catch (error) {
      return handleApiError(error, 'Error retrieving user progress');
    }
  }, 
  AuthLevel.REQUIRED
);

/**
 * POST /api/user/progress
 * 
 * Add XP to user's progress with optional category
 */
export const POST = withAuth<AddXpResponseData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Get and validate request body
      let body;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate required fields
      if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
        return apiError('XP amount must be a positive number', 400, 'ERR_VALIDATION');
      }
      
      if (!body.source || typeof body.source !== 'string' || body.source.trim() === '') {
        return apiError('Source must be a non-empty string', 400, 'ERR_VALIDATION');
      }
      
      // Extract validated values
      const amount = body.amount;
      const source = body.source.trim();
      const details = body.details?.trim() || '';
      
      // Validate category if provided
      let category: ProgressCategory | undefined;
      
      if (body.category) {
        if (!isValidCategory(body.category)) {
          return apiError(
            `Invalid category: ${body.category}. Must be one of: core, push, pull, legs`, 
            400, 
            'ERR_VALIDATION'
          );
        }
        category = body.category as ProgressCategory;
      }
      
      // Award XP using the xp-manager-improved utility
      const result = await awardXp(
        userId, 
        amount, 
        source, 
        category,
        details
      );
      
      // Return result with appropriate message following AddXpResponseData type
      return apiResponse({
        success: true,
        leveledUp: result.leveledUp,
        level: result.currentLevel,
        totalXp: result.totalXp,
        xpToNextLevel: result.xpToNextLevel,
        xpAdded: amount,
        previousLevel: result.previousLevel,
        previousXp: result.previousXp,
        progressPercent: result.progressPercent,
        category: result.category ? {
          name: result.category.name,
          leveledUp: result.category.leveledUp,
          previousLevel: result.category.previousLevel,
          currentLevel: result.category.currentLevel
        } : undefined,
        achievements: result.achievements
      }, true, result.leveledUp
        ? `Level up! You are now level ${result.currentLevel}`
        : `Awarded ${amount} XP! ${result.xpToNextLevel} XP until next level.`
      );
    } catch (error) {
      return handleApiError(error, 'Error awarding XP');
    }
  }, 
  AuthLevel.REQUIRED
);