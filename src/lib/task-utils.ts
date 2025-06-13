import { TaskData } from '@/types';
import { ITask } from '@/types/models/tasks';

/**
 * Pure task utilities - no XP awarding, just task logic
 * XP is now handled by the event system (Ethos -> Progress)
 */

/**
 * Convert database task to API format
 * Clean converter with defensive programming
 */
export function convertTaskToTaskData(task: ITask): TaskData {
  if (!task) {
    throw new Error('Task is required for conversion');
  }

  // Defensive access to nested properties
  const completionHistory = Array.isArray(task.completionHistory) ? task.completionHistory : [];
  const lastCompletion = completionHistory.length > 0 ? completionHistory[completionHistory.length - 1] : null;
  
  return {
    id: task._id.toString(),
    name: task.name || '',
    scheduledTime: task.scheduledTime || '',
    completed: task.completed || false,
    date: task.date ? task.date.toISOString() : new Date().toISOString(),
    completionHistory: completionHistory.map(date => date.toISOString()),
    lastCompleted: lastCompletion?.toISOString() || null,
    streak: task.streak || 0,
    totalCompletions: task.totalCompletions || 0,
    user: task.user.toString(),
    recurrencePattern: task.recurrencePattern || 'once',
    priority: task.priority || 'medium',
    timeBlock: task.timeBlock || 'morning',
    isSystemTask: task.isSystemTask || false,
    description: task.description || '',
    labels: Array.isArray(task.labels) ? task.labels : [],
    createdAt: task.createdAt ? task.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: task.updatedAt ? task.updatedAt.toISOString() : new Date().toISOString(),
  };
}

/**
 * Check if task is due on a specific date based on recurrence pattern
 * Pure date logic, no side effects
 */
export function isTaskDueOnDate(task: ITask, targetDate: Date): boolean {
  if (!task || !targetDate) return false;
  
  const taskDate = new Date(task.date);
  const target = new Date(targetDate);
  
  // Normalize dates to midnight UTC for comparison
  taskDate.setUTCHours(0, 0, 0, 0);
  target.setUTCHours(0, 0, 0, 0);
  
  switch (task.recurrencePattern) {
    case 'once':
      return taskDate.getTime() === target.getTime();
      
    case 'daily':
      return target >= taskDate;
      
    case 'weekdays':
      if (target < taskDate) return false;
      const weekday = target.getUTCDay();
      return weekday >= 1 && weekday <= 5; // Monday-Friday
      
    case 'weekends':
      if (target < taskDate) return false;
      const weekend = target.getUTCDay();
      return weekend === 0 || weekend === 6; // Sunday or Saturday
      
    case 'weekly':
      if (target < taskDate) return false;
      const daysDiff = Math.floor((target.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff % 7 === 0;
      
    case 'custom':
      // For custom patterns, check if target date matches any completion pattern
      // This is a simplified version - you might want more complex logic
      return target >= taskDate;
      
    default:
      return false;
  }
}

/**
 * Calculate streak count for a task on a specific date
 * Pure calculation, no database updates
 */
export function calculateTaskStreak(task: ITask, targetDate: Date): number {
  if (!task || !task.completionHistory || task.completionHistory.length === 0) {
    return 0;
  }
  
  const completions = [...task.completionHistory]
    .map(date => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime()); // Newest first
  
  const target = new Date(targetDate);
  target.setUTCHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = new Date(target);
  
  for (const completion of completions) {
    const completionDate = new Date(completion);
    completionDate.setUTCHours(0, 0, 0, 0);
    
    if (completionDate.getTime() === currentDate.getTime()) {
      streak++;
      // Move to previous expected completion date based on pattern
      currentDate = getPreviousExpectedDate(currentDate, task.recurrencePattern);
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
}

/**
 * Get the previous expected completion date based on recurrence pattern
 * Helper for streak calculation
 */
function getPreviousExpectedDate(currentDate: Date, pattern: string): Date {
  const prevDate = new Date(currentDate);
  
  switch (pattern) {
    case 'daily':
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      break;
      
    case 'weekdays':
      // Skip to previous weekday
      do {
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      } while (prevDate.getUTCDay() === 0 || prevDate.getUTCDay() === 6);
      break;
      
    case 'weekends':
      // Skip to previous weekend day
      do {
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      } while (prevDate.getUTCDay() !== 0 && prevDate.getUTCDay() !== 6);
      break;
      
    case 'weekly':
      prevDate.setUTCDate(prevDate.getUTCDate() - 7);
      break;
      
    default:
      // For 'once' and 'custom', just go back one day
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      break;
  }
  
  return prevDate;
}

/**
 * Check if a task completion hits a milestone threshold
 * Pure calculation for milestone detection
 */
export function checkTaskMilestone(totalCompletions: number, streakCount: number): {
  completionMilestone: string | null;
  streakMilestone: string | null;
} {
  const completionMilestones = [50, 100, 250, 500, 1000];
  const streakMilestones = [7, 30, 100, 365];
  
  let completionMilestone: string | null = null;
  let streakMilestone: string | null = null;
  
  // Check completion milestones
  for (const milestone of completionMilestones) {
    if (totalCompletions === milestone) {
      completionMilestone = `${milestone}_completions`;
      break;
    }
  }
  
  // Check streak milestones
  for (const milestone of streakMilestones) {
    if (streakCount === milestone) {
      streakMilestone = `${milestone}_day_streak`;
      break;
    }
  }
  
  return { completionMilestone, streakMilestone };
}

/**
 * Determine if a task is a system task (connected to other domains)
 * Helper for identifying cross-domain tasks
 */
export function isSystemTask(task: ITask): boolean {
  return task.isSystemTask || false;
}

/**
 * Get the appropriate time block for a task
 * Helper for task organization
 */
export function getTaskTimeBlock(task: ITask): 'morning' | 'afternoon' | 'evening' {
  if (!task.timeBlock) return 'morning';
  
  const validTimeBlocks = ['morning', 'afternoon', 'evening'];
  return validTimeBlocks.includes(task.timeBlock) ? task.timeBlock as any : 'morning';
}

/**
 * Validate task data for creation/updates
 * Pure validation logic
 */
export function validateTaskData(data: Partial<TaskData>): string[] {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Task name is required');
  }
  
  if (data.name && data.name.length > 100) {
    errors.push('Task name must be less than 100 characters');
  }
  
  if (data.scheduledTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.scheduledTime)) {
    errors.push('Scheduled time must be in HH:MM format');
  }
  
  const validPriorities = ['low', 'medium', 'high'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    errors.push('Priority must be low, medium, or high');
  }
  
  const validTimeBlocks = ['morning', 'afternoon', 'evening'];
  if (data.timeBlock && !validTimeBlocks.includes(data.timeBlock)) {
    errors.push('Time block must be morning, afternoon, or evening');
  }
  
  const validPatterns = ['once', 'daily', 'weekdays', 'weekends', 'weekly', 'custom'];
  if (data.recurrencePattern && !validPatterns.includes(data.recurrencePattern)) {
    errors.push('Invalid recurrence pattern');
  }
  
  return errors;
}