export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { ProgressOverviewData } from '@/types/api/progressResponses';
import { IUserProgress, IUserProgressModel } from '@/types/models/progress';
import { Types } from 'mongoose';

export const GET = withAuth<ProgressOverviewData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
      }
      
      const userObjectId = new Types.ObjectId(userId);
      
      // Get or create user progress
      let userProgress: IUserProgress | null = await UserProgress.findOne({ userId: userObjectId });
      
      if (!userProgress) {
        userProgress = await (UserProgress as IUserProgressModel).createInitialProgress(userObjectId);
      }
      
      if (!userProgress) {
        return apiError('Failed to retrieve user progress', 500, 'ERR_DATABASE');
      }

      // Build clean response
      const responseData: ProgressOverviewData = {
        level: {
          current: userProgress.level || 1,
          totalXp: userProgress.totalXp || 0,
          xpToNext: userProgress.getXpToNextLevel(),
          progressPercent: Math.floor(
            ((userProgress.getNextLevelXp() - userProgress.getXpToNextLevel()) / userProgress.getNextLevelXp()) * 100
          ),
        },
        categories: {
          core: {
            level: userProgress.categoryProgress?.core?.level || 1,
            xp: userProgress.categoryXp?.core || 0,
          },
          push: {
            level: userProgress.categoryProgress?.push?.level || 1,
            xp: userProgress.categoryXp?.push || 0,
          },
          pull: {
            level: userProgress.categoryProgress?.pull?.level || 1,
            xp: userProgress.categoryXp?.pull || 0,
          },
          legs: {
            level: userProgress.categoryProgress?.legs?.level || 1,
            xp: userProgress.categoryXp?.legs || 0,
          },
        },
        recentActivity: getRecentActivity(userProgress.xpHistory || []),
        lastUpdated: userProgress.lastUpdated?.toISOString() || new Date().toISOString(),
      };
      
      return apiResponse(responseData, true, 'Progress overview retrieved');
    } catch (error) {
      return handleApiError(error, 'Error retrieving progress overview');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

// Helper to get recent activity
function getRecentActivity(xpHistory: any[]): Array<{ date: string; xp: number; source: string }> {
  return xpHistory
    .slice(-10) // Last 10 transactions
    .reverse()
    .map(tx => ({
      date: tx.date.toISOString(),
      xp: tx.amount,
      source: tx.source,
    }));
}
