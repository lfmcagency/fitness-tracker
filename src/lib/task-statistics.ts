import { TaskData, TaskWithHistory, DomainCategory } from '@/types';

/**
 * SIMPLIFIED Task Statistics - Compatible with existing API
 * Uses simple counters, eliminates expensive calculations
 */

export interface TaskCompletionRate {
  total: number;
  completed: number;
  rate: number; // 0-100
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time';
  startDate?: string;
  endDate?: string;
}

export interface TaskStreakSummary {
  currentStreaks: {
    average: number;
    highest: { value: number; taskId: string; taskName: string };
    lowest: { value: number; taskId: string; taskName: string };
  };
  bestStreaks: {
    average: number;
    highest: { value: number; taskId: string; taskName: string };
  };
}

export interface CategoryDistribution {
  category: string;
  count: number;
  completedCount: number;
  completionRate: number;
}

export interface TaskFrequency {
  taskId: string;
  taskName: string;
  category: string;
  completedCount: number;
  priority: string;
  domainCategory?: DomainCategory;
  labels?: string[];
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
  overallCompletionRate: number;
  domainBreakdown?: Record<string, any>;
  trend?: any[];
}

/**
 * SIMPLIFIED: Basic completion rate - no expensive date calculations
 */
function createBasicCompletionRate(
  tasks: TaskData[], 
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time'
): TaskCompletionRate {
  const total = tasks.length;
  const completed = tasks.filter(t => (t.totalCompletions || 0) > 0).length;
  const rate = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    total,
    completed,
    rate: Math.round(rate * 100) / 100,
    period,
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString()
  };
}

/**
 * STUBBED: Daily completion rate (simplified)
 */
export function calculateDailyCompletionRate(tasks: TaskWithHistory[], date: Date): TaskCompletionRate {
  const taskData = tasks.map(t => t as TaskData);
  return createBasicCompletionRate(taskData, 'daily');
}

/**
 * STUBBED: Weekly completion rate (simplified)
 */
export function calculateWeeklyCompletionRate(tasks: TaskWithHistory[], weekStartDate: Date): TaskCompletionRate {
  const taskData = tasks.map(t => t as TaskData);
  return createBasicCompletionRate(taskData, 'weekly');
}

/**
 * STUBBED: Monthly completion rate (simplified)
 */
export function calculateMonthlyCompletionRate(tasks: TaskWithHistory[], month: number, year: number): TaskCompletionRate {
  const taskData = tasks.map(t => t as TaskData);
  return createBasicCompletionRate(taskData, 'monthly');
}

/**
 * STUBBED: Yearly completion rate (simplified)
 */
export function calculateYearlyCompletionRate(tasks: TaskWithHistory[], year: number): TaskCompletionRate {
  const taskData = tasks.map(t => t as TaskData);
  return createBasicCompletionRate(taskData, 'yearly');
}

/**
 * STUBBED: All-time completion rate (simplified)
 */
export function calculateAllTimeCompletionRate(tasks: TaskWithHistory[]): TaskCompletionRate {
  const taskData = tasks.map(t => t as TaskData);
  return createBasicCompletionRate(taskData, 'all-time');
}

/**
 * SIMPLIFIED: Streak summary using simple counters
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
  
  // Current streaks
  const streaks = tasks.map(t => t.currentStreak || 0);
  const avgStreak = streaks.reduce((sum, s) => sum + s, 0) / tasks.length;
  const maxStreakTask = tasks.reduce((max, task) => 
    (task.currentStreak || 0) > (max.currentStreak || 0) ? task : max
  );
  const minStreakTask = tasks.reduce((min, task) => 
    (task.currentStreak || 0) < (min.currentStreak || 0) ? task : min
  );
  
  // Best streaks (using totalCompletions as estimate)
  const bestStreaks = tasks.map(t => Math.max(t.currentStreak || 0, t.totalCompletions || 0));
  const avgBest = bestStreaks.reduce((sum, s) => sum + s, 0) / tasks.length;
  const maxBestTask = tasks.reduce((max, task) => {
    const maxBest = Math.max(max.currentStreak || 0, max.totalCompletions || 0);
    const taskBest = Math.max(task.currentStreak || 0, task.totalCompletions || 0);
    return taskBest > maxBest ? task : max;
  });
  
  return {
    currentStreaks: {
      average: Math.round(avgStreak * 100) / 100,
      highest: {
        value: maxStreakTask.currentStreak || 0,
        taskId: String(maxStreakTask.id || ''),
        taskName: maxStreakTask.name
      },
      lowest: {
        value: minStreakTask.currentStreak || 0,
        taskId: String(minStreakTask.id || ''),
        taskName: minStreakTask.name
      }
    },
    bestStreaks: {
      average: Math.round(avgBest * 100) / 100,
      highest: {
        value: Math.max(maxBestTask.currentStreak || 0, maxBestTask.totalCompletions || 0),
        taskId: String(maxBestTask.id || ''),
        taskName: maxBestTask.name
      }
    }
  };
}

/**
 * SIMPLIFIED: Category distribution using totalCompletions
 */
export function getCategoryDistribution(tasks: TaskData[]): CategoryDistribution[] {
  const categoryMap = new Map<string, { count: number; completedCount: number }>();
  
  tasks.forEach(task => {
    const category = task.category || 'uncategorized';
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { count: 0, completedCount: 0 });
    }
    
    const stats = categoryMap.get(category)!;
    stats.count++;
    
    if ((task.totalCompletions || 0) > 0) {
      stats.completedCount++;
    }
  });
  
  return Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    count: stats.count,
    completedCount: stats.completedCount,
    completionRate: stats.count > 0 ? (stats.completedCount / stats.count) * 100 : 0
  })).sort((a, b) => b.count - a.count);
}

/**
 * SIMPLIFIED: Most completed tasks using totalCompletions
 */
export function getMostFrequentlyCompletedTasks(tasks: TaskWithHistory[], limit: number = 5): TaskFrequency[] {
  return tasks
    .filter(task => (task.totalCompletions || 0) > 0)
    .sort((a, b) => (b.totalCompletions || 0) - (a.totalCompletions || 0))
    .slice(0, limit)
    .map(task => ({
      taskId: String(task.id || ''),
      taskName: task.name,
      category: task.category || 'uncategorized',
      completedCount: task.totalCompletions || 0,
      priority: task.priority || 'medium',
      domainCategory: task.domainCategory,
      labels: task.labels
    }));
}

/**
 * SIMPLIFIED: Least completed tasks (with some activity)
 */
export function getLeastFrequentlyCompletedTasks(tasks: TaskWithHistory[], limit: number = 5): TaskFrequency[] {
  const activeTasks = tasks.filter(task => (task.totalCompletions || 0) > 0);
  
  return activeTasks
    .sort((a, b) => (a.totalCompletions || 0) - (b.totalCompletions || 0))
    .slice(0, limit)
    .map(task => ({
      taskId: String(task.id || ''),
      taskName: task.name,
      category: task.category || 'uncategorized',
      completedCount: task.totalCompletions || 0,
      priority: task.priority || 'medium',
      domainCategory: task.domainCategory,
      labels: task.labels
    }));
}

/**
 * SIMPLIFIED: Performance trend - basic domain breakdown
 */
export function getPerformanceTrend(
  tasks: TaskWithHistory[], 
  period: string = 'week',
  fromDate?: Date,
  toDate: Date = new Date()
): any[] {
  const domains = ['ethos', 'trophe', 'soma'];
  
  return domains.map(domain => {
    const domainTasks = tasks.filter(t => t.domainCategory === domain);
    const totalCompletions = domainTasks.reduce((sum, t) => sum + (t.totalCompletions || 0), 0);
    
    return {
      domain,
      date: toDate.toISOString().split('T')[0],
      totalTasks: domainTasks.length,
      completed: totalCompletions,
      total: domainTasks.length
    };
  });
}