// src/lib/progress-history.ts
import UserProgress, { XpDailySummary, XpTransaction } from '@/models/UserProgress';
import { Types } from 'mongoose';
import { ProgressHistoryData } from '@/types/api/progressResponses';
import { ProgressCategory } from './category-progress';

/**
 * Event-based progress history management
 * Handles data aggregation, storage optimization, and history retrieval
 * NO XP AWARDING - pure data management
 */

/**
 * Build daily summaries from transaction history
 * Called after events have been processed to optimize storage
 */
export async function buildAllDailySummaries(userId: string | Types.ObjectId): Promise<number> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const userProgress = await UserProgress.findOne({ userId: userObjectId });
  if (!userProgress || !userProgress.xpHistory?.length) {
    return 0;
  }
  
  // Group transactions by day (YYYY-MM-DD)
  const transactionsByDay = new Map<string, XpTransaction[]>();
  
  for (const tx of userProgress.xpHistory) {
    const dateKey = new Date(tx.date).toISOString().split('T')[0];
    
    if (!transactionsByDay.has(dateKey)) {
      transactionsByDay.set(dateKey, []);
    }
    transactionsByDay.get(dateKey)!.push(tx);
  }
  
  // Create/update summaries for each day
  let summariesCreated = 0;
  
  for (const [dateKey, transactions] of transactionsByDay) {
    const dayDate = new Date(dateKey + 'T00:00:00.000Z');
    
    // Check if summary already exists
    const existingSummaryIndex = userProgress.dailySummaries.findIndex(
      summary => new Date(summary.date).toISOString().split('T')[0] === dateKey
    );
    
    // Build summary from transactions
    const summary: XpDailySummary = {
      date: dayDate,
      totalXp: 0,
      sources: {},
      categories: { core: 0, push: 0, pull: 0, legs: 0 }
    };
    
    for (const tx of transactions) {
      summary.totalXp += tx.amount;
      
      // Aggregate by source
      if (!summary.sources[tx.source]) {
        summary.sources[tx.source] = 0;
      }
      summary.sources[tx.source] += tx.amount;
      
      // Aggregate by category
      if (tx.category && summary.categories[tx.category as ProgressCategory] !== undefined) {
        summary.categories[tx.category as ProgressCategory] += tx.amount;
      }
    }
    
    // Update or create summary
    if (existingSummaryIndex >= 0) {
      userProgress.dailySummaries[existingSummaryIndex] = summary;
    } else {
      userProgress.dailySummaries.push(summary);
      summariesCreated++;
    }
  }
  
  // Sort summaries by date
  userProgress.dailySummaries.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  await userProgress.save();
  return summariesCreated;
}

/**
 * Purge old transaction history while preserving summaries
 * Keeps detailed transactions for recent periods, summaries for historical data
 */
export async function purgeOldHistory(
  userId: string | Types.ObjectId,
  olderThan: Date,
  keepSummaries: boolean = true
): Promise<number> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const userProgress = await UserProgress.findOne({ userId: userObjectId });
  if (!userProgress) {
    return 0;
  }
  
  // Ensure summaries exist before purging if requested
  if (keepSummaries) {
    await buildAllDailySummaries(userObjectId);
  }
  
  // Count transactions to be purged
  const originalCount = userProgress.xpHistory.length;
  
  // Filter out old transactions
  userProgress.xpHistory = userProgress.xpHistory.filter(
    tx => new Date(tx.date) >= olderThan
  );
  
  const purgedCount = originalCount - userProgress.xpHistory.length;
  
  // If not keeping summaries, also purge old summaries
  if (!keepSummaries) {
    const originalSummaryCount = userProgress.dailySummaries.length;
    
    userProgress.dailySummaries = userProgress.dailySummaries.filter(
      summary => new Date(summary.date) >= olderThan
    );
    
    console.log(`Purged ${originalSummaryCount - userProgress.dailySummaries.length} old summaries`);
  }
  
  if (purgedCount > 0) {
    await userProgress.save();
  }
  
  return purgedCount;
}

/**
 * Get optimized history data for charts and analytics
 * Uses summaries for long periods, transactions for recent periods
 */
export async function getOptimizedHistoryData(
  userId: string | Types.ObjectId,
  timeRange: 'day' | 'week' | 'month' | 'year' | 'all' = 'month',
  groupBy: 'day' | 'week' | 'month' = 'day',
  category: ProgressCategory | 'all' = 'all'
): Promise<ProgressHistoryData> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Calculate date range
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
    default:
      startDate = new Date(0); // All time
  }
  
  const userProgress = await UserProgress.findOne({ userId: userObjectId })
    .select('xpHistory dailySummaries');
  
  if (!userProgress) {
    return {
      timeRange: timeRange === 'all' ? 'year' : timeRange,
      groupBy,
      data: [],
      totalXp: 0,
      dataPoints: 0,
    };
  }
  
  // Choose optimal data source
  const useTransactions = timeRange === 'day' || timeRange === 'week';
  const sourceData = useTransactions 
    ? userProgress.xpHistory || []
    : userProgress.dailySummaries || [];
  
  // Filter by date range
  const filteredData = sourceData.filter((item: any) => {
    const itemDate = new Date(item.date);
    return itemDate >= startDate;
  });
  
  // Group data by time period
  const groupedData = new Map<string, { date: Date; xp: number }>();
  
  for (const item of filteredData) {
    const date = new Date(item.date);
    const groupKey = getGroupKey(date, groupBy);
    
    // Category filtering
    if (category !== 'all') {
      if (useTransactions && (item as XpTransaction).category !== category) {
        continue;
      }
      if (!useTransactions && (item as XpDailySummary).categories[category] === 0) {
        continue;
      }
    }
    
    if (!groupedData.has(groupKey)) {
      groupedData.set(groupKey, { date, xp: 0 });
    }
    
    const group = groupedData.get(groupKey)!;
    
    if (useTransactions) {
      group.xp += (item as XpTransaction).amount;
    } else {
      const summary = item as XpDailySummary;
      group.xp += category === 'all' ? summary.totalXp : summary.categories[category];
    }
  }
  
  // Convert to sorted array with cumulative XP
  const sortedData = Array.from(groupedData.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  let cumulativeXp = 0;
  const result = sortedData.map(item => {
    cumulativeXp += item.xp;
    return {
      date: item.date.toISOString(),
      xp: item.xp,
      cumulativeXp,
    };
  });
  
  return {
    timeRange: timeRange === 'all' ? 'year' : timeRange,
    groupBy,
    data: result,
    totalXp: cumulativeXp,
    dataPoints: result.length,
  };
}

/**
 * Automatic history storage management
 * Called periodically to maintain optimal performance
 */
export async function manageHistoryStorage(
  userId: string | Types.ObjectId,
  options: {
    keepDetailedDays?: number;
    autoSummarize?: boolean;
    autoPurge?: boolean;
  } = {}
): Promise<{ summarized: number; purged: number }> {
  const {
    keepDetailedDays = 90,
    autoSummarize = true,
    autoPurge = true,
  } = options;
  
  let summarized = 0;
  let purged = 0;
  
  if (autoSummarize) {
    summarized = await buildAllDailySummaries(userId);
  }
  
  if (autoPurge) {
    const purgeThreshold = new Date();
    purgeThreshold.setDate(purgeThreshold.getDate() - keepDetailedDays);
    
    purged = await purgeOldHistory(userId, purgeThreshold, true);
  }
  
  return { summarized, purged };
}

/**
 * Get storage statistics for a user's history
 * Useful for maintenance decisions and user feedback
 */
export async function getHistoryStorageStats(userId: string | Types.ObjectId) {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const userProgress = await UserProgress.findOne({ userId: userObjectId })
    .select('xpHistory dailySummaries createdAt');
  
  if (!userProgress) {
    return null;
  }
  
  const transactions = userProgress.xpHistory || [];
  const summaries = userProgress.dailySummaries || [];
  
  // Calculate size estimates (rough)
  const transactionSize = transactions.length * 200; // ~200 bytes per transaction
  const summarySize = summaries.length * 350; // ~350 bytes per summary
  const totalSize = transactionSize + summarySize;
  
  // Find date range
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;
  
  if (transactions.length > 0) {
    const dates = transactions.map(tx => new Date(tx.date)).sort((a, b) => a.getTime() - b.getTime());
    earliestDate = dates[0];
    latestDate = dates[dates.length - 1];
  }
  
  return {
    transactions: {
      count: transactions.length,
      estimatedSize: `${(transactionSize / 1024).toFixed(1)} KB`,
    },
    summaries: {
      count: summaries.length,
      estimatedSize: `${(summarySize / 1024).toFixed(1)} KB`,
    },
    total: {
      estimatedSize: `${(totalSize / 1024).toFixed(1)} KB`,
    },
    dateRange: {
      earliest: earliestDate?.toISOString() || null,
      latest: latestDate?.toISOString() || null,
      spanDays: earliestDate && latestDate 
        ? Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    },
    recommendations: {
      shouldSummarize: transactions.length > 0 && summaries.length === 0,
      shouldPurge: transactions.length > 1000,
      nextAction: transactions.length > 1000 ? 'purge' : summaries.length === 0 ? 'summarize' : 'none',
    },
  };
}

// Helper functions

function getGroupKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
  switch (groupBy) {
    case 'day':
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    case 'week':
      const firstDayOfWeek = new Date(date);
      firstDayOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
      return firstDayOfWeek.toISOString().split('T')[0];
    case 'month':
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    default:
      return date.toISOString().split('T')[0];
  }
}