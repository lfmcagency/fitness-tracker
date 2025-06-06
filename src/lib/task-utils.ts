import { Types } from 'mongoose';
import { ITask } from '@/types/models/tasks';
import { awardTaskCompletionXp } from '@/lib/xp-manager-improved';
import { NextRequest } from 'next/server';
import { apiError } from '@/lib/api-utils';
import { TaskData, RecurrencePattern, TaskPriority } from '@/types';

/**
 * Convert a Task document to a TaskData object with date-specific completion status
 * @param task Task document from MongoDB
 * @param checkDate Date to check completion for (defaults to today)
 * @returns TaskData object with formatted fields
 */
export function convertTaskToTaskData(task: any, checkDate?: Date): TaskData {
  const targetDate = checkDate || new Date();
  
  // Check if task is completed on the target date
  const isCompletedOnDate = task.isCompletedOnDate ? task.isCompletedOnDate(targetDate) : false;
  
  return {
    id: task._id.toString(),
    name: task.name,
    scheduledTime: task.scheduledTime,
    completed: isCompletedOnDate, // Date-specific completion status
    date: task.date ? new Date(task.date).toISOString() : undefined,
    recurrencePattern: task.recurrencePattern as RecurrencePattern,
    customRecurrenceDays: task.customRecurrenceDays,
    currentStreak: task.currentStreak || 0,
    bestStreak: task.bestStreak || 0,
    lastCompletedDate: task.lastCompletedDate ? new Date(task.lastCompletedDate).toISOString() : null,
    category: task.category || 'general',
    priority: task.priority as TaskPriority || 'medium',
    user: task.user ? task.user.toString() : undefined,
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : undefined,
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : undefined,
    description: task.description,
    completionHistory: task.completionHistory ? task.completionHistory.map((date: Date) => date.toISOString()) : []
  };
}

/**
 * Check if a task is completed on a specific date
 * @param task Task object
 * @param date Date to check
 * @returns Boolean indicating if task is completed on the date
 */
export function isTaskCompletedOnDate(task: any, date: Date): boolean {
  if (!task.completionHistory || !Array.isArray(task.completionHistory)) {
    return false;
  }
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return task.completionHistory.some((completionDate: Date) => {
    const historyDate = new Date(completionDate);
    historyDate.setHours(0, 0, 0, 0);
    return historyDate.getTime() === checkDate.getTime();
  });
}

/**
 * Award XP for task completion and return results
 * @param userId User ID
 * @param task Task that was completed
 * @returns XP award result with level information
 */
export async function handleTaskXpAward(userId: string | Types.ObjectId, task: any) {
  // Award XP for completing the task
  const xpResult = await awardTaskCompletionXp(
    userId,
    task.name,
    task.currentStreak, 
    task.category
  );
  
  return {
    xpAwarded: xpResult.xpAdded,
    newLevel: xpResult.currentLevel,
    previousLevel: xpResult.previousLevel,
    leveledUp: xpResult.leveledUp,
    totalXp: xpResult.totalXp
  };
}

/**
 * Check if a task is due on a specific date
 * @param task Task object
 * @param date Date to check (defaults to today)
 * @returns Boolean indicating if task is due on the date
 */
export function isTaskDueOnDate(task: any, date?: Date): boolean {
  const checkDate = date || new Date();
  const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (task.recurrencePattern) {
    case 'once':
      // Task only occurs on its creation date
      const taskDate = new Date(task.date || task.createdAt);
      taskDate.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === checkDate.getTime();
      
    case 'daily':
      return true;
      
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
      
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
      
    case 'weekly':
      // If day of week matches the original creation day
      const originalDate = new Date(task.date || task.createdAt);
      return dayOfWeek === originalDate.getDay();
      
    case 'custom':
      // Check if current day is in the custom recurrence days
      return task.customRecurrenceDays?.includes(dayOfWeek) || false;
      
    default:
      return false;
  }
}

/**
 * Check if a task is due today
 * @param task Task object
 * @returns Boolean indicating if task is due today
 */
export function isTaskDueToday(task: any): boolean {
  return isTaskDueOnDate(task, new Date());
}

/**
 * Mark a task as completed, update streak, and award XP
 * @param userId User ID
 * @param task Task to mark as completed
 * @param date Date of completion (defaults to today)
 * @returns Updated task with updated streak
 */
export async function completeTask(userId: string | Types.ObjectId, task: any, date?: Date) {
  const completionDate = date || new Date();
  
  // Use the model method to complete the task for specific date
  task.completeTask(completionDate);
  
  // Award XP for task completion
  await awardTaskCompletionXp(
    userId,
    task.name,
    task.currentStreak,
    task.category
  );
  
  return await task.save();
}

/**
 * Mark a task as uncompleted for a specific date
 * @param task Task to mark as uncompleted
 * @param date Date to uncomplete (defaults to today)
 * @returns Updated task
 */
export async function uncompleteTask(task: any, date?: Date) {
  const targetDate = date || new Date();
  
  // Use the model method to uncomplete the task for specific date
  task.uncompleteTask(targetDate);
  
  return await task.save();
}

/**
 * Reset a task's completion status based on its recurrence pattern
 * @param task Task to reset
 * @returns Updated task with reset status
 */
export async function resetTaskForNewDay(task: any) {
  // With date-based completion, we don't need to reset daily
  // The completion status is determined by checking specific dates
  return task;
}

/**
 * Update task streaks based on completion history
 * @param task Task to update streak
 * @returns Updated task with adjusted streak
 */
export async function updateTaskStreak(task: any) {
  // Use the model method to recalculate streak
  const newStreak = task.calculateStreak();
  task.currentStreak = newStreak;
  
  return await task.save();
}

/**
 * Validate a task object from request body
 * @param body Request body
 * @returns Validation result
 */
export function validateTaskBody(body: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!body.name) {
    errors.push('Task name is required');
  }
  
  if (!body.scheduledTime) {
    errors.push('Scheduled time is required');
  }
  
  if (!body.recurrencePattern) {
    errors.push('Recurrence pattern is required');
  } else {
    // Validate recurrence pattern
    const validPatterns = ['once', 'daily', 'weekdays', 'weekends', 'weekly', 'custom'];
    if (!validPatterns.includes(body.recurrencePattern)) {
      errors.push(`Invalid recurrence pattern: ${body.recurrencePattern}`);
    }
    
    // If custom pattern, ensure days are provided
    if (body.recurrencePattern === 'custom' && 
        (!body.customRecurrenceDays || !Array.isArray(body.customRecurrenceDays) || 
         body.customRecurrenceDays.length === 0)) {
      errors.push('Custom recurrence pattern requires customRecurrenceDays array');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Extract and validate task ID from request
 * @param req Next.js request
 * @param params Route parameters
 * @returns Task ID or error response
 */
export function extractTaskId(req: NextRequest, params: { id: string }) {
  const id = params.id;
  
  // Validate ObjectId
  if (!Types.ObjectId.isValid(id)) {
    return apiError(`Invalid task ID: ${id}`, 400);
  }
  
  return id;
}