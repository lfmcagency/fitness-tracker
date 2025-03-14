// src/app/api/progress/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { AchievementRequirement, getAllAchievementsWithStatus } from '@/lib/achievements';
import { getCategoriesComparison, ProgressCategory } from '@/lib/category-progress';
import { ProgressResponseData, BodyweightEntry } from '@/types/api/progressResponses';
import { IUserProgress, IUserProgressModel } from '@/types/models/progress';
import { validateRequest } from '@/lib/validation';
import { z } from 'zod';
import { Types } from 'mongoose';

/**
 * GET /api/progress
 * Fetch user's complete progress data
 */
export const GET = withAuth<ProgressResponseData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Defensive check for userId
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
      }
      
      const userObjectId = new Types.ObjectId(userId);
      
      // Get user progress or create if doesn't exist
      let userProgress: IUserProgress | null = null;
      try {
        userProgress = await UserProgress.findOne({ userId: userObjectId });
        
        if (!userProgress) {
          userProgress = await (UserProgress as IUserProgressModel).createInitialProgress(userObjectId);
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving or creating user progress');
      }
      
      // Double-check that we have a valid user progress object
      if (!userProgress) {
        return apiError('Failed to retrieve or create user progress', 500, 'ERR_DATABASE');
      }

      // Format the progress response
      const responseData = await formatProgressResponse(userProgress);
      return apiResponse(responseData, true, 'Progress retrieved successfully');
    } catch (error) {
      return handleApiError(error, 'Error retrieving progress');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/progress
 * Add XP or bodyweight entry
 * Body: { action: 'add_xp' | 'add_bodyweight', ... }
 */
export const POST = withAuth<ProgressResponseData | BodyweightEntry[]>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Defensive check for userId
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
      }
      
      const userObjectId = new Types.ObjectId(userId);
      
      // Validate request body with Zod schema
      const requestSchema = z.object({
        action: z.enum(['add_xp', 'add_bodyweight']),
        xpAmount: z.number().positive().optional(),
        source: z.string().min(1).optional(),
        category: z.enum(['core', 'push', 'pull', 'legs']).optional(),
        details: z.string().optional(),
        weight: z.number().positive().optional(),
        unit: z.enum(['kg', 'lb']).default('kg').optional(),
        date: z.string().datetime().optional(),
      });
      
      let body;
      try {
        body = await validateRequest(req, requestSchema);
      } catch (error) {
        return handleApiError(error, 'Invalid request data');
      }

      // Find or create user progress
      let userProgress: IUserProgress | null = null;
      try {
        userProgress = await UserProgress.findOne({ userId: userObjectId });
        
        if (!userProgress) {
          userProgress = await (UserProgress as IUserProgressModel).createInitialProgress(userObjectId);
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving or creating user progress');
      }
      
      // Double-check that we have a valid user progress object
      if (!userProgress) {
        return apiError('Failed to retrieve or create user progress', 500, 'ERR_DATABASE');
      }

      // Process action based on request
      switch (body.action) {
        case 'add_xp': {
          const { xpAmount, source, category, details } = body;
          
          // Additional validation
          if (!xpAmount || !source) {
            return apiError('XP amount and source required', 400, 'ERR_VALIDATION');
          }
          
          // Add XP with our model method
          const leveledUp = await userProgress.addXp(xpAmount, source, category, details);
          
          // Format the updated progress response
          const responseData = await formatProgressResponse(userProgress);
          
          return apiResponse(
            responseData, 
            true, 
            leveledUp 
              ? `Congratulations! You've leveled up to level ${userProgress.level}!` 
              : `Added ${xpAmount} XP from ${source}`
          );
        }
        
        case 'add_bodyweight': {
          const { weight, unit, date } = body;
          
          // Additional validation
          if (!weight) {
            return apiError('Weight required', 400, 'ERR_VALIDATION');
          }
          
          // Create and add the bodyweight entry
          const safeUnit = unit || 'kg';
          const entry: BodyweightEntry = { 
            date: date ? new Date(date) : new Date(), 
            value: weight, 
            unit: safeUnit as 'kg' | 'lb'
          };
          
          // Make sure bodyweight array exists
          if (!Array.isArray(userProgress.bodyweight)) {
            userProgress.bodyweight = [];
          }
          
          userProgress.bodyweight.push(entry);
          userProgress.lastUpdated = new Date();
          
          try {
            await userProgress.save();
          } catch (error) {
            return handleApiError(error, 'Error saving bodyweight entry');
          }
          
          // Return the full bodyweight history
          const bodyweightEntries = userProgress.bodyweight || [];
          
          return apiResponse(
            bodyweightEntries, 
            true, 
            `Bodyweight (${weight}${safeUnit}) added successfully`
          );
        }
        
        default:
          return apiError(`Unknown action: ${body.action}`, 400, 'ERR_INVALID_ACTION');
      }
    } catch (error) {
      return handleApiError(error, 'Error processing progress action');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * Helper to format progress response with proper typing
 */
async function formatProgressResponse(userProgress: IUserProgress): Promise<ProgressResponseData> {
  // Get achievements with status
  let achievements: { unlocked: any; progress: number; id: string; title: string; description: string; type: "strength" | "consistency" | "nutrition" | "milestone"; requirements: AchievementRequirement; xpReward: number; icon: string; badgeColor?: string; }[] = [];
  try {
    achievements = await getAllAchievementsWithStatus(userProgress);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    // Continue with empty achievements if there's an error
    achievements = [];
  }
  
  // Get category comparison with defensive error handling
  let categoryComparison;
  try {
    categoryComparison = getCategoriesComparison(userProgress);
  } catch (error) {
    console.error('Error getting category comparison:', error);
    // Provide default value if there's an error
    categoryComparison = {
      categories: [],
      strongest: { category: 'core' as ProgressCategory, xp: 0, level: 1 },
      weakest: { category: 'core' as ProgressCategory, xp: 0, level: 1 },
      balanceScore: 100,
      balanceMessage: 'Error calculating balance'
    };
  }
  
  // Calculate progress percentage with defensive checks
  const nextLevelXp = userProgress.getNextLevelXp();
  const xpToNextLevel = userProgress.getXpToNextLevel();
  const progress = nextLevelXp > 0 
    ? Math.floor(((nextLevelXp - xpToNextLevel) / nextLevelXp) * 100) 
    : 0;
  
  // Ensure we have the required category progress data
  const categoryProgress = userProgress.categoryProgress || {
    core: { level: 1, xp: 0, unlockedExercises: [] },
    push: { level: 1, xp: 0, unlockedExercises: [] },
    pull: { level: 1, xp: 0, unlockedExercises: [] },
    legs: { level: 1, xp: 0, unlockedExercises: [] }
  };
  
  // Build the response data object
  return {
    level: {
      current: userProgress.level || 1,
      xp: userProgress.totalXp || 0,
      nextLevelXp,
      xpToNextLevel,
      progress
    },
    categories: {
      core: {
        level: categoryProgress.core?.level || 1,
        xp: userProgress.categoryXp?.core || 0
      },
      push: {
        level: categoryProgress.push?.level || 1,
        xp: userProgress.categoryXp?.push || 0
      },
      pull: {
        level: categoryProgress.pull?.level || 1,
        xp: userProgress.categoryXp?.pull || 0
      },
      legs: {
        level: categoryProgress.legs?.level || 1,
        xp: userProgress.categoryXp?.legs || 0
      },
      comparison: categoryComparison
    },
    achievements: {
      total: achievements.length,
      unlocked: achievements.filter(a => a.unlocked).length,
      list: achievements
    },
    lastUpdated: userProgress.lastUpdated?.toISOString() || new Date().toISOString()
  };
}