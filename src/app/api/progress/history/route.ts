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
    
    // Defensive check for userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    // Safely parse URL with defensive check
    let url;
    try {
      url = new URL(req.url);
    } catch (error) {
      return apiError('Invalid request URL', 400, 'ERR_INVALID_URL');
    }
    
    // Get query parameters with defaults and type validation
    const timeRangeParam = url.searchParams.get('timeRange');
    const groupByParam = url.searchParams.get('groupBy');
    const categoryParam = url.searchParams.get('category');
    
    // Validate timeRange parameter
    const validTimeRanges: TimeRange[] = ['day', 'week', 'month', 'year', 'all'];
    const timeRange = validTimeRanges.includes(timeRangeParam as TimeRange) 
      ? (timeRangeParam as TimeRange) 
      : 'month';
    
    // Validate groupBy parameter
    const validGroupBy: GroupBy[] = ['day', 'week', 'month'];
    const groupBy = validGroupBy.includes(groupByParam as GroupBy) 
      ? (groupByParam as GroupBy) 
      : 'day';
    
    // Validate category if provided
    let category: ProgressCategory | undefined;
    
    if (categoryParam && categoryParam !== 'all') {
      if (!isValidCategory(categoryParam)) {
        return apiError(`Invalid category: ${categoryParam}`, 400, 'ERR_INVALID_CATEGORY');
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
    
    // Get user progress with defensive error handling
    let userProgress;
    try {
      userProgress = await UserProgress.findOne({ userId })
        .select('dailySummaries xpHistory');
    } catch (error) {
      return handleApiError(error, 'Database error while fetching user progress');
    }
    
    // If no progress document exists, return empty result with metadata
    if (!userProgress) {
      return apiResponse({
        data: [],
        dataPoints: 0,
        totalXp: 0,
        timeRange,
        groupBy,
        category: categoryParam || 'all',
        dataSource: 'none',
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }, true, 'No progress data found');
    }
    
    // Choose data source based on time range and available data
    let sourceData: (XpTransaction | XpDailySummary)[] = [];
    let dataSource: 'transactions' | 'summaries' | 'none' = 'none';
    
    // Defensively check for dailySummaries and xpHistory
    const hasSummaries = Array.isArray(userProgress.dailySummaries) && userProgress.dailySummaries.length > 0;
    const hasHistory = Array.isArray(userProgress.xpHistory) && userProgress.xpHistory.length > 0;
    
    // For longer time ranges, prefer daily summaries if available
    if ((timeRange === 'month' || timeRange === 'year' || timeRange === 'all') && hasSummaries) {
      // Get summaries in range with defensive null check
      const summaries = userProgress.dailySummaries || [];
      const relevantSummaries = summaries.filter(
        summary => summary && summary.date && new Date(summary.date) >= startDate
      );
      
      if (relevantSummaries.length > 0){
          sourceData = relevantSummaries;
          dataSource = 'summaries';
        } else if (hasHistory) {
          // Fall back to transactions
          const history = userProgress.xpHistory || [];
          sourceData = history.filter(
            tx => tx && tx.date && new Date(tx.date) >= startDate
          );
          dataSource = 'transactions';
        }
      } else if (hasHistory) {
        // Use transactions for shorter ranges or if no summaries
        const history = userProgress.xpHistory || [];
        sourceData = history.filter(
          tx => tx && tx.date && new Date(tx.date) >= startDate
        );
        dataSource = 'transactions';
      }
      
      // If no data in range, return empty result with metadata
      if (!sourceData || sourceData.length === 0) {
        return apiResponse({
          data: [],
          dataPoints: 0,
          totalXp: 0,
          timeRange,
          groupBy,
          category: categoryParam || 'all',
          dataSource: 'none',
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        }, true, 'No data found for selected time range');
      }
      
      // Group the data
      const groupedData: { [key: string]: { 
        date: string, 
        xp: number,
        totalXp: number
      }} = {};
      
      let cumulativeXp = 0;
      
      // Process the data based on source type with defensive checks
      if (dataSource === 'summaries') {
        // Using dailySummaries
        for (const summary of sourceData as XpDailySummary[]) {
          if (!summary || !summary.date) continue;
          
          const date = new Date(summary.date);
          if (isNaN(date.getTime())) continue; // Skip invalid dates
          
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
          
          // Add the XP amount based on category filter with defensive checks
          let xpToAdd = 0;
          
          if (categoryParam === 'all') {
            xpToAdd = typeof summary.totalXp === 'number' ? summary.totalXp : 0;
          } else if (category && summary.categories && typeof summary.categories[category] === 'number') {
            xpToAdd = summary.categories[category];
          } else if (typeof summary.totalXp === 'number') {
            xpToAdd = summary.totalXp;
          }
          
          groupedData[groupKey].xp += xpToAdd;
          
          // Add to cumulative XP 
          cumulativeXp += xpToAdd;
          groupedData[groupKey].totalXp = cumulativeXp;
        }
      } else if (dataSource === 'transactions') {
        // Using transaction data
        for (const tx of sourceData as XpTransaction[]) {
          if (!tx || !tx.date) continue;
          
          const date = new Date(tx.date);
          if (isNaN(date.getTime())) continue; // Skip invalid dates
          
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
          
          // Add the XP amount with defensive check
          const xpToAdd = typeof tx.amount === 'number' ? tx.amount : 0;
          groupedData[groupKey].xp += xpToAdd;
        }
        
        // Calculate cumulative totals
        const sortedKeys = Object.keys(groupedData).sort();
        for (const key of sortedKeys) {
          cumulativeXp += groupedData[key].xp;
          groupedData[key].totalXp = cumulativeXp;
        }
      }
      
      // Convert to array and sort by date with defensive approach
      let result = [];
      try {
        result = Object.values(groupedData).sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
      } catch (error) {
        console.error('Error sorting data:', error);
        // Fall back to unsorted if error occurs
        result = Object.values(groupedData);
      }
      
      return apiResponse({
        data: result || [],
        dataPoints: result.length,
        totalXp: cumulativeXp,
        timeRange,
        groupBy,
        category: categoryParam || 'all',
        dataSource,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }, true, 'Progress history retrieved successfully');
    } catch (error) {
      return handleApiError(error, 'Error retrieving progress history');
    }
  }, AuthLevel.DEV_OPTIONAL);
  
  /**
   * Helper function to format a date for grouping
   */
  function formatDateForGrouping(date: Date, groupBy: GroupBy): string {
    if (!date || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0]; // Default to today if invalid
    }
    
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
    if (!date || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0]; // Default to today if invalid
    }
    
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