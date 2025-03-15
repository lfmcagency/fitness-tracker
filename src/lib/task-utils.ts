import { Types } from 'mongoose';
import { ITask } from '@/types/models/tasks';
import { awardTaskCompletionXp } from '@/lib/xp-manager-improved';
import { NextRequest } from 'next/server';
import { apiError } from '@/lib/api-utils';
import { EnhancedTask, RecurrencePattern, TaskPriority } from '@/types';

/**
 * Convert a Task document to an EnhancedTask object
 * @param task Task document from MongoDB
 * @returns EnhancedTask object with formatted fields
 */
export function convertTaskToEnhancedTask(task: any): EnhancedTask {
  return {
    id: task._id.toString(),
    name: task.name,
    scheduledTime: task.scheduledTime,
    completed: task.completed,
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
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : undefined
  };
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
 * Check if a task is due today
 * @param task Task object
 * @returns Boolean indicating if task is due today
 */
export function isTaskDueToday(task: any): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (task.recurrencePattern) {
    case 'daily':
      return true;
      
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
      
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
      
    case 'weekly':
      // If day of week matches the original creation day
      const taskDate = new Date(task.createdAt);
      return dayOfWeek === taskDate.getDay();
      
    case 'custom':
      // Check if current day is in the custom recurrence days
      return task.customRecurrenceDays?.includes(dayOfWeek) || false;
      
    default:
      return false;
  }
}

/**
 * Mark a task as completed, update streak, and award XP
 * @param userId User ID
 * @param task Task to mark as completed
 * @returns Updated task with updated streak
 */
export async function completeTask(userId: string | Types.ObjectId, task: any) {
  // Update completion status
  task.completed = true;
  task.lastCompletedDate = new Date();
  
  // Increment streak if applicable
  task.currentStreak += 1;
  
  // Update highest streak if applicable
  if (task.currentStreak > task.bestStreak) {
    task.bestStreak = task.currentStreak;
  }
  
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
 * Reset a task's completion status based on its recurrence pattern
 * @param task Task to reset
 * @returns Updated task with reset status
 */
export async function resetTaskForNewDay(task: any) {
  if (task.completed) {
    task.completed = false;
    
    // Don't reset streak, it will be handled based on missed days
    return await task.save();
  }
  
  return task;
}

/**
 * Update task streaks based on last completed date
 * @param task Task to update streak
 * @returns Updated task with adjusted streak
 */
export async function updateTaskStreak(task: any) {
  if (!task.lastCompletedDate) {
    task.currentStreak = 0;
    return task;
  }
  
  const lastCompleted = new Date(task.lastCompletedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get yesterday's date
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  // Last completion was yesterday or today, streak is still going
  if (lastCompleted >= yesterday) {
    return task;
  }
  
  // More than a day has passed, reset streak
  task.currentStreak = 0;
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
    const validPatterns = ['daily', 'weekdays', 'weekends', 'weekly', 'custom'];
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