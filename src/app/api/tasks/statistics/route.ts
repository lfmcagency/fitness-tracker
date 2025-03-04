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
 * Convert ITask to TaskWithHistory with defensive error handling
 */
function convertToTaskWithHistory(task: ITask): TaskWithHistory {
  if (!task) {
    return {
      id: '',
      name: 'Unknown task',
      completed: false,
      completionHistory: []
    };
  }
  
  try {
    const enhancedTask = convertTaskToEnhancedTask(task);
    
    return {
      ...enhancedTask,
      completionHistory: Array.isArray(task.completionHistory)
        ? task.completionHistory.map(date => 
            date instanceof Date ? date.toISOString() : String(date)
          )
        : []
    };
  } catch (error) {
    console.error(`Error converting task ${task._id} to TaskWithHistory:`, error);
    
    // Provide fallback with basic properties
    return {
      id: task._id?.toString() || '',
      name: task.name || 'Unknown task',
      completed: !!task.completed,
      completionHistory: Array.isArray(task.completionHistory)
        ? task.completionHistory.map(date => 
            date instanceof Date ? date.toISOString() : String(date)
          )
        : []
    };
  }
}

/**
 * GET /api/tasks/statistics
 * 
 * Returns statistics about user's tasks
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
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
    let tasks: ITask[] = [];
    try {
      tasks = await Task.find(query) as ITask[];
    } catch (error) {
      return handleApiError(error, 'Error querying tasks database');
    }
    
    if (!Array.isArray(tasks)) {
      tasks = [];
    }
    
    // Convert tasks to the format needed for statistics with defensive error handling
    let tasksWithHistory: TaskWithHistory[] = [];
    try {
      tasksWithHistory = tasks.map(convertToTaskWithHistory);
    } catch (error) {
      console.error('Error converting tasks to TaskWithHistory:', error);
      // Continue with empty array
    }
    
    // Calculate statistics based on the period with defensive error handling
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t && t.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    // Get streak summary with defensive error handling
    let streaks = { 
      longestStreak: 0, 
      currentStreak: 0, 
      averageStreak: 0 
    };
    try {
      streaks = getStreakSummary(tasksWithHistory);
    } catch (error) {
      console.error('Error getting streak summary:', error);
      // Continue with default values
    }
    
    // Get category distribution with defensive error handling
    let categoryDistribution: Record<string, number> = {};
    try {
      categoryDistribution = getCategoryDistribution(tasksWithHistory);
    } catch (error) {
      console.error('Error getting category distribution:', error);
      // Continue with empty object
    }
    
    // Set up basic structure for TaskStatistics with defensive defaults
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
      mostFrequentlyCompleted: [], // Empty but required by interface
      leastFrequentlyCompleted: [], // Empty but required by interface
      overallCompletionRate: completionRate * 100
    };
    
    // Fill in more detailed completion rates based on the requested period
    // with defensive error handling for each calculation
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
    } catch (error) {
      console.error(`Error calculating ${period} completion rate:`, error);
      // Continue with default values
    }
    
    // Also calculate yearly and all-time rates with defensive error handling
    try {
      const yearlyRateInfo = calculateYearlyCompletionRate(tasksWithHistory, toDate.getFullYear());
      if (yearlyRateInfo) {
        statistics.completionRates.yearly = yearlyRateInfo;
      }
    } catch (error) {
      console.error('Error calculating yearly completion rate:', error);
      // Continue with default values
    }
    
    try {
      const allTimeRateInfo = calculateAllTimeCompletionRate(tasksWithHistory);
      if (allTimeRateInfo) {
        statistics.completionRates.allTime = allTimeRateInfo;
      }
    } catch (error) {
      console.error('Error calculating all-time completion rate:', error);
      // Continue with default values
    }
    
    // Add trend data if requested with defensive error handling
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
}, AuthLevel.DEV_OPTIONAL);