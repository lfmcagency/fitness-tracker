export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress, { XpTransaction, XpDailySummary } from '@/models/UserProgress';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { ProgressCategory, isValidCategory } from '@/lib/category-progress';
import { Types } from 'mongoose';

// Valid time range and grouping options
type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';
type GroupBy = 'day' | 'week' | 'month';

/**
 * GET /api/progress/history
 * 
 * Get user's XP history with filtering and grouping options
 * Query parameters:
 * - timeRange: 'day', 'week', 'month', 'year', 'all' (default: 'month')
 * - groupBy: 'day', 'week', 'month' (default: 'day')
 * - category: 'core', 'push', 'pull', 'legs' (optional, filter by category)
 */
export const GET = withAuth(async (req: NextRequest, userId: Types.ObjectId) => {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    
    // Get query parameters with defaults
    const timeRange = (url.searchParams.get('timeRange') || 'month') as TimeRange;
    const groupBy = (url.searchParams.get('groupBy') || 'day') as GroupBy;
    const categoryParam = url.searchParams.get('category') || undefined;
    
    // Validate category if provided
    let category: ProgressCategory | undefined;
    
    if (categoryParam && categoryParam !== 'all') {
      if (!isValidCategory(categoryParam)) {
        return apiError(`Invalid category: ${categoryParam}`, 400);
      }
      category = categoryParam as ProgressCategory;
    }
    
    // Calculate start date based on time range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
    }
    
    // Get user progress
    const userProgress = await UserProgress.findOne({ userId })
      .select('dailySummaries xpHistory');
    
    if (!userProgress) {
      return apiResponse({ data: [], dataPoints: 0, timeRange, groupBy }, true, 'No progress data found');
    }
    
    // Choose data source based on time range and available data
    let sourceData: (XpTransaction | XpDailySummary)[];
    let dataSource: 'transactions' | 'summaries';
    
    // For longer time ranges, prefer daily summaries if available
    if ((timeRange === 'month' || timeRange === 'year' || timeRange === 'all') 
        && userProgress.dailySummaries 
        && userProgress.dailySummaries.length > 0) {
      
      // Get summaries in range
      const relevantSummaries = userProgress.dailySummaries.filter(
        summary => new Date(summary.date) >= startDate
      );
      
      if (relevantSummaries.length > 0) {
        sourceData = relevantSummaries;
        dataSource = 'summaries';
      } else {
        // Fall back to transactions
        sourceData = userProgress.xpHistory.filter(
          tx => new Date(tx.date) >= startDate
        );
        dataSource = 'transactions';
      }
    } else {
      // Use transactions for shorter ranges or if no summaries
      sourceData = userProgress.xpHistory.filter(
        tx => new Date(tx.date) >= startDate
      );
      dataSource = 'transactions';
    }
    
    // If no data in range, return empty result
    if (sourceData.length === 0) {
      return apiResponse({
        data: [],
        dataPoints: 0,
        totalXp: 0,
        timeRange,
        groupBy,
        category: categoryParam,
        dataSource: 'none',
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }, true);
    }
    
    // Group the data
    const groupedData: { [key: string]: { 
      date: string, 
      xp: number,
      totalXp: number
    }} = {};
    
    let cumulativeXp = 0;
    
    // Process the data based on source type
    if (dataSource === 'summaries') {
      // Using dailySummaries
      for (const summary of sourceData as XpDailySummary[]) {
        const date = new Date(summary.date);
        
        // Generate group key based on groupBy
        const groupKey = formatDateForGrouping(date, groupBy);
        
        // Initialize group if needed
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            date: formatDateForDisplay(date, groupBy),
            xp: 0,
            totalXp: 0
          };
        }
        
        // Add the XP amount based on category filter
        if (categoryParam === 'all') {
          groupedData[groupKey].xp = summary.totalXp;
        } else if (category) {
          groupedData[groupKey].xp = summary.categories[category];
        } else {
          groupedData[groupKey].xp = summary.totalXp;
        }
        
        // Add to cumulative XP 
        cumulativeXp += groupedData[groupKey].xp;
        groupedData[groupKey].totalXp = cumulativeXp;
      }
    } else {
      // Using transaction data
      for (const tx of sourceData as XpTransaction[]) {
        const date = new Date(tx.date);
        
        // Generate group key based on groupBy
        const groupKey = formatDateForGrouping(date, groupBy);
        
        // Skip if we're filtering by category and this transaction doesn't match
        if (category && tx.category !== category) {
          continue;
        }
        
        // Initialize group if needed
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            date: formatDateForDisplay(date, groupBy),
            xp: 0,
            totalXp: 0
          };
        }
        
        // Add the XP amount
        groupedData[groupKey].xp += tx.amount;
      }
      
      // Calculate cumulative totals
      const sortedKeys = Object.keys(groupedData).sort();
      for (const key of sortedKeys) {
        cumulativeXp += groupedData[key].xp;
        groupedData[key].totalXp = cumulativeXp;
      }
    }
    
    // Convert to array and sort by date
    const result = Object.values(groupedData).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    return apiResponse({
      data: result,
      dataPoints: result.length,
      totalXp: cumulativeXp,
      timeRange,
      groupBy,
      category: categoryParam,
      dataSource,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    }, true, 'Progress history retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving progress history');
  }
}, AuthLevel.REQUIRED);

/**
 * Helper function to format a date for grouping
 */
function formatDateForGrouping(date: Date, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'day':
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    case 'week': {
      // Get the first day of the week (Sunday)
      const firstDay = new Date(date);
      const day = date.getDay(); // 0 for Sunday
      firstDay.setDate(date.getDate() - day);
      return firstDay.toISOString().split('T')[0];
    }
    
    case 'month':
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Helper function to format a date for display
 */
function formatDateForDisplay(date: Date, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'day':
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    case 'week': {
      // Get the first day of the week (Sunday)
      const firstDay = new Date(date);
      const day = date.getDay(); // 0 for Sunday
      firstDay.setDate(date.getDate() - day);
      
      // Get the last day of the week (Saturday)
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      
      // Format as "YYYY-MM-DD - YYYY-MM-DD"
      return `${firstDay.toISOString().split('T')[0]} - ${lastDay.toISOString().split('T')[0]}`;
    }
    
    case 'month': {
      // Format as "YYYY-MM"
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    
    default:
      return date.toISOString().split('T')[0];
  }
}