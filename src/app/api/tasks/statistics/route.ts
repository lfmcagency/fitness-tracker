// src/app/api/tasks/statistics/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { TaskWithHistory } from '@/types';
import { convertToTaskWithHistory } from '@/types/converters/taskConverters';
import {
  TaskStatistics,
  getPerformanceTrend,
  calculateDailyCompletionRate,
  calculateWeeklyCompletionRate,
  calculateMonthlyCompletionRate,
  calculateYearlyCompletionRate,
  calculateAllTimeCompletionRate,
  getStreakSummary,
  getCategoryDistribution
} from '@/lib/task-statistics';

/**
 * GET /api/tasks/statistics
 * 
 * Returns statistics about user's tasks
 */
export const GET = withAuth<TaskStatistics>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse query parameters with defensive checks
      const url = new URL(req.url);
      
      // Validate period parameter
      let period = 'month';
      const periodParam = url.searchParams.get('period');
      if (periodParam && ['day', 'week', 'month', 'year', 'all'].includes(periodParam)) {
        period = periodParam;
      }
      
      // Parse date parameters with defensive error handling
      let fromDate: Date | undefined = undefined;
      const fromParam = url.searchParams.get('from');
      if (fromParam) {
        const parsedFromDate = new Date(fromParam);
        if (!isNaN(parsedFromDate.getTime())) {
          fromDate = parsedFromDate;
        } else {
          return apiError('Invalid from date format', 400, 'ERR_INVALID_DATE');
        }
      }
      
      let toDate = new Date();
      const toParam = url.searchParams.get('to');
      if (toParam) {
        const parsedToDate = new Date(toParam);
        if (!isNaN(parsedToDate.getTime())) {
          toDate = parsedToDate;
        } else {
          return apiError('Invalid to date format', 400, 'ERR_INVALID_DATE');
        }
      }
      
      // Validate category parameter
      const category = url.searchParams.get('category');
      if (category && (typeof category !== 'string' || category.trim() === '')) {
        return apiError('Invalid category parameter', 400, 'ERR_INVALID_CATEGORY');
      }
      
      const includeTrend = url.searchParams.get('trend') === 'true';
      
      // Basic query to get user's tasks
      const query: any = { user: userId };
      
      // Add category filter if provided
      if (category && category.trim() !== '') {
        query.category = category;
      }
      
      // Get all tasks for this user with defensive error handling
      const tasks = await Task.find(query) as ITask[];
      
      if (!Array.isArray(tasks)) {
        return apiResponse(createEmptyStatistics());
      }
      
      // Convert tasks to the format needed for statistics with defensive error handling
      const tasksWithHistory = tasks.map(convertToTaskWithHistory);
      
      // Calculate statistics based on the period with defensive error handling
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t && t.completed).length;
      const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
      
      // Get streak summary with defensive error handling
      const streaks = getStreakSummary(tasksWithHistory);
      
      // Get category distribution with defensive error handling
      const categoryDistribution = getCategoryDistribution(tasksWithHistory);
      
      // Set up basic structure for TaskStatistics with defensive defaults
      const statistics: TaskStatistics = {
        completionRates: {
          daily: {
            total: totalTasks,
            completed: completedTasks,
            rate: completionRate * 100,
            period: 'daily'
          },
          weekly: {
            total: totalTasks,
            completed: completedTasks,
            rate: completionRate * 100,
            period: 'weekly'
          },
          monthly: {
            total: totalTasks,
            completed: completedTasks,
            rate: completionRate * 100,
            period: 'monthly'
          },
          yearly: {
            total: totalTasks,
            completed: completedTasks,
            rate: completionRate * 100,
            period: 'yearly'
          },
          allTime: {
            total: totalTasks,
            completed: completedTasks,
            rate: completionRate * 100,
            period: 'all-time'
          }
        },
        streaks,
        categoryDistribution,
        mostFrequentlyCompleted: [], // Empty but required by interface
        leastFrequentlyCompleted: [], // Empty but required by interface
        overallCompletionRate: completionRate * 100
      };
      
      // Fill in more detailed completion rates based on the requested period
      try {
        if (period === 'day') {
          const dailyRateInfo = calculateDailyCompletionRate(tasksWithHistory, toDate);
          if (dailyRateInfo) {
            statistics.completionRates.daily = dailyRateInfo;
          }
        } else if (period === 'week') {
          const weekStartDate = fromDate || new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000); 
          const weeklyRateInfo = calculateWeeklyCompletionRate(tasksWithHistory, weekStartDate);
          if (weeklyRateInfo) {
            statistics.completionRates.weekly = weeklyRateInfo;
          }
        } else if (period === 'month') {
          // For month - extract month and year from date
          const month = toDate.getMonth();
          const year = toDate.getFullYear();
          const monthlyRateInfo = calculateMonthlyCompletionRate(tasksWithHistory, month, year);
          if (monthlyRateInfo) {
            statistics.completionRates.monthly = monthlyRateInfo;
          }
        }
        
        // Also calculate yearly and all-time rates
        const yearlyRateInfo = calculateYearlyCompletionRate(tasksWithHistory, toDate.getFullYear());
        if (yearlyRateInfo) {
          statistics.completionRates.yearly = yearlyRateInfo;
        }
        
        const allTimeRateInfo = calculateAllTimeCompletionRate(tasksWithHistory);
        if (allTimeRateInfo) {
          statistics.completionRates.allTime = allTimeRateInfo;
        }
      } catch (error) {
        console.error(`Error calculating completion rates:`, error);
        // Continue with default values rather than failing
      }
      
      // Add trend data if requested
      if (includeTrend) {
        try {
          const trend = getPerformanceTrend(tasksWithHistory, period, fromDate, toDate);
          if (trend) {
            statistics.trend = trend;
          }
        } catch (error) {
          console.error('Error calculating performance trend:', error);
          // Continue without trend data
        }
      }
      
      return apiResponse(statistics);
    } catch (error) {
      return handleApiError(error, 'Error fetching task statistics');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * Create empty statistics structure for cases with no data
 */
function createEmptyStatistics(): TaskStatistics {
  return {
    completionRates: {
      daily: { total: 0, completed: 0, rate: 0, period: 'daily' },
      weekly: { total: 0, completed: 0, rate: 0, period: 'weekly' },
      monthly: { total: 0, completed: 0, rate: 0, period: 'monthly' },
      yearly: { total: 0, completed: 0, rate: 0, period: 'yearly' },
      allTime: { total: 0, completed: 0, rate: 0, period: 'all-time' }
    },
    streaks: {
      currentStreaks: {
        average: 0,
        highest: { value: 0, taskId: '', taskName: '' },
        lowest: { value: 0, taskId: '', taskName: '' }
      },
      bestStreaks: {
        average: 0,
        highest: { value: 0, taskId: '', taskName: '' }
      }
    },
    categoryDistribution: [],
    mostFrequentlyCompleted: [],
    leastFrequentlyCompleted: [],
    overallCompletionRate: 0
  };
}