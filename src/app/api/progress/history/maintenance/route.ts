// src/app/api/progress/history/maintenance/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress, { XpTransaction, XpDailySummary } from '@/models/UserProgress';
import { Types } from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { buildAllDailySummaries, purgeOldHistory, manageHistoryStorage } from '@/lib/progress-history';

// Define response data type based on your API response structure
interface MaintenanceResponseData {
  action?: string;
  summariesCreated?: number;
  entriesPurged?: number;
  keepDays?: number;
  purgeDate?: string;
  message?: string;
}

/**
 * POST /api/progress/history/maintenance
 */
export const POST = withAuth<MaintenanceResponseData>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();

    // Defensive check for userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON request body', 400, 'ERR_INVALID_REQUEST');
    }

    const action = typeof body?.action === 'string' ? body.action : '';
    const keepDays = body?.keepDays;
    const targetUserId = body?.userId;

    if (!action || !['summarize', 'purge', 'auto'].includes(action)) {
      return apiError('Invalid action. Must be one of: summarize, purge, auto', 400, 'ERR_VALIDATION');
    }

    const userObjectId = targetUserId && targetUserId !== userId.toString()
      ? new Types.ObjectId(targetUserId)
      : new Types.ObjectId(userId);

    if (targetUserId && targetUserId !== userId.toString() && process.env.NODE_ENV === 'production') {
      return apiError('Admin permission required to manage other users', 403, 'ERR_FORBIDDEN');
    }

    let result: MaintenanceResponseData = {};

    if (action === 'summarize') {
      const summariesCreated = await buildAllDailySummaries(userObjectId);
      result = { action: 'summarize', summariesCreated, message: `Created ${summariesCreated} daily summary records` };
    } else if (action === 'purge') {
      const validDaysToKeep = !isNaN(Number(keepDays)) ? Math.max(7, Math.min(365, Number(keepDays))) : 90;
      const purgeThreshold = new Date();
      purgeThreshold.setDate(purgeThreshold.getDate() - validDaysToKeep);

      await buildAllDailySummaries(userObjectId);
      const entriesPurged = await purgeOldHistory(userObjectId, purgeThreshold, true);

      result = { action: 'purge', keepDays: validDaysToKeep, purgeDate: purgeThreshold.toISOString(), entriesPurged, message: `Purged ${entriesPurged} history entries older than ${validDaysToKeep} days` };
    } else if (action === 'auto') {
      const maintenance = await manageHistoryStorage(userObjectId);
      result = { action: 'auto', summariesCreated: maintenance?.summarized || 0, entriesPurged: maintenance?.purged || 0, message: `Created ${maintenance?.summarized || 0} summaries and purged ${maintenance?.purged || 0} old entries` };
    }

    return apiResponse(result);
  } catch (error) {
    return handleApiError(error, 'Error performing history maintenance');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * GET /api/progress/history/maintenance
 */
interface StatisticsResponseData {
  history: {
    totalEntries: number;
    estimatedSize: string;
    earliestActivity: string | null;
    latestActivity: string | null;
    distributionByMonth: { month: string; count: number }[];
  };
  summaries: {
    totalEntries: number;
    estimatedSize: string;
  };
  total: {
    estimatedSize: string;
  };
  maintenance: {
    summarizeRecommended: boolean;
    purgeRecommended: boolean;
    recommendedAction: string;
  };
}

export const GET = withAuth<StatisticsResponseData>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }

    const userObjectId = new Types.ObjectId(userId);

    const userProgress = await UserProgress.findOne({ userId: userObjectId })
      .select('xpHistory dailySummaries createdAt updatedAt');

    if (!userProgress) {
      return apiError('User progress not found', 404, 'ERR_NOT_FOUND');
    }

    const totalHistoryEntries = Array.isArray(userProgress.xpHistory) ? userProgress.xpHistory.length : 0;
    const totalSummaries = Array.isArray(userProgress.dailySummaries) ? userProgress.dailySummaries.length : 0;

    let earliestActivity = null;
    let latestActivity = null;
    if (totalHistoryEntries > 0 && Array.isArray(userProgress.xpHistory)) {
      const sortedEntries = [...userProgress.xpHistory]
        .filter(entry => entry && entry.date)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sortedEntries.length > 0) {
        earliestActivity = sortedEntries[0].date.toISOString();
        latestActivity = sortedEntries[sortedEntries.length - 1].date.toISOString();
      }
    }

    const historySizeByMonth: Record<string, number> = {};
    if (totalHistoryEntries > 0 && Array.isArray(userProgress.xpHistory)) {
      for (const entry of userProgress.xpHistory) {
        if (entry && entry.date) {
          const date = new Date(entry.date);
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          historySizeByMonth[monthKey] = (historySizeByMonth[monthKey] || 0) + 1;
        }
      }
    }

    const estimatedHistorySize = totalHistoryEntries * 200;
    const estimatedSummarySize = totalSummaries * 350;
    const totalEstimatedSize = estimatedHistorySize + estimatedSummarySize;

    const shouldSummarize = totalHistoryEntries > 0 && totalSummaries === 0;
    const shouldPurge = totalHistoryEntries > 1000;

    const statistics: StatisticsResponseData = {
      history: {
        totalEntries: totalHistoryEntries,
        estimatedSize: `${(estimatedHistorySize / 1024).toFixed(1)} KB`,
        earliestActivity,
        latestActivity,
        distributionByMonth: Object.entries(historySizeByMonth).map(([month, count]) => ({ month, count })),
      },
      summaries: {
        totalEntries: totalSummaries,
        estimatedSize: `${(estimatedSummarySize / 1024).toFixed(1)} KB`,
      },
      total: {
        estimatedSize: `${(totalEstimatedSize / 1024).toFixed(1)} KB`,
      },
      maintenance: {
        summarizeRecommended: shouldSummarize,
        purgeRecommended: shouldPurge,
        recommendedAction: shouldSummarize ? 'summarize' : shouldPurge ? 'purge' : 'none',
      },
    };

    return apiResponse(statistics);
  } catch (error) {
    return handleApiError(error, 'Error retrieving history statistics');
  }
}, AuthLevel.DEV_OPTIONAL);