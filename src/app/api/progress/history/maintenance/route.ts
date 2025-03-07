export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
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
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Defensive check for userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    // Parse request body with defensive error handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON request body', 400, 'ERR_INVALID_REQUEST');
    }
    
    // Safely extract values with defaults
    const action = typeof body?.action === 'string' ? body.action : '';
    const keepDays = body?.keepDays;
    const targetUserId = body?.userId;
    
    // Validate action
    if (!action || !['summarize', 'purge', 'auto'].includes(action)) {
      return apiError('Invalid action. Must be one of: summarize, purge, auto', 400, 'ERR_VALIDATION');
    }
    
    let userObjectId: Types.ObjectId;
    
    // If managing another user's history, check admin permissions
    if (targetUserId && targetUserId !== userId.toString()) {
      // For production, verify admin role
      if (process.env.NODE_ENV === 'production') {
        // Admin role check would go here
        // For now, disallow in production
        return apiError('Admin permission required to manage other users', 403, 'ERR_FORBIDDEN');
      }
      
      try {
        userObjectId = new Types.ObjectId(targetUserId);
      } catch (error) {
        return apiError('Invalid target user ID', 400, 'ERR_VALIDATION');
      }
    } else {
      // Self-management
      userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    }
    
    // Execute the requested action
    let result;
    
    if (action === 'summarize') {
      // Build daily summaries for all history with error handling
      let summariesCreated;
      try {
        summariesCreated = await buildAllDailySummaries(userObjectId);
      } catch (error) {
        return handleApiError(error, 'Error creating summary records');
      }
      
      result = {
        action: 'summarize',
        summariesCreated,
        message: `Created ${summariesCreated} daily summary records`
      };
    } 
    else if (action === 'purge') {
      // Validate keepDays parameter
      const daysToKeep = Number(keepDays);
      const validDaysToKeep = !isNaN(daysToKeep)
        ? Math.max(7, Math.min(365, daysToKeep)) // Min 7 days, max 365 days
        : 90; // Default to 90 days
      
      // Calculate purge threshold date
      const purgeThreshold = new Date();
      purgeThreshold.setDate(purgeThreshold.getDate() - validDaysToKeep);
      
      // First ensure we have summaries with error handling
      try {
        await buildAllDailySummaries(userObjectId);
      } catch (error) {
        return handleApiError(error, 'Error creating summary records before purge');
      }
      
      // Then purge old history with error handling
      let entriesPurged;
      try {
        entriesPurged = await purgeOldHistory(userObjectId, purgeThreshold, true);
      } catch (error) {
        return handleApiError(error, 'Error purging old history');
      }
      
      result = {
        action: 'purge',
        keepDays: validDaysToKeep,
        purgeDate: purgeThreshold.toISOString(),
        entriesPurged,
        message: `Purged ${entriesPurged} history entries older than ${validDaysToKeep} days`
      };
    }
    else if (action === 'auto') {
      // Run automatic maintenance with error handling
      let maintenance;
      try {
        maintenance = await manageHistoryStorage(userObjectId);
      } catch (error) {
        return handleApiError(error, 'Error performing automatic maintenance');
      }
      
      result = {
        action: 'auto',
        summariesCreated: maintenance?.summarized || 0,
        entriesPurged: maintenance?.purged || 0,
        message: `Created ${maintenance?.summarized || 0} summaries and purged ${maintenance?.purged || 0} old entries`
      };
    }
    
    return apiResponse(result);
  } catch (error) {
    return handleApiError(error, 'Error performing history maintenance');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * GET /api/progress/history/maintenance
 * 
 * Retrieves storage statistics for progress history:
 * - Total history entry count
 * - History size distribution
 * - Summary record count
 * - Earliest and latest recorded activity
 */
export const GET = withAuth<ResponseType['data']>(
  async (req: NextRequest, userId: string) => {
    try {
    
    // Defensive check for userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    
    // Get the user's progress document with error handling
    let userProgress;
    try {
      userProgress = await UserProgress.findOne({ userId: userObjectId })
        .select('xpHistory dailySummaries createdAt updatedAt');
    } catch (error) {
      return handleApiError(error, 'Database error while fetching user progress');
    }
    
    if (!userProgress) {
      return apiError('User progress not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Calculate history statistics with defensive null checks
    const totalHistoryEntries = Array.isArray(userProgress.xpHistory) ? userProgress.xpHistory.length : 0;
    const totalSummaries = Array.isArray(userProgress.dailySummaries) ? userProgress.dailySummaries.length : 0;
    
    // Find date range of activity with defensive approach
    let earliestActivity = null;
    let latestActivity = null;
    
    if (totalHistoryEntries > 0 && Array.isArray(userProgress.xpHistory)) {
      try {
        // Sort by date (oldest first) with defensive approach
        const sortedEntries = [...userProgress.xpHistory]
          .filter(entry => entry && entry.date) // Filter out entries without valid dates
          .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return isNaN(dateA) || isNaN(dateB) ? 0 : dateA - dateB;
          });
        
        if (sortedEntries.length > 0) {
          earliestActivity = sortedEntries[0].date;
          latestActivity = sortedEntries[sortedEntries.length - 1].date;
        }
      } catch (error) {
        console.error('Error sorting history entries:', error);
        // Continue with null values
      }
    }
    
    // Group history entries by month for size distribution with defensive approach
    const historySizeByMonth: Record<string, number> = {};
    
    if (totalHistoryEntries > 0 && Array.isArray(userProgress.xpHistory)) {
      for (const entry of userProgress.xpHistory) {
        if (!entry || !entry.date) continue;
        
        try {
          const date = new Date(entry.date);
          if (isNaN(date.getTime())) continue; // Skip invalid dates
          
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          
          if (!historySizeByMonth[monthKey]) {
            historySizeByMonth[monthKey] = 0;
          }
          
          historySizeByMonth[monthKey]++;
        } catch (error) {
          // Skip this entry if there's an error
          continue;
        }
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
}, AuthLevel.DEV_OPTIONAL);