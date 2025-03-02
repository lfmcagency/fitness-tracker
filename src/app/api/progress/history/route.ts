export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress, { XpTransaction, XpDailySummary } from '@/models/UserProgress';
import { Types } from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// Type definition for query parameters
type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';
type GroupBy = 'day' | 'week' | 'month';
type ProgressCategory = 'core' | 'push' | 'pull' | 'legs' | 'all';

/**
 * Formats a date range for MongoDB queries
 * @param timeRange The time range to format
 * @returns Date object for the start of the range
 */
function getDateRangeStart(timeRange: TimeRange): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeRange) {
    case 'day':
      return today;
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      return weekStart;
    case 'month':
      return new Date(today.getFullYear(), today.getMonth(), 1); // Start of month
    case 'year':
      return new Date(today.getFullYear(), 0, 1); // Start of year
    case 'all':
    default:
      return new Date(0); // Beginning of time
  }
}

/**
 * Groups XP history data by the specified time period
 * @param data XP history data to aggregate
 * @param groupBy Time grouping parameter
 * @param category Optional category filter
 * @returns Aggregated history data suitable for charts
 */
function aggregateProgressHistory(
  data: (XpTransaction | XpDailySummary)[],
  groupBy: GroupBy,
  category?: ProgressCategory
): any[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Check if we're working with transactions or daily summaries
  const isTransactions = 'amount' in data[0];
  
  // Define grouping function based on groupBy parameter
  const getGroupKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    
    switch (groupBy) {
      case 'day':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      case 'week':
        // Get week number (approximate)
        const weekNum = Math.ceil((day + new Date(year, month - 1, 1).getDay()) / 7);
        return `${year}-${month.toString().padStart(2, '0')}-W${weekNum}`;
      case 'month':
        return `${year}-${month.toString().padStart(2, '0')}`;
      default:
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  };
  
  // Group data by the specified period
  const groupedData: Record<string, any> = {};
  
  if (isTransactions) {
    // Handle XP transactions
    for (const tx of data as XpTransaction[]) {
      // Skip if filtered by category and doesn't match
      if (category && category !== 'all' && tx.category !== category) {
        continue;
      }
      
      const groupKey = getGroupKey(new Date(tx.date));
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          date: new Date(tx.date),
          label: groupKey,
          xp: 0,
          core: 0,
          push: 0,
          pull: 0,
          legs: 0,
          sources: {}
        };
      }
      
      // Add to total XP
      groupedData[groupKey].xp += tx.amount;
      
      // Add to category
      if (tx.category) {
        groupedData[groupKey][tx.category] += tx.amount;
      }
      
      // Add to source
      if (!groupedData[groupKey].sources[tx.source]) {
        groupedData[groupKey].sources[tx.source] = 0;
      }
      groupedData[groupKey].sources[tx.source] += tx.amount;
    }
  } else {
    // Handle daily summaries
    for (const summary of data as XpDailySummary[]) {
      const groupKey = getGroupKey(new Date(summary.date));
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          date: new Date(summary.date),
          label: groupKey,
          xp: 0,
          core: category === 'all' || category === 'core' ? summary.categories.core : 0,
          push: category === 'all' || category === 'push' ? summary.categories.push : 0,
          pull: category === 'all' || category === 'pull' ? summary.categories.pull : 0,
          legs: category === 'all' || category === 'legs' ? summary.categories.legs : 0,
          sources: { ...summary.sources }
        };
        
        // Set total XP based on category filter
        if (category === 'all') {
          groupedData[groupKey].xp = summary.totalXp;
        } else if (category && category !== 'all') {
          groupedData[groupKey].xp = summary.categories[category];
        } else {
          groupedData[groupKey].xp = summary.totalXp;
        }
      } else {
        // Add to existing group
        groupedData[groupKey].xp += category === 'all' ? summary.totalXp : 
          (category ? summary.categories[category] : summary.totalXp);
        
        if (category === 'all' || !category) {
          groupedData[groupKey].core += summary.categories.core;
          groupedData[groupKey].push += summary.categories.push;
          groupedData[groupKey].pull += summary.categories.pull;
          groupedData[groupKey].legs += summary.categories.legs;
        } else {
          groupedData[groupKey][category] += summary.categories[category];
        }
        
        // Merge sources
        for (const [source, amount] of Object.entries(summary.sources)) {
          if (!groupedData[groupKey].sources[source]) {
            groupedData[groupKey].sources[source] = 0;
          }
          groupedData[groupKey].sources[source] += amount;
        }
      }
    }
  }
  
  // Convert to array and sort by date
  const resultArray = Object.values(groupedData).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate cumulative values
  let cumulativeXp = 0;
  const cumulativeData = resultArray.map(item => {
    cumulativeXp += item.xp;
    return {
      ...item,
      cumulativeXp,
      date: item.date.toISOString() // Convert date to string for JSON
    };
  });
  
  return cumulativeData;
}

/**
 * GET /api/progress/history
 * 
 * Retrieves progress history data for the authenticated user.
 * 
 * Query parameters:
 * - timeRange: 'day' | 'week' | 'month' | 'year' | 'all' (default: 'month')
 * - category: 'core' | 'push' | 'pull' | 'legs' | 'all' (default: 'all')
 * - groupBy: 'day' | 'week' | 'month' (default: 'day')
 * 
 * Returns formatted history data suitable for charts and visualizations.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication in production
    if (!session && process.env.NODE_ENV === 'production') {
      return apiError('Authentication required', 401);
    }
    
    const userId = session?.user?.id || '000000000000000000000000'; // Mock ID for development
    let userObjectId: Types.ObjectId;
    
    try {
      userObjectId = new Types.ObjectId(userId);
    } catch (error) {
      return apiError('Invalid user ID', 400);
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const timeRange = (url.searchParams.get('timeRange') || 'month') as TimeRange;
    const category = (url.searchParams.get('category') || 'all') as ProgressCategory;
    const groupBy = (url.searchParams.get('groupBy') || 'day') as GroupBy;
    
    // Validate parameters
    if (!['day', 'week', 'month', 'year', 'all'].includes(timeRange)) {
      return apiError('Invalid timeRange parameter', 400);
    }
    
    if (!['core', 'push', 'pull', 'legs', 'all'].includes(category)) {
      return apiError('Invalid category parameter', 400);
    }
    
    if (!['day', 'week', 'month'].includes(groupBy)) {
      return apiError('Invalid groupBy parameter', 400);
    }
    
    // Get the user's progress document
    const userProgress = await UserProgress.findOne({ userId: userObjectId });
    
    if (!userProgress) {
      return apiError('User progress not found', 404);
    }
    
    // Get the start date for the requested time range
    const startDate = getDateRangeStart(timeRange);
    
    // Choose data source based on time range and available data
    let historyData;
    let dataSource: 'transactions' | 'summaries' | 'both' = 'transactions';
    
    // For longer time ranges, prefer daily summaries for performance if available
    if ((timeRange === 'month' || timeRange === 'year' || timeRange === 'all') 
        && userProgress.dailySummaries 
        && userProgress.dailySummaries.length > 0) {
      // Get relevant daily summaries
      const relevantSummaries = userProgress.dailySummaries.filter(
        summary => new Date(summary.date) >= startDate
      );
      
      if (relevantSummaries.length > 0) {
        historyData = relevantSummaries;
        dataSource = 'summaries';
      }
    }
    
    // Fall back to full transaction history if needed
    if (!historyData) {
      // Get transactions in the specified date range
      const relevantTransactions = userProgress.xpHistory.filter(
        tx => new Date(tx.date) >= startDate
      );
      
      historyData = relevantTransactions;
      dataSource = 'transactions';
    }
    
    // Format data for chart visualization
    const formattedData = aggregateProgressHistory(historyData, groupBy, category);
    
    // Build response with metadata
    const response = {
      timeRange,
      category,
      groupBy,
      dataSource,
      dataPoints: formattedData.length,
      firstDate: formattedData.length > 0 ? formattedData[0].date : null,
      lastDate: formattedData.length > 0 ? formattedData[formattedData.length - 1].date : null,
      totalXp: formattedData.length > 0 ? formattedData[formattedData.length - 1].cumulativeXp : 0,
      data: formattedData
    };
    
    return apiResponse(response);
  } catch (error) {
    return handleApiError(error, 'Error retrieving progress history');
  }
}