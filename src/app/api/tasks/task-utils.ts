import { ITask } from '@/models/Task';
import { EnhancedTask } from '@/types';
import { awardTaskCompletionXp } from '@/lib/xp-manager';

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

/**
 * Award XP to user when a task is completed
 * @param userId - User ID
 * @param task - Completed task
 * @returns XP award result with level up information
 */
export const handleTaskXpAward = async (userId: string, task: ITask) => {
  try {
    // Only award XP if the task has a streakCount and was just completed
    if (task.completed && task.currentStreak > 0) {
      const xpResult = await awardTaskCompletionXp(
        userId,
        task.name,
        task.category,
        task.currentStreak
      );
      
      return {
        success: true,
        xpAwarded: xpResult.leveledUp 
          ? `Awarded ${xpResult.currentXp - xpResult.previousLevel} XP! Level up to ${xpResult.newLevel}!` 
          : `Awarded XP! ${xpResult.xpToNextLevel} XP until next level.`,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel
      };
    }
    
    return { success: false, xpAwarded: 0 };
  } catch (error) {
    console.error('Error awarding XP for task completion:', error);
    return { 
      success: false, 
      error: 'Failed to award XP'
    };
  }
};