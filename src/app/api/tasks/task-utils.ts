import { ITask } from '@/models/Task';
import { EnhancedTask } from '@/types';

/**
 * Utility function to convert ITask to EnhancedTask
 * Safely handles MongoDB _id field with proper type checking
 */
export const convertTaskToEnhancedTask = (task: ITask): EnhancedTask => {
  const taskId = task._id ? task._id.toString() : '';
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
    createdAt: task.createdAt?.toISOString(),
    updatedAt: task.updatedAt?.toISOString()
  };
};