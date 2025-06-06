import { ITask } from '@/types/models/tasks';
import { TaskWithHistory, TaskData } from '../index';
import { convertTaskToTaskData } from '@/lib/task-utils';

/**
 * Convert ITask to TaskWithHistory with defensive error handling
 */
export function convertToTaskWithHistory(task: ITask): TaskWithHistory {
  if (!task) {
    return {
      id: '',
      name: 'Unknown task',
      completed: false,
      completionHistory: [],
      recurrencePattern: 'daily', // Default value for required field
      currentStreak: 0,
      bestStreak: 0,
      category: 'general',
      priority: 'medium',
      scheduledTime: '00:00', // Default value for required field
      description: undefined
    };
  }
  
  try {
    const taskData = convertTaskToTaskData(task);
    
    return {
      ...taskData,
      completionHistory: Array.isArray(task.completionHistory)
        ? task.completionHistory.map(date => 
            date instanceof Date ? date.toISOString() : String(date)
          )
        : []
    };
  } catch (error) {
    console.error(`Error converting task ${task._id} to TaskWithHistory:`, error);
    
    // Provide fallback with basic properties
    return {
      id: task._id?.toString() || '',
      name: task.name || 'Unknown task',
      completed: !!task.completed,
      recurrencePattern: task.recurrencePattern || 'daily',
      currentStreak: task.currentStreak || 0,
      bestStreak: task.bestStreak || 0,
      category: task.category || 'general',
      priority: task.priority || 'medium',
      scheduledTime: task.scheduledTime || '00:00',
      completionHistory: Array.isArray(task.completionHistory)
        ? task.completionHistory.map(date => date instanceof Date ? date.toISOString() : String(date))
        : [],
      description: undefined
    };
  }
}