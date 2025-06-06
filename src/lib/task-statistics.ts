import { TaskData, TaskWithHistory } from '@/types';

/**
 * Task Statistics Interfaces
 */
export interface TaskCompletionRate {
  total: number;
  completed: number;
  rate: number; // Value between 0-100
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time';
  startDate?: string;
  endDate?: string;
}

export interface TaskStreakSummary {
  currentStreaks: {
    average: number;
    highest: {
      value: number;
      taskId: string | number;
      taskName: string;
    };
    lowest: {
      value: number;
      taskId: string | number;
      taskName: string;
    };
  };
  bestStreaks: {
    average: number;
    highest: {
      value: number;
      taskId: string | number;
      taskName: string;
    };
  };
}

export interface CategoryDistribution {
  category: string;
  count: number;
  completedCount: number;
  completionRate: number; // Value between 0-100
}

export interface TaskFrequency {
  taskId: string | number;
  taskName: string;
  category: string;
  completedCount: number;
  priority: string;
}

export interface TaskStatistics {
  completionRates: {
    daily: TaskCompletionRate;
    weekly: TaskCompletionRate;
    monthly: TaskCompletionRate;
    yearly: TaskCompletionRate;
    allTime: TaskCompletionRate;
  };
  streaks: TaskStreakSummary;
  categoryDistribution: CategoryDistribution[];
  mostFrequentlyCompleted: TaskFrequency[];
  leastFrequentlyCompleted: TaskFrequency[];
  overallCompletionRate: number; // Value between 0-100
  trend?: any[]; // For trending data over time
}

/**
 * Helper Functions for Date Manipulation
 */

/**
 * Get the start of a day (midnight)
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a day (23:59:59.999)
 */
export function getEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of a week (Sunday)
 */
export function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0 is Sunday
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a week (Saturday 23:59:59.999)
 */
export function getEndOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0 is Sunday
  result.setDate(result.getDate() + (6 - day));
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of a month
 */
export function getStartOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a month
 */
export function getEndOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0); // Last day of previous month
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of a year
 */
export function getStartOfYear(date: Date): Date {
  const result = new Date(date);
  result.setMonth(0, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a year
 */
export function getEndOfYear(date: Date): Date {
  const result = new Date(date);
  result.setMonth(11, 31);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if a task is due on a specific date based on its recurrence pattern
 */
export function isTaskDueOnDate(task: TaskData, date: Date): boolean {
  const checkDate = new Date(date);
  const dayOfWeek = checkDate.getDay(); // 0-6 (Sunday-Saturday)
  
  switch (task.recurrencePattern) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
      // If the task creation date's day of week matches the check date's day of week
      const taskDate = new Date(task.date as string);
      return taskDate.getDay() === dayOfWeek;
    case 'custom':
      return task.customRecurrenceDays?.includes(dayOfWeek) || false;
    default:
      return false;
  }
}

/**
 * Check if a task was completed on a specific date
 */
export function wasTaskCompletedOnDate(task: TaskWithHistory, date: Date): boolean {
  const startOfDay = getStartOfDay(date);
  const endOfDay = getEndOfDay(date);
  
  return task.completionHistory.some(completionDate => {
    const completionDateTime = new Date(completionDate);
    return completionDateTime >= startOfDay && completionDateTime <= endOfDay;
  });
}

/**
 * Calculate percentage of tasks completed for a day
 */
export function calculateDailyCompletionRate(tasks: TaskWithHistory[], date: Date): TaskCompletionRate {
  const dayStart = getStartOfDay(date);
  const dayEnd = getEndOfDay(date);
  
  // Filter tasks that were due on this date based on their recurrence pattern
  const dueTasks = tasks.filter(task => {
    // Skip tasks created after this date
    const taskCreatedAt = task.createdAt ? new Date(task.createdAt) : new Date(task.date as string);
    if (taskCreatedAt > dayEnd) return false;
    
    return isTaskDueOnDate(task, date);
  });
  
  // Count completed tasks (those with a completion record within this day)
  const completedTasks = dueTasks.filter(task => wasTaskCompletedOnDate(task, date));
  
  const total = dueTasks.length;
  const completed = completedTasks.length;
  const rate = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    total,
    completed,
    rate,
    period: 'daily',
    startDate: dayStart.toISOString(),
    endDate: dayEnd.toISOString()
  };
}

/**
 * Calculate weekly completion rate
 */
export function calculateWeeklyCompletionRate(tasks: TaskWithHistory[], weekStartDate: Date): TaskCompletionRate {
  const weekStart = getStartOfWeek(weekStartDate);
  const weekEnd = getEndOfWeek(weekStartDate);
  
  let totalDueTaskCount = 0;
  let totalCompletedTaskCount = 0;
  
  // Calculate for each day in the week
  const currentDate = new Date(weekStart);
  while (currentDate <= weekEnd) {
    const dailyRate = calculateDailyCompletionRate(tasks, currentDate);
    totalDueTaskCount += dailyRate.total;
    totalCompletedTaskCount += dailyRate.completed;
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const rate = totalDueTaskCount > 0 ? (totalCompletedTaskCount / totalDueTaskCount) * 100 : 0;
  
  return {
    total: totalDueTaskCount,
    completed: totalCompletedTaskCount,
    rate,
    period: 'weekly',
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString()
  };
}

/**
 * Calculate monthly completion rate
 */
export function calculateMonthlyCompletionRate(tasks: TaskWithHistory[], month: number, year: number): TaskCompletionRate {
  // Create a date for the first day of the specified month
  const monthStart = new Date(year, month, 1);
  const monthEnd = getEndOfMonth(monthStart);
  
  let totalDueTaskCount = 0;
  let totalCompletedTaskCount = 0;
  
  // Calculate for each day in the month
  const currentDate = new Date(monthStart);
  while (currentDate <= monthEnd) {
    const dailyRate = calculateDailyCompletionRate(tasks, currentDate);
    totalDueTaskCount += dailyRate.total;
    totalCompletedTaskCount += dailyRate.completed;
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const rate = totalDueTaskCount > 0 ? (totalCompletedTaskCount / totalDueTaskCount) * 100 : 0;
  
  return {
    total: totalDueTaskCount,
    completed: totalCompletedTaskCount,
    rate,
    period: 'monthly',
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString()
  };
}

/**
 * Calculate yearly completion rate
 */
export function calculateYearlyCompletionRate(tasks: TaskWithHistory[], year: number): TaskCompletionRate {
  // Create a date for the first day of the year
  const yearStart = new Date(year, 0, 1);
  const yearEnd = getEndOfYear(yearStart);
  
  let totalDueTaskCount = 0;
  let totalCompletedTaskCount = 0;
  
  // Calculate for each month in the year
  for (let month = 0; month < 12; month++) {
    const monthlyRate = calculateMonthlyCompletionRate(tasks, month, year);
    totalDueTaskCount += monthlyRate.total;
    totalCompletedTaskCount += monthlyRate.completed;
  }
  
  const rate = totalDueTaskCount > 0 ? (totalCompletedTaskCount / totalDueTaskCount) * 100 : 0;
  
  return {
    total: totalDueTaskCount,
    completed: totalCompletedTaskCount,
    rate,
    period: 'yearly',
    startDate: yearStart.toISOString(),
    endDate: yearEnd.toISOString()
  };
}

/**
 * Calculate all-time completion rate
 */
export function calculateAllTimeCompletionRate(tasks: TaskWithHistory[]): TaskCompletionRate {
  // Find the earliest task creation date
  let earliestDate = new Date();
  tasks.forEach(task => {
    const taskDate = task.createdAt ? new Date(task.createdAt) : new Date(task.date as string);
    if (taskDate < earliestDate) {
      earliestDate = taskDate;
    }
  });
  
  // Calculate from earliest date to today
  const today = new Date();
  
  let totalDueTaskCount = 0;
  let totalCompletedTaskCount = 0;
  
  // Calculate for each day from earliest date to today
  const currentDate = new Date(earliestDate);
  while (currentDate <= today) {
    const dailyRate = calculateDailyCompletionRate(tasks, currentDate);
    totalDueTaskCount += dailyRate.total;
    totalCompletedTaskCount += dailyRate.completed;
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const rate = totalDueTaskCount > 0 ? (totalCompletedTaskCount / totalDueTaskCount) * 100 : 0;
  
  return {
    total: totalDueTaskCount,
    completed: totalCompletedTaskCount,
    rate,
    period: 'all-time',
    startDate: earliestDate.toISOString(),
    endDate: today.toISOString()
  };
}

/**
 * Get summary of current and best streaks across all tasks
 */
export function getStreakSummary(tasks: TaskData[]): TaskStreakSummary {
  if (tasks.length === 0) {
    return {
      currentStreaks: {
        average: 0,
        highest: { value: 0, taskId: '', taskName: '' },
        lowest: { value: 0, taskId: '', taskName: '' }
      },
      bestStreaks: {
        average: 0,
        highest: { value: 0, taskId: '', taskName: '' }
      }
    };
  }
  
  // Calculate current streak stats
  let currentStreakSum = 0;
  let highestCurrentStreak = { value: 0, taskId: '' as string | number, taskName: '' };
  let lowestCurrentStreak = { value: Number.MAX_SAFE_INTEGER, taskId: '' as string | number, taskName: '' };
  
  // Calculate best streak stats
  let bestStreakSum = 0;
  let highestBestStreak = { value: 0, taskId: '' as string | number, taskName: '' };
  
  tasks.forEach(task => {
    // Current streak stats
    currentStreakSum += task.currentStreak;
    
    if (task.currentStreak > highestCurrentStreak.value) {
      highestCurrentStreak = {
        value: task.currentStreak,
        taskId: task.id || '',
        taskName: task.name
      };
    }
    
    if (task.currentStreak < lowestCurrentStreak.value) {
      lowestCurrentStreak = {
        value: task.currentStreak,
        taskId: task.id || '',
        taskName: task.name
      };
    }
    
    // Best streak stats
    bestStreakSum += task.bestStreak;
    
    if (task.bestStreak > highestBestStreak.value) {
      highestBestStreak = {
        value: task.bestStreak,
        taskId: task.id || '',
        taskName: task.name
      };
    }
  });
  
  // If all tasks have a current streak of 0, set lowest to 0
  if (lowestCurrentStreak.value === Number.MAX_SAFE_INTEGER) {
    lowestCurrentStreak = { value: 0, taskId: '', taskName: '' };
  }
  
  return {
    currentStreaks: {
      average: tasks.length > 0 ? currentStreakSum / tasks.length : 0,
      highest: highestCurrentStreak,
      lowest: lowestCurrentStreak
    },
    bestStreaks: {
      average: tasks.length > 0 ? bestStreakSum / tasks.length : 0,
      highest: highestBestStreak
    }
  };
}

/**
 * Get task category distribution
 */
export function getCategoryDistribution(tasks: TaskData[]): CategoryDistribution[] {
  const categoryMap = new Map<string, { count: number, completedCount: number }>();
  
  // Count tasks by category
  tasks.forEach(task => {
    const category = task.category || 'uncategorized';
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { count: 0, completedCount: 0 });
    }
    
    const categoryStats = categoryMap.get(category)!;
    categoryStats.count++;
    
    if (task.completed) {
      categoryStats.completedCount++;
    }
  });
  
  // Convert map to array and calculate completion rates
  const distribution: CategoryDistribution[] = [];
  
  categoryMap.forEach((stats, category) => {
    distribution.push({
      category,
      count: stats.count,
      completedCount: stats.completedCount,
      completionRate: stats.count > 0 ? (stats.completedCount / stats.count) * 100 : 0
    });
  });
  
  // Sort by count (descending)
  return distribution.sort((a, b) => b.count - a.count);
}

/**
 * Get most frequently completed tasks
 */
export function getMostFrequentlyCompletedTasks(tasks: TaskWithHistory[], limit: number = 5): TaskFrequency[] {
  const taskFrequencies: TaskFrequency[] = tasks.map(task => ({
    taskId: task.id || task._id || '',
    taskName: task.name,
    category: task.category || 'uncategorized',
    completedCount: task.completionHistory.length,
    priority: task.priority
  }));
  
  // Sort by completed count (descending)
  return taskFrequencies
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, limit);
}

/**
 * Get least frequently completed tasks (excluding those with zero completions)
 */
export function getLeastFrequentlyCompletedTasks(tasks: TaskWithHistory[], limit: number = 5): TaskFrequency[] {
  const activeTasks = tasks.filter(task => task.completionHistory.length > 0);
  
  const taskFrequencies: TaskFrequency[] = activeTasks.map(task => ({
    taskId: task.id || task._id || '',
    taskName: task.name,
    category: task.category || 'uncategorized',
    completedCount: task.completionHistory.length,
    priority: task.priority
  }));
  
  // Sort by completed count (ascending)
  return taskFrequencies
    .sort((a, b) => a.completedCount - b.completedCount)
    .slice(0, limit);
}

/**
 * Get comprehensive task statistics
 */
export function getTaskStatistics(tasks: TaskWithHistory[]): TaskStatistics {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Calculate completion rates for different time periods
  const dailyRate = calculateDailyCompletionRate(tasks, today);
  const weeklyRate = calculateWeeklyCompletionRate(tasks, today);
  const monthlyRate = calculateMonthlyCompletionRate(tasks, currentMonth, currentYear);
  const yearlyRate = calculateYearlyCompletionRate(tasks, currentYear);
  const allTimeRate = calculateAllTimeCompletionRate(tasks);
  
  // Get streak summary
  const streakSummary = getStreakSummary(tasks);
  
  // Get category distribution
  const categoryDistribution = getCategoryDistribution(tasks);
  
  // Get frequently completed tasks
  const mostFrequentlyCompleted = getMostFrequentlyCompletedTasks(tasks);
  const leastFrequentlyCompleted = getLeastFrequentlyCompletedTasks(tasks);
  
  return {
    completionRates: {
      daily: dailyRate,
      weekly: weeklyRate,
      monthly: monthlyRate,
      yearly: yearlyRate,
      allTime: allTimeRate
    },
    streaks: streakSummary,
    categoryDistribution,
    mostFrequentlyCompleted,
    leastFrequentlyCompleted,
    overallCompletionRate: allTimeRate.rate
  };
}

/**
 * Get a performance summary based on the requested period
 */
export function getPerformanceTrend(tasks: TaskWithHistory[], period: string = 'day', fromDate?: Date, toDate: Date = new Date()): any[] {
  // Default response based on daily trend
  if (period === 'day') {
    const days = 7; // Default to one week of data
    const result: any[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(toDate);
      date.setDate(date.getDate() - i);
      
      const dailyRate = calculateDailyCompletionRate(tasks, date);
      result.push({
        date: dailyRate.startDate?.split('T')[0],
        completed: dailyRate.completed,
        total: dailyRate.total
      });
    }
    
    return result;
  } else if (period === 'week') {
    // Weekly data
    const weeks = 4; // Last 4 weeks
    const result: any[] = [];
    
    for (let i = weeks - 1; i >= 0; i--) {
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() - (i * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      
      const weeklyRate = calculateWeeklyCompletionRate(tasks, startDate);
      result.push({
        date: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        completed: weeklyRate.completed,
        total: weeklyRate.total
      });
    }
    
    return result;
  } else if (period === 'month') {
    // Monthly data
    const months = 6; // Last 6 months
    const result: any[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(toDate);
      date.setMonth(date.getMonth() - i);
      
      const monthlyRate = calculateMonthlyCompletionRate(tasks, date.getMonth(), date.getFullYear());
      result.push({
        date: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        completed: monthlyRate.completed,
        total: monthlyRate.total
      });
    }
    
    return result;
  } else if (period === 'year') {
    // Show yearly data for the past 3 years
    const years = 3;
    const result: any[] = [];
    
    for (let i = years - 1; i >= 0; i--) {
      const year = toDate.getFullYear() - i;
      const yearlyRate = calculateYearlyCompletionRate(tasks, year);
      
      result.push({
        date: year.toString(),
        completed: yearlyRate.completed,
        total: yearlyRate.total
      });
    }
    
    return result;
  }
  
  // Default case, return empty array
  return [];
}