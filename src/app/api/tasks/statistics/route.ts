// src/app/api/tasks/statistics/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { TaskWithHistory, DomainCategory } from '@/types';
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
 * Returns statistics about user's tasks with enhanced filtering
 */
export const GET = withAuth<TaskStatistics>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse query parameters
      const url = new URL(req.url);
      
      // Validate period parameter
      let period = 'month';
      const periodParam = url.searchParams.get('period');
      if (periodParam && ['day', 'week', 'month', 'year', 'all'].includes(periodParam)) {
        period = periodParam;
      }
      
      // Parse date parameters
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
      
      // NEW: Organization filters
      const domainCategory = url.searchParams.get('domainCategory') as DomainCategory;
      if (domainCategory && !['ethos', 'trophe', 'soma'].includes(domainCategory)) {
        return apiError('Invalid domain category. Must be ethos, trophe, or soma.', 400, 'ERR_INVALID_DOMAIN_CATEGORY');
      }
      
      const labelsParam = url.searchParams.get('labels');
      const isSystemTaskParam = url.searchParams.get('isSystemTask');
      
      const includeTrend = url.searchParams.get('trend') === 'true';
      
      console.log('📊 [STATS] Query parameters:', {
        period,
        fromDate: fromDate?.toISOString(),
        toDate: toDate.toISOString(),
        category,
        domainCategory,
        labelsParam,
        isSystemTaskParam,
        includeTrend
      });
      
      // Build query to get user's tasks
      const query: any = { user: userId };
      
      // Add category filter if provided
      if (category && category.trim() !== '') {
        query.category = category;
      }
      
      // NEW: Add organization filters
      if (domainCategory) {
        query.domainCategory = domainCategory;
      }
      
      if (labelsParam && typeof labelsParam === 'string') {
        const labels = labelsParam.split(',').map(l => l.trim()).filter(l => l.length > 0);
        if (labels.length > 0) {
          query.labels = { $in: labels };
        }
      }
      
      if (isSystemTaskParam !== null) {
        query.isSystemTask = isSystemTaskParam === 'true';
      }
      
      console.log('🔍 [STATS] Database query:', query);
      
      // Get all tasks for this user matching filters
      const tasks = await Task.find(query) as ITask[];
      
      if (!Array.isArray(tasks)) {
        return apiResponse(createEmptyStatistics());
      }
      
      console.log(`📈 [STATS] Found ${tasks.length} tasks for statistics`);
      
      // Convert tasks to the format needed for statistics
      const tasksWithHistory = tasks.map(convertToTaskWithHistory);
      
      // Calculate statistics based on the period
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t && (t.totalCompletions > 0)).length; // UPDATED: Use totalCompletions
      const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
      
      console.log('🧮 [STATS] Basic calculations:', {
        totalTasks,
        completedTasks,
        completionRate: completionRate * 100
      });
      
      // Get streak summary (simplified with new architecture)
      const streaks = getStreakSummary(tasksWithHistory);
      
      // Get category distribution 
      const categoryDistribution = getCategoryDistribution(tasksWithHistory);
      
      // NEW: Enhanced statistics with domain category breakdown
      const domainStats = calculateDomainStatistics(tasks);
      
      // Set up basic structure for TaskStatistics
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
        mostFrequentlyCompleted: getMostCompletedTasks(tasks),
        leastFrequentlyCompleted: getLeastCompletedTasks(tasks),
        overallCompletionRate: completionRate * 100,
        // NEW: Add domain statistics
        domainBreakdown: domainStats
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
      
      console.log('✅ [STATS] Statistics calculation complete');
      
      return apiResponse(statistics);
    } catch (error) {
      console.error('💥 [STATS] Error in statistics endpoint:', error);
      return handleApiError(error, 'Error fetching task statistics');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * NEW: Calculate domain category statistics
 */
function calculateDomainStatistics(tasks: ITask[]) {
  const domainStats: Record<string, any> = {};
  
  for (const domain of ['ethos', 'trophe', 'soma']) {
    const domainTasks = tasks.filter(task => task.domainCategory === domain);
    const totalCompletions = domainTasks.reduce((sum, task) => sum + (task.totalCompletions || 0), 0);
    const averageStreak = domainTasks.length > 0 
      ? domainTasks.reduce((sum, task) => sum + (task.currentStreak || 0), 0) / domainTasks.length 
      : 0;
    
    domainStats[domain] = {
      totalTasks: domainTasks.length,
      totalCompletions,
      averageStreak: Math.round(averageStreak * 100) / 100,
      mostActiveTask: domainTasks.length > 0 
        ? domainTasks.reduce((prev, current) => 
            (current.totalCompletions || 0) > (prev.totalCompletions || 0) ? current : prev
          ).name
        : null
    };
  }
  
  return domainStats;
}

/**
 * UPDATED: Get most completed tasks using totalCompletions
 */
function getMostCompletedTasks(tasks: ITask[], limit: number = 5) {
  return tasks
    .filter(task => task.totalCompletions > 0)
    .sort((a, b) => (b.totalCompletions || 0) - (a.totalCompletions || 0))
    .slice(0, limit)
    .map(task => ({
      taskId: task._id.toString(),
      taskName: task.name,
      category: task.category || 'uncategorized',
      completedCount: task.totalCompletions || 0,
      priority: task.priority,
      domainCategory: task.domainCategory, // NEW
      labels: task.labels || [] // NEW
    }));
}

/**
 * UPDATED: Get least completed tasks using totalCompletions
 */
function getLeastCompletedTasks(tasks: ITask[], limit: number = 5) {
  const activeTasks = tasks.filter(task => task.totalCompletions > 0);
  
  return activeTasks
    .sort((a, b) => (a.totalCompletions || 0) - (b.totalCompletions || 0))
    .slice(0, limit)
    .map(task => ({
      taskId: task._id.toString(),
      taskName: task.name,
      category: task.category || 'uncategorized',
      completedCount: task.totalCompletions || 0,
      priority: task.priority,
      domainCategory: task.domainCategory, // NEW
      labels: task.labels || [] // NEW
    }));
}

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
    overallCompletionRate: 0,
    domainBreakdown: {
      ethos: { totalTasks: 0, totalCompletions: 0, averageStreak: 0, mostActiveTask: null },
      trophe: { totalTasks: 0, totalCompletions: 0, averageStreak: 0, mostActiveTask: null },
      soma: { totalTasks: 0, totalCompletions: 0, averageStreak: 0, mostActiveTask: null }
    }
  };
}