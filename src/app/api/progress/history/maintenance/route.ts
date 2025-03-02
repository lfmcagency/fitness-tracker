export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { 
  buildAllDailySummaries, 
  purgeOldHistory, 
  manageHistoryStorage 
} from '@/lib/progress-history';

/**
 * POST /api/progress/history/maintenance
 * 
 * Performs maintenance operations on progress history data:
 * - Building summaries for efficient storage
 * - Purging old detailed history while keeping summaries
 * - Rebuilding aggregate data
 * 
 * Request payload:
 * - action: 'summarize' | 'purge' | 'auto' (required)
 * - keepDays?: number - for 'purge' action, how many days of detailed history to keep
 * - userId?: string - admin only, to manage a specific user's history
 * 
 * This endpoint requires authentication and admin role for managing other users.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication
    if (!session) {
      return apiError('Authentication required', 401);
    }
    
    // Parse request body
    const { action, keepDays, userId: targetUserId } = await req.json();
    
    // Validate action
    if (!action || !['summarize', 'purge', 'auto'].includes(action)) {
      return apiError('Invalid action. Must be one of: summarize, purge, auto', 400);
    }
    
    let userObjectId: Types.ObjectId;
    
    // If managing another user's history, check admin permissions
    if (targetUserId && targetUserId !== session.user.id) {
      // For production, verify admin role
      if (process.env.NODE_ENV === 'production' && session.user.role !== 'admin') {
        return apiError('Admin permission required to manage other users', 403);
      }
      
      try {
        userObjectId = new Types.ObjectId(targetUserId);
      } catch (error) {
        return apiError('Invalid target user ID', 400);
      }
    } else {
      // Self-management
      userObjectId = new Types.ObjectId(session.user.id);
    }
    
    // Execute the requested action
    let result;
    
    if (action === 'summarize') {
      // Build daily summaries for all history
      const summariesCreated = await buildAllDailySummaries(userObjectId);
      
      result = {
        action: 'summarize',
        summariesCreated,
        message: `Created ${summariesCreated} daily summary records`
      };
    } 
    else if (action === 'purge') {
      // Validate keepDays parameter
      const daysToKeep = keepDays && !isNaN(Number(keepDays)) 
        ? Math.max(7, Math.min(365, Number(keepDays))) // Min 7 days, max 365 days
        : 90; // Default to 90 days
      
      // Calculate purge threshold date
      const purgeThreshold = new Date();
      purgeThreshold.setDate(purgeThreshold.getDate() - daysToKeep);
      
      // First ensure we have summaries
      await buildAllDailySummaries(userObjectId);
      
      // Then purge old history
      const entriesPurged = await purgeOldHistory(userObjectId, purgeThreshold, true);
      
      result = {
        action: 'purge',
        keepDays: daysToKeep,
        purgeDate: purgeThreshold.toISOString(),
        entriesPurged,
        message: `Purged ${entriesPurged} history entries older than ${daysToKeep} days`
      };
    }
    else if (action === 'auto') {
      // Run automatic maintenance
      const { summarized, purged } = await manageHistoryStorage(userObjectId);
      
      result = {
        action: 'auto',
        summariesCreated: summarized,
        entriesPurged: purged,
        message: `Created ${summarized} summaries and purged ${purged} old entries`
      };
    }
    
    return apiResponse(result);
  } catch (error) {
    return handleApiError(error, 'Error performing history maintenance');
  }
}

/**
 * GET /api/progress/history/maintenance
 * 
 * Retrieves storage statistics for progress history:
 * - Total history entry count
 * - History size distribution
 * - Summary record count
 * - Earliest and latest recorded activity
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication
    if (!session) {
      return apiError('Authentication required', 401);
    }
    
    const userObjectId = new Types.ObjectId(session.user.id);
    
    // Get the user's progress document
    const userProgress = await UserProgress.findOne({ userId: userObjectId })
      .select('xpHistory dailySummaries createdAt updatedAt');
    
    if (!userProgress) {
      return apiError('User progress not found', 404);
    }
    
    // Calculate history statistics
    const totalHistoryEntries = userProgress.xpHistory?.length || 0;
    const totalSummaries = userProgress.dailySummaries?.length || 0;
    
    // Find date range of activity
    let earliestActivity = null;
    let latestActivity = null;
    
    if (totalHistoryEntries > 0) {
      // Sort by date (oldest first)
      const sortedEntries = [...userProgress.xpHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      earliestActivity = sortedEntries[0].date;
      latestActivity = sortedEntries[sortedEntries.length - 1].date;
    }
    
    // Group history entries by month for size distribution
    const historySizeByMonth: Record<string, number> = {};
    
    if (totalHistoryEntries > 0) {
      for (const entry of userProgress.xpHistory) {
        const date = new Date(entry.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!historySizeByMonth[monthKey]) {
          historySizeByMonth[monthKey] = 0;
        }
        
        historySizeByMonth[monthKey]++;
      }
    }
    
    // Estimate storage size (rough calculation)
    const estimatedHistorySize = totalHistoryEntries * 200; // ~200 bytes per entry
    const estimatedSummarySize = totalSummaries * 350; // ~350 bytes per summary
    const totalEstimatedSize = estimatedHistorySize + estimatedSummarySize;
    
    // Determine if maintenance is recommended
    const shouldSummarize = totalHistoryEntries > 0 && totalSummaries === 0;
    const shouldPurge = totalHistoryEntries > 1000; // Arbitrary threshold
    
    const statistics = {
      history: {
        totalEntries: totalHistoryEntries,
        estimatedSize: `${(estimatedHistorySize / 1024).toFixed(1)} KB`,
        earliestActivity,
        latestActivity,
        distributionByMonth: Object.entries(historySizeByMonth)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month))
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
        recommendedAction: shouldSummarize 
          ? 'summarize' 
          : (shouldPurge ? 'purge' : 'none')
      }
    };
    
    return apiResponse(statistics);
  } catch (error) {
    return handleApiError(error, 'Error retrieving history statistics');
  }
}