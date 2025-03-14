// src/app/api/progress/history/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress, { XpTransaction, XpDailySummary } from '@/models/UserProgress';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { ProgressCategory, isValidCategory } from '@/lib/category-progress';
import { Types } from 'mongoose';
import { HistoryResponseData } from '@/types/api/progressResponses'; // Use exact type

/**
 * GET /api/progress/history
 * Query parameters:
 * - timeRange: 'day' | 'week' | 'month' | 'year' | 'all' (default: 'month')
 * - groupBy: 'day' | 'week' | 'month' (default: 'day')
 * - category: 'core' | 'push' | 'pull' | 'legs' | 'all' (optional)
 */
export const GET = withAuth<HistoryResponseData>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }

    const url = new URL(req.url);

    const timeRangeParam = url.searchParams.get('timeRange');
    const groupByParam = url.searchParams.get('groupBy');
    const categoryParam = url.searchParams.get('category');

    const validTimeRanges: HistoryResponseData['timeRange'][] = ['day', 'week', 'month', 'year', 'all'];
    const timeRange = validTimeRanges.includes(timeRangeParam as any) ? (timeRangeParam as HistoryResponseData['timeRange']) : 'month';

    const validGroupBy: HistoryResponseData['groupBy'][] = ['day', 'week', 'month'];
    const groupBy = validGroupBy.includes(groupByParam as any) ? (groupByParam as HistoryResponseData['groupBy']) : 'day';

    let category: ProgressCategory | undefined;
    if (categoryParam && categoryParam !== 'all') {
      if (!isValidCategory(categoryParam)) {
        return apiError(`Invalid category: ${categoryParam}`, 400, 'ERR_INVALID_CATEGORY');
      }
      category = categoryParam as ProgressCategory;
    }

    const now = new Date();
    let startDate: Date = new Date(0); // Default to epoch
    switch (timeRange) {
      case 'day': startDate = new Date(now.setHours(0, 0, 0, 0)); break;
      case 'week': startDate = new Date(now.setDate(now.getDate() - 7)); break;
      case 'month': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
      case 'year': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
    }

    const userProgress = await UserProgress.findOne({ userId })
      .select('dailySummaries xpHistory');

    if (!userProgress) {
      return apiResponse<HistoryResponseData>({
        data: [],
        dataPoints: 0,
        totalXp: 0,
        timeRange,
        groupBy,
        category: categoryParam || 'all',
        dataSource: 'none',
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      }, true, 'No progress data found');
    }

    let sourceData: (XpTransaction | XpDailySummary)[] = [];
    let dataSource: HistoryResponseData['dataSource'] = 'none';
    const hasSummaries = Array.isArray(userProgress.dailySummaries) && userProgress.dailySummaries.length > 0;
    const hasHistory = Array.isArray(userProgress.xpHistory) && userProgress.xpHistory.length > 0;

    if ((timeRange === 'month' || timeRange === 'year' || timeRange === 'all') && hasSummaries) {
      sourceData = (userProgress.dailySummaries || []).filter((summary: { date: string | number | Date; }) => summary && summary.date && new Date(summary.date) >= startDate);
      dataSource = sourceData.length > 0 ? 'summaries' : 'none';
    }
    if (dataSource === 'none' && hasHistory) {
      sourceData = (userProgress.xpHistory || []).filter((tx: { date: string | number | Date; }) => tx && tx.date && new Date(tx.date) >= startDate);
      dataSource = sourceData.length > 0 ? 'transactions' : 'none';
    }

    if (dataSource === 'none') {
      return apiResponse<HistoryResponseData>({
        data: [],
        dataPoints: 0,
        totalXp: 0,
        timeRange,
        groupBy,
        category: categoryParam || 'all',
        dataSource,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      }, true, 'No data found for selected time range');
    }

    const groupedData: { [key: string]: { date: string; xp: number; totalXp: number } } = {};
    let cumulativeXp = 0;

    if (dataSource === 'summaries') {
      for (const summary of sourceData as XpDailySummary[]) {
        if (!summary || !summary.date) continue;
        const date = new Date(summary.date);
        const groupKey = formatDateForGrouping(date, groupBy);
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = { date: formatDateForDisplay(date, groupBy), xp: 0, totalXp: 0 };
        }
        const xpToAdd = categoryParam === 'all'
          ? (summary.totalXp || 0)
          : (summary.categories && typeof summary.categories[category as ProgressCategory] === 'number'
            ? summary.categories[category as ProgressCategory]
            : (summary.totalXp || 0));
        groupedData[groupKey].xp += xpToAdd;
        cumulativeXp += xpToAdd;
        groupedData[groupKey].totalXp = cumulativeXp;
      }
    } else if (dataSource === 'transactions') {
      for (const tx of sourceData as XpTransaction[]) {
        if (!tx || !tx.date || (category && tx.category !== category)) continue;
        const date = new Date(tx.date);
        const groupKey = formatDateForGrouping(date, groupBy);
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = { date: formatDateForDisplay(date, groupBy), xp: 0, totalXp: 0 };
        }
        const xpToAdd = tx.amount || 0;
        groupedData[groupKey].xp += xpToAdd;
      }
      const sortedKeys = Object.keys(groupedData).sort();
      for (const key of sortedKeys) {
        cumulativeXp += groupedData[key].xp;
        groupedData[key].totalXp = cumulativeXp;
      }
    }

    const result = Object.values(groupedData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return apiResponse<HistoryResponseData>({
      data: result,
      dataPoints: result.length,
      totalXp: cumulativeXp,
      timeRange,
      groupBy,
      category: categoryParam || 'all',
      dataSource,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    }, true, 'Progress history retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving progress history');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * Helper functions
 */
function formatDateForGrouping(date: Date, groupBy: HistoryResponseData['groupBy']): string {
  if (!date || isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  switch (groupBy) {
    case 'day': return date.toISOString().split('T')[0];
    case 'week': {
      const firstDay = new Date(date);
      const day = date.getDay();
      firstDay.setDate(date.getDate() - day);
      return firstDay.toISOString().split('T')[0];
    }
    case 'month': return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    default: return date.toISOString().split('T')[0];
  }
}

function formatDateForDisplay(date: Date, groupBy: HistoryResponseData['groupBy']): string {
  if (!date || isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  switch (groupBy) {
    case 'day': return date.toISOString().split('T')[0];
    case 'week': {
      const firstDay = new Date(date);
      const day = date.getDay();
      firstDay.setDate(date.getDate() - day);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      return `${firstDay.toISOString().split('T')[0]} - ${lastDay.toISOString().split('T')[0]}`;
    }
    case 'month': return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    default: return date.toISOString().split('T')[0];
  }
}