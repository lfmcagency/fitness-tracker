// src/app/api/progress/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { getAllAchievementsWithStatus } from '@/lib/achievements';
import { getCategoriesComparison } from '@/lib/category-progress';
import { ProgressResponseData, BodyweightEntry } from '@/types/api/progressResponses';
import { validateRequest } from '@/lib/validation';
import { schemas } from '@/lib/validation';

/**
 * GET /api/progress
 * Fetch user's complete progress data
 */
export const GET = withAuth<ProgressResponseData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      let userProgress = await UserProgress.findOne({ userId }).populate('achievements');
      if (!userProgress) {
        userProgress = await UserProgress.createInitialProgress(new mongoose.Types.ObjectId(userId));
        if (!userProgress) throw new Error('Failed to create initial progress');
      }

      const responseData = await formatProgressResponse(userProgress);
      return apiResponse(responseData, true, 'Progress retrieved');
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
      const body = await validateRequest(req, z.object({
        action: z.enum(['add_xp', 'add_bodyweight']),
        xpAmount: z.number().positive().optional(),
        source: z.string().min(1).optional(),
        category: z.enum(['core', 'push', 'pull', 'legs']).optional(),
        details: z.string().optional(),
        weight: z.number().positive().optional(),
        unit: z.enum(['kg', 'lb']).default('kg').optional(),
        date: z.string().datetime().optional(),
      }));

      let userProgress = await UserProgress.findOne({ userId });
      if (!userProgress) {
        userProgress = await UserProgress.createInitialProgress(new mongoose.Types.ObjectId(userId));
        if (!userProgress) throw new Error('Failed to create initial progress');
      }

      switch (body.action) {
        case 'add_xp': {
          const { xpAmount, source, category, details } = body;
          if (!xpAmount || !source) return apiError('XP amount and source required', 400, 'ERR_VALIDATION');
          await userProgress.addXp(xpAmount, source, category, details);
          const responseData = await formatProgressResponse(userProgress);
          return apiResponse(responseData, true, 'XP added');
        }
        case 'add_bodyweight': {
          const { weight, unit, date } = body;
          if (!weight) return apiError('Weight required', 400, 'ERR_VALIDATION');
          const entry: BodyweightEntry = { date: date ? new Date(date) : new Date(), value: weight, unit };
          userProgress.bodyweight.push(entry);
          userProgress.lastUpdated = new Date();
          await userProgress.save();
          return apiResponse(userProgress.bodyweight as BodyweightEntry[], true, 'Bodyweight added');
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

// Helper to format progress response
async function formatProgressResponse(userProgress: IUserProgress): Promise<ProgressResponseData> {
  const achievements = await getAllAchievementsWithStatus(userProgress);
  const categoryComparison = getCategoriesComparison(userProgress);
  return {
    level: {
      current: userProgress.level,
      xp: userProgress.totalXp,
      nextLevelXp: userProgress.getNextLevelXp(),
      xpToNextLevel: userProgress.getXpToNextLevel(),
      progress: Math.floor((userProgress.totalXp % userProgress.getNextLevelXp()) / userProgress.getNextLevelXp() * 100),
    },
    categories: {
      core: userProgress.categoryProgress.core,
      push: userProgress.categoryProgress.push,
      pull: userProgress.categoryProgress.pull,
      legs: userProgress.categoryProgress.legs,
      comparison: categoryComparison,
    },
    achievements: {
      total: achievements.length,
      unlocked: achievements.filter(a => a.unlocked).length,
      list: achievements,
    },
    lastUpdated: userProgress.lastUpdated.toISOString(),
  };
}