import { ITask } from '@/types/models/tasks';
import { TaskWithHistory, TaskData, TaskEventData, DomainCategory } from '../index';

/**
 * Convert ITask to TaskData with new architecture fields
 */
export function convertTaskToTaskData(task: ITask, checkDate?: Date): TaskData {
  if (!task) {
    throw new Error('Task is required for conversion');
  }

  // Defensive access to nested properties
  const completionHistory = Array.isArray(task.completionHistory) ? task.completionHistory : [];
  const lastCompleted = task.lastCompletedDate?.toISOString() || null;
  
  // NEW: Handle date-specific completion checking
  const isCompletedForDate = checkDate ? task.isCompletedOnDate(checkDate) : task.completed;
  
  return {
    id: task._id.toString(),
    name: task.name || '',
    description: task.description || '',
    scheduledTime: task.scheduledTime || '00:00',
    completed: isCompletedForDate || false,
    date: task.date ? task.date.toISOString() : new Date().toISOString(),
    recurrencePattern: task.recurrencePattern || 'once',
    customRecurrenceDays: task.customRecurrenceDays || [],
    
    // NEW: Simple counters from model
    currentStreak: task.currentStreak || 0,
    totalCompletions: task.totalCompletions || 0,
    lastCompleted,
    
    // NEW: Organization fields
    domainCategory: task.domainCategory || 'ethos',
    labels: Array.isArray(task.labels) ? [...task.labels] : [],
    isSystemTask: task.isSystemTask || false,
    
    // Existing fields
    category: task.category || 'general',
    priority: task.priority || 'medium',
    timeBlock: getTimeBlockFromScheduledTime(task.scheduledTime),
    user: task.user?.toString(),
    createdAt: task.createdAt ? task.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: task.updatedAt ? task.updatedAt.toISOString() : new Date().toISOString(),
    
    // DEPRECATED: Keep for compatibility
    bestStreak: Math.max(task.currentStreak || 0, task.totalCompletions || 0), // Rough estimate
    completionHistory: completionHistory.map(date => date.toISOString()),
    lastCompletedDate: lastCompleted,
  };
}

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
      recurrencePattern: 'once', // Updated default
      currentStreak: 0,
      totalCompletions: 0, // NEW
      category: 'general',
      priority: 'medium',
      scheduledTime: '00:00',
      domainCategory: 'ethos', // NEW
      labels: [], // NEW
      isSystemTask: false, // NEW
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
      recurrencePattern: task.recurrencePattern || 'once',
      currentStreak: task.currentStreak || 0,
      totalCompletions: task.totalCompletions || 0, // NEW
      category: task.category || 'general',
      priority: task.priority || 'medium',
      scheduledTime: task.scheduledTime || '00:00',
      domainCategory: task.domainCategory || 'ethos', // NEW
      labels: Array.isArray(task.labels) ? [...task.labels] : [], // NEW
      isSystemTask: task.isSystemTask || false, // NEW
      completionHistory: Array.isArray(task.completionHistory)
        ? task.completionHistory.map(date => date instanceof Date ? date.toISOString() : String(date))
        : [],
      description: task.description || undefined
    };
  }
}

/**
 * NEW: Convert task completion to event data for coordinator
 */
export function convertToTaskEventData(
  task: ITask,
  action: 'completed' | 'uncompleted',
  completionDate: Date,
  previousState?: { streak: number; totalCompletions: number }
): TaskEventData {
  return {
    taskId: task._id.toString(),
    userId: task.user.toString(),
    action,
    completionDate: completionDate.toISOString(),
    
    // Task context
    taskName: task.name,
    domainCategory: task.domainCategory || 'ethos',
    labels: Array.isArray(task.labels) ? [...task.labels] : [],
    isSystemTask: task.isSystemTask || false,
    
    // Current metrics
    newStreak: task.currentStreak || 0,
    totalCompletions: task.totalCompletions || 0,
    
    // Previous state for milestone detection
    previousStreak: previousState?.streak,
    previousTotalCompletions: previousState?.totalCompletions,
    
    // Source
    source: task.isSystemTask ? 'system' : 'api',
    timestamp: new Date()
  };
}

/**
 * NEW: Convert multiple tasks to label metrics
 */
export function convertToLabelMetrics(
  tasks: ITask[],
  label: string,
  domainCategory?: DomainCategory
) {
  const filteredTasks = tasks.filter(task => 
    task.labels?.includes(label) &&
    (!domainCategory || task.domainCategory === domainCategory)
  );
  
  const totalCompletions = filteredTasks.reduce((sum, task) => 
    sum + (task.totalCompletions || 0), 0
  );
  
  const currentStreaks = filteredTasks.map(task => task.currentStreak || 0);
  const currentStreak = Math.max(...currentStreaks, 0);
  const averageStreak = currentStreaks.length > 0 
    ? currentStreaks.reduce((sum, streak) => sum + streak, 0) / currentStreaks.length 
    : 0;
  
  // Find most recent completion date
  const completionDates = filteredTasks
    .map(task => task.lastCompletedDate)
    .filter(date => date !== null)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
  
  const lastCompletedDate = completionDates.length > 0 
    ? completionDates[0]!.toISOString() 
    : null;
  
  return {
    label,
    domainCategory,
    totalTasks: filteredTasks.length,
    totalCompletions,
    currentStreak,
    averageStreak: Math.round(averageStreak * 100) / 100,
    lastCompletedDate,
    tasks: filteredTasks.map(task => ({
      id: task._id.toString(),
      name: task.name,
      currentStreak: task.currentStreak || 0,
      totalCompletions: task.totalCompletions || 0
    }))
  };
}

/**
 * Helper function to determine time block from scheduled time
 */
function getTimeBlockFromScheduledTime(scheduledTime: string): 'morning' | 'afternoon' | 'evening' {
  if (!scheduledTime) return 'morning';
  
  const [hoursStr] = scheduledTime.split(':');
  const hours = parseInt(hoursStr, 10);
  
  if (isNaN(hours)) return 'morning';
  
  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 18) return 'afternoon';
  return 'evening';
}

/**
 * NEW: Helper to create basic task data for system tasks
 */
export function createSystemTaskData(
  userId: string,
  name: string,
  domainCategory: DomainCategory,
  labels: string[],
  scheduledTime: string = '12:00',
  recurrencePattern: 'once' | 'daily' | 'custom' = 'daily'
): Partial<ITask> {
  return {
    user: new (require('mongoose').Types.ObjectId)(userId),
    name,
    scheduledTime,
    domainCategory,
    labels,
    isSystemTask: true,
    recurrencePattern,
    completed: false,
    currentStreak: 0,
    totalCompletions: 0,
    category: 'system',
    priority: 'medium',
    completionHistory: [],
    date: new Date()
  };
}