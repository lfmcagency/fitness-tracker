export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { ProgressHistoryData } from '@/types/api/progressResponses';
import { Types } from 'mongoose';

export const GET = withAuth<ProgressHistoryData>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }

    const url = new URL(req.url);
    const timeRange = (url.searchParams.get('timeRange') || 'month') as ProgressHistoryData['timeRange'];
    const groupBy = (url.searchParams.get('groupBy') || 'day') as ProgressHistoryData['groupBy'];
    const category = url.searchParams.get('category') || 'all';

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

    const userProgress = await UserProgress.findOne({ userId })
      .select('xpHistory dailySummaries');

    if (!userProgress) {
      return apiResponse<ProgressHistoryData>({
        timeRange,
        groupBy,
        data: [],
        totalXp: 0,
        dataPoints: 0,
      });
    }

    // Use summaries for longer periods, transactions for shorter
    const useTransactions = timeRange === 'day' || timeRange === 'week';
    const sourceData = useTransactions 
      ? userProgress.xpHistory || []
      : userProgress.dailySummaries || [];

    // Filter by date and category
    const filteredData = sourceData.filter((item: any) => {
      const itemDate = new Date(item.date);
      const inRange = itemDate >= startDate;
      const matchesCategory = category === 'all' || !item.category || item.category === category;
      return inRange && matchesCategory;
    });

    // Group data by time period
    const groupedData = new Map<string, { date: string; xp: number; cumulativeXp: number }>();
    let cumulativeXp = 0;

    for (const item of filteredData) {
      const date = new Date(item.date);
      const groupKey = formatDateForGrouping(date, groupBy);
      
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          date: formatDateForDisplay(date, groupBy),
          xp: 0,
          cumulativeXp: 0,
        });
      }
      
      const group = groupedData.get(groupKey)!;
      const xpToAdd = useTransactions 
        ? ('amount' in item ? item.amount : 0) 
        : ('totalXp' in item ? item.totalXp : 0);
      group.xp += xpToAdd;
    }

    // Calculate cumulative XP and sort
    const result = Array.from(groupedData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => {
        cumulativeXp += item.xp;
        return { ...item, cumulativeXp };
      });

    const responseData: ProgressHistoryData = {
      timeRange,
      groupBy,
      data: result,
      totalXp: cumulativeXp,
      dataPoints: result.length,
    };

    return apiResponse(responseData);
  } catch (error) {
    return handleApiError(error, 'Error retrieving progress history');
  }
}, AuthLevel.DEV_OPTIONAL);

// Helper functions
function formatDateForGrouping(date: Date, groupBy: ProgressHistoryData['groupBy']): string {
  switch (groupBy) {
    case 'day': 
      return date.toISOString().split('T')[0];
    case 'week': {
      const firstDay = new Date(date);
      firstDay.setDate(date.getDate() - date.getDay());
      return firstDay.toISOString().split('T')[0];
    }
    case 'month': 
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    default: 
      return date.toISOString().split('T')[0];
  }
}

function formatDateForDisplay(date: Date, groupBy: ProgressHistoryData['groupBy']): string {
  switch (groupBy) {
    case 'day': 
      return date.toISOString().split('T')[0];
    case 'week': {
      const firstDay = new Date(date);
      firstDay.setDate(date.getDate() - date.getDay());
      return `Week of ${firstDay.toISOString().split('T')[0]}`;
    }
    case 'month': 
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    default: 
      return date.toISOString().split('T')[0];
  }
}