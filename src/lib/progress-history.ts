import UserProgress, { XpDailySummary, XpTransaction } from '@/models/UserProgress';
import { Types } from 'mongoose';

/**
 * Utility for managing user progress history
 * Includes functions for:
 * - Optimizing history storage
 * - Summarizing history data
 * - Purging old detailed history while keeping summaries
 */

/**
 * Summarizes all history for a user by creating daily summary records
 * This is useful when rebuilding summaries or when migrating old data
 * @param userId User's MongoDB ObjectId
 * @returns Promise resolving to number of summaries created
 */
export async function buildAllDailySummaries(userId: string | Types.ObjectId): Promise<number> {
  // Ensure userId is an ObjectId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Find the user's progress document
  const userProgress = await UserProgress.findOne({ userId: userObjectId });
  
  if (!userProgress || !userProgress.xpHistory || userProgress.xpHistory.length === 0) {
    return 0;
  }
  
  // Group transactions by day
  const transactionsByDay = new Map<string, Date>();
  
  // Find all unique days
  for (const tx of userProgress.xpHistory) {
    const txDate = new Date(tx.date);
    const dateKey = txDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!transactionsByDay.has(dateKey)) {
      // Create a date object at the start of this day
      const dayStart = new Date(txDate);
      dayStart.setHours(0, 0, 0, 0);
      transactionsByDay.set(dateKey, dayStart);
    }
  }
  
  // Generate a summary for each day
  let summariesCreated = 0;
  for (const dayDate of transactionsByDay.values()) {
    await userProgress.summarizeDailyXp(dayDate);
    summariesCreated++;
  }
  
  return summariesCreated;
}

/**
 * Purges detailed transaction history older than the specified period
 * while preserving daily summaries for long-term trend data
 * @param userId User's MongoDB ObjectId
 * @param olderThan Date threshold to purge transactions before
 * @param keepSummaries Whether to preserve daily summaries (default: true)
 * @returns Promise resolving to number of transactions purged
 */
export async function purgeOldHistory(
  userId: string | Types.ObjectId,
  olderThan: Date,
  keepSummaries: boolean = true
): Promise<number> {
  // Ensure userId is an ObjectId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Find the user's progress document
  const userProgress = await UserProgress.findOne({ userId: userObjectId });
  
  if (!userProgress) {
    return 0;
  }
  
  // Ensure we have summaries before purging detailed history
  if (keepSummaries) {
    // Make sure we have daily summaries for all history that will be purged
    await buildAllDailySummaries(userObjectId);
  }
  
  // Purge old transactions
  const purgedCount = await userProgress.purgeOldHistory(olderThan);
  
  // If not keeping summaries, also remove old summaries
  if (!keepSummaries && userProgress.dailySummaries) {
    const originalSummaryCount = userProgress.dailySummaries.length;
    
    // Filter out summaries older than the threshold
    userProgress.dailySummaries = userProgress.dailySummaries.filter(
      summary => new Date(summary.date) >= olderThan
    );
    
    // If we removed any summaries, save the document
    if (userProgress.dailySummaries.length < originalSummaryCount) {
      await userProgress.save();
    }
  }
  
  return purgedCount;
}

/**
 * Builds historical aggregate data suitable for charts and visualizations
 * @param userId User's MongoDB ObjectId 
 * @param timeRange Time range to include
 * @param groupBy How to group the data points
 * @param category Optional category to filter by
 * @returns Promise resolving to aggregated history data
 */
export async function getProgressHistoryData(
  userId: string | Types.ObjectId,
  timeRange: 'day' | 'week' | 'month' | 'year' | 'all' = 'month',
  groupBy: 'day' | 'week' | 'month' = 'day',
  category?: 'core' | 'push' | 'pull' | 'legs'
): Promise<any> {
  // Get the start date for filtering
  const now = new Date();
  let startDate: Date;
  
  switch (timeRange) {
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
    default:
      startDate = new Date(0); // Beginning of time
  }
  
  // Ensure userId is an ObjectId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Find the user's progress
  const userProgress = await UserProgress.findOne({ userId: userObjectId })
    .select('dailySummaries xpHistory');
  
  if (!userProgress) {
    return { error: 'User progress not found', data: [] };
  }
  
  // Choose which data source to use based on time range and available data
  let historyData;
  let dataSource: 'transactions' | 'summaries' = 'transactions'; // Default to transactions

  // For longer time ranges, prefer daily summaries if available
  if ((timeRange === 'month' || timeRange === 'year' || timeRange === 'all') 
      && userProgress.dailySummaries 
      && userProgress.dailySummaries.length > 0) {
    
    // Get summaries in range
    const relevantSummaries = userProgress.dailySummaries.filter(
      summary => new Date(summary.date) >= startDate
    );
    
    if (relevantSummaries.length > 0) {
      historyData = relevantSummaries;
      dataSource = 'summaries';
    }
  }
  
  // Fall back to transactions if needed
  if (!historyData) {
    // Get transactions in range
    const relevantTransactions = userProgress.xpHistory.filter(
      tx => new Date(tx.date) >= startDate
    );
    
    historyData = relevantTransactions;
    // dataSource is already set to 'transactions' by default
  }
  
  // If we have no data, return empty result
  if (!historyData || historyData.length === 0) {
    return {
      timeRange,
      groupBy,
      category,
      dataSource: 'none',
      dataPoints: 0,
      data: []
    };
  }
  
  // Group the data by the specified time period
  const groupedData = new Map<string, XpDailySummary>();
  
  // Process the data based on its type
  if (dataSource === 'summaries') {
    // Process summary data
    for (const summary of historyData as XpDailySummary[]) {
      const date = new Date(summary.date);
      
      // Generate group key based on groupBy
      let groupKey: string;
      
      if (groupBy === 'day') {
        groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        // Approximate week number
        const weekNum = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
        groupKey = `${date.getFullYear()}-W${weekNum}`;
      } else {
        // Month grouping
        groupKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      
      // Filter by category if specified
      if (category && summary.categories[category] === 0) {
        continue; // Skip this summary if it has no XP for the requested category
      }
      
      // If this is a new group, initialize it
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          date: new Date(date),
          totalXp: 0,
          sources: {},
          categories: {
            core: 0,
            push: 0,
            pull: 0,
            legs: 0
          }
        });
      }
      
      // Add to existing group
      const group = groupedData.get(groupKey)!;
      
      // Add XP amounts
      group.totalXp += summary.totalXp;
      
      // Add category XP
      group.categories.core += summary.categories.core;
      group.categories.push += summary.categories.push;
      group.categories.pull += summary.categories.pull;
      group.categories.legs += summary.categories.legs;
      
      // Merge sources
      for (const [source, amount] of Object.entries(summary.sources)) {
        if (!group.sources[source]) {
          group.sources[source] = 0;
        }
        group.sources[source] += amount;
      }
    }
  } else {
    // Process transaction data
    for (const tx of historyData as XpTransaction[]) {
      const date = new Date(tx.date);
      
      // Generate group key based on groupBy
      let groupKey: string;
      
      if (groupBy === 'day') {
        groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        // Approximate week number
        const weekNum = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
        groupKey = `${date.getFullYear()}-W${weekNum}`;
      } else {
        // Month grouping
        groupKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      
      // Filter by category if specified
      if (category && tx.category !== category) {
        continue;
      }
      
      // If this is a new group, initialize it
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          date: new Date(date),
          totalXp: 0,
          sources: {},
          categories: {
            core: 0,
            push: 0,
            pull: 0,
            legs: 0
          }
        });
      }
      
      // Add to existing group
      const group = groupedData.get(groupKey)!;
      
      // Add XP amount
      group.totalXp += tx.amount;
      
      // Add to source totals
      if (!group.sources[tx.source]) {
        group.sources[tx.source] = 0;
      }
      group.sources[tx.source] += tx.amount;
      
      // Add to category totals if specified
      if (tx.category) {
        group.categories[tx.category] += tx.amount;
      }
    }
  }
  
  // Convert to array and sort by date
  const sortedData = Array.from(groupedData.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate cumulative values
  let cumulativeXp = 0;
  const result = sortedData.map(item => {
    cumulativeXp += item.totalXp;
    
    // Format for chart data
    return {
      date: item.date.toISOString(),
      xp: item.totalXp,
      cumulativeXp,
      core: item.categories.core,
      push: item.categories.push,
      pull: item.categories.pull,
      legs: item.categories.legs,
      sources: Object.entries(item.sources).map(([name, value]) => ({ name, value }))
    };
  });
  
  return {
    timeRange,
    groupBy,
    category,
    dataSource,
    dataPoints: result.length,
    startDate: result.length > 0 ? result[0].date : null,
    endDate: result.length > 0 ? result[result.length - 1].date : null,
    totalXp: cumulativeXp,
    data: result
  };
}

/**
 * Manages automatic history cleanup based on app settings
 * Call this periodically (daily/weekly) to maintain optimal performance
 * @param userId User's MongoDB ObjectId
 * @returns Promise resolving to cleanup results
 */
export async function manageHistoryStorage(userId: string | Types.ObjectId): Promise<{
  summarized: number;
  purged: number;
}> {
  // Default retention periods
  const KEEP_DETAILED_DAYS = 90; // Keep detailed transactions for 90 days
  
  // Calculate purge threshold date
  const now = new Date();
  const purgeThreshold = new Date(now);
  purgeThreshold.setDate(now.getDate() - KEEP_DETAILED_DAYS);
  
  // First, ensure we have summaries for all history
  const summarized = await buildAllDailySummaries(userId);
  
  // Then purge old detailed history
  const purged = await purgeOldHistory(userId, purgeThreshold, true);
  
  return { summarized, purged };
}