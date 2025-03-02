import { ITask } from '@/models/Task';
import { EnhancedTask } from '@/types';

/**
 * Utility function to convert ITask to EnhancedTask
 * Safely handles MongoDB _id field with proper type checking
 */
export const convertTaskToEnhancedTask = (task: ITask): EnhancedTask => {
  // Safely extract the MongoDB document ID
  const taskId = task._id ? task._id.toString() : '';
  
  // Get timestamps from MongoDB document if available
  // Need to use any type since these properties are added by the timestamps option in schema
  const anyTask = task as any;
  const createdAt = anyTask.createdAt ? anyTask.createdAt.toISOString() : undefined;
  const updatedAt = anyTask.updatedAt ? anyTask.updatedAt.toISOString() : undefined;
  
  return {
    _id: taskId,
    id: taskId,
    name: task.name,
    scheduledTime: task.scheduledTime,
    completed: task.completed,
    date: task.date,
    recurrencePattern: task.recurrencePattern,
    customRecurrenceDays: task.customRecurrenceDays,
    currentStreak: task.currentStreak,
    bestStreak: task.bestStreak,
    lastCompletedDate: task.lastCompletedDate,
    category: task.category,
    priority: task.priority,
    user: task.user ? task.user.toString() : '',
    createdAt: createdAt,
    updatedAt: updatedAt
  };
};