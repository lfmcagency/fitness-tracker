export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { TaskWithHistory } from '@/types';
import { convertTaskToEnhancedTask } from '@/lib/task-utils';
import {
  getPerformanceTrend,
  calculateDailyCompletionRate,
  calculateWeeklyCompletionRate,
  calculateMonthlyCompletionRate,
  calculateYearlyCompletionRate,
  calculateAllTimeCompletionRate,
  getStreakSummary,
  getCategoryDistribution,
  TaskStatistics
} from '@/lib/task-statistics';

/**
 * Convert ITask to TaskWithHistory
 */
function convertToTaskWithHistory(task: ITask): TaskWithHistory {
  const enhancedTask = convertTaskToEnhancedTask(task);
  return {
    ...enhancedTask,
    completionHistory: task.completionHistory.map(date => date.toISOString())
  };
}

/**
 * GET /api/tasks/statistics
 * 
 * Returns statistics about user's tasks
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Parse query parameters
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'month';
    const fromDate = url.searchParams.get('from') 
      ? new Date(url.searchParams.get('from')!) 
      : undefined;
    const toDate = url.searchParams.get('to') 
      ? new Date(url.searchParams.get('to')!) 
      : new Date();
    const category = url.searchParams.get('category') || undefined;
    const includeTrend = url.searchParams.get('trend') === 'true';
    
    // Basic query to get user's tasks
    const query: any = { user: userId };
    
    // Add category filter if provided
    if (category) {
      query.category = category;
    }
    
    // Get all tasks for this user
    const tasks = await Task.find(query) as ITask[];
    
    // Convert tasks to the format needed for statistics
    const tasksWithHistory = tasks.map(convertToTaskWithHistory);
    
    // Calculate statistics based on the period
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const streaks = getStreakSummary(tasksWithHistory);
    const categoryDistribution = getCategoryDistribution(tasksWithHistory);
    
    // Set up basic structure for TaskStatistics
    let statistics: TaskStatistics = {
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
      mostFrequentlyCompleted: [], // Empty for now but required by interface
      leastFrequentlyCompleted: [], // Empty for now but required by interface
      overallCompletionRate: completionRate * 100
    };
    
    // Fill in more detailed completion rates based on the requested period
    if (period === 'day') {
      const dailyRateInfo = calculateDailyCompletionRate(tasksWithHistory, toDate);
      statistics.completionRates.daily = dailyRateInfo;
    } else if (period === 'week') {
      const weekStartDate = fromDate || new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
      const weeklyRateInfo = calculateWeeklyCompletionRate(tasksWithHistory, weekStartDate);
      statistics.completionRates.weekly = weeklyRateInfo;
    } else {
      // For month - extract month and year from date
      const month = toDate.getMonth();
      const year = toDate.getFullYear();
      const monthlyRateInfo = calculateMonthlyCompletionRate(tasksWithHistory, month, year);
      statistics.completionRates.monthly = monthlyRateInfo;
    }
    
    // Also calculate yearly and all-time rates
    const yearlyRateInfo = calculateYearlyCompletionRate(tasksWithHistory, toDate.getFullYear());
    statistics.completionRates.yearly = yearlyRateInfo;
    
    const allTimeRateInfo = calculateAllTimeCompletionRate(tasksWithHistory);
    statistics.completionRates.allTime = allTimeRateInfo;
    
    // Add trend data if requested
    if (includeTrend) {
      statistics.trend = getPerformanceTrend(tasksWithHistory, period, fromDate, toDate);
    }
    
    return apiResponse(statistics);
  } catch (error) {
    return handleApiError(error, 'Error fetching task statistics');
  }
}, AuthLevel.DEV_OPTIONAL);