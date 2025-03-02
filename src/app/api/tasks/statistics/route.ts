// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { getAuth } from '@/lib/auth';
import { ApiResponse, TaskWithHistory } from '@/types';
import { convertTaskToEnhancedTask } from '../task-utils';
import {
  getTaskStatistics,
  getPerformanceTrend,
  calculateDailyCompletionRate,
  calculateWeeklyCompletionRate,
  calculateMonthlyCompletionRate,
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
 * 
 * Query parameters:
 * - period: 'day', 'week', 'month', 'year' (default: 'month')
 * - from: ISO date string for start date
 * - to: ISO date string for end date (default: now)
 * - category: Filter statistics by category
 * - trend: If 'true', include trend data
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
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
    
    // If we have a user session, get real statistics
    if (session?.user?.id) {
      // Basic query to get user's tasks
      const query: any = { user: session.user.id };
      
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
      
      return NextResponse.json<ApiResponse<TaskStatistics>>({
        success: true,
        data: statistics
      });
    }
    
    // Mock response for development without authentication
    // Return mock statistics
    const mockStatistics: TaskStatistics = {
      completionRates: {
        daily: {
          total: 24,
          completed: 19,
          rate: 79.2,
          period: 'daily'
        },
        weekly: {
          total: 120,
          completed: 95,
          rate: 79.2,
          period: 'weekly'
        },
        monthly: {
          total: 480,
          completed: 380,
          rate: 79.2,
          period: 'monthly'
        },
        yearly: {
          total: 5840,
          completed: 4600,
          rate: 79.2,
          period: 'yearly'
        },
        allTime: {
          total: 5840,
          completed: 4600,
          rate: 79.2,
          period: 'all-time'
        }
      },
      streaks: {
        currentStreaks: {
          average: 4.5,
          highest: {
            value: 14,
            taskId: 'mock-task-1',
            taskName: 'Mock Task with Best Streak'
          },
          lowest: {
            value: 0,
            taskId: 'mock-task-2',
            taskName: 'Mock Task with No Streak'
          }
        },
        bestStreaks: {
          average: 8.5,
          highest: {
            value: 24,
            taskId: 'mock-task-3',
            taskName: 'Mock Task with All-Time Best Streak'
          }
        }
      },
      categoryDistribution: [
        { 
          category: 'fitness', 
          count: 8, 
          completedCount: 7,
          completionRate: 87.5
        },
        { 
          category: 'work', 
          count: 6, 
          completedCount: 4,
          completionRate: 66.7
        },
        { 
          category: 'personal', 
          count: 10, 
          completedCount: 8,
          completionRate: 80.0
        }
      ],
      mostFrequentlyCompleted: [
        { 
          taskId: 'mock-task-4', 
          taskName: 'Daily Exercise', 
          category: 'fitness',
          completedCount: 65, 
          priority: 'high'
        },
        { 
          taskId: 'mock-task-5', 
          taskName: 'Meditation', 
          category: 'personal',
          completedCount: 58, 
          priority: 'medium'
        },
        { 
          taskId: 'mock-task-6', 
          taskName: 'Reading', 
          category: 'personal',
          completedCount: 42, 
          priority: 'low'
        }
      ],
      leastFrequentlyCompleted: [
        { 
          taskId: 'mock-task-7', 
          taskName: 'Inbox Zero', 
          category: 'work',
          completedCount: 2, 
          priority: 'low'
        },
        { 
          taskId: 'mock-task-8', 
          taskName: 'Weekly Review', 
          category: 'work',
          completedCount: 4, 
          priority: 'medium'
        },
        { 
          taskId: 'mock-task-9', 
          taskName: 'Deep Work Session', 
          category: 'work',
          completedCount: 6, 
          priority: 'high'
        }
      ],
      overallCompletionRate: 79.2
    };
    
    // Add mock trend data if requested
    if (includeTrend) {
      mockStatistics.trend = [
        { date: '2023-01-01', completed: 3, total: 5 },
        { date: '2023-01-02', completed: 4, total: 5 },
        { date: '2023-01-03', completed: 2, total: 5 },
        { date: '2023-01-04', completed: 5, total: 5 },
        { date: '2023-01-05', completed: 4, total: 5 },
        { date: '2023-01-06', completed: 3, total: 5 },
        { date: '2023-01-07', completed: 5, total: 5 }
      ];
    }
    
    return NextResponse.json<ApiResponse<TaskStatistics>>({
      success: true,
      data: mockStatistics
    });
  } catch (error) {
    console.error('Error in GET /api/tasks/statistics:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error fetching task statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}