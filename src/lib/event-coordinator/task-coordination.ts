// src/lib/event-coordinator/task-coordination.ts
/**
 * TASK COORDINATION HELPER
 * 
 * Bridge between Progress domain and Ethos for atomic cross-domain task operations.
 * Called by Progress during atomic operations to update tasks across domains.
 */

import { Types } from 'mongoose';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { TaskUpdateRequest } from './types';
import { 
  convertTaskToTaskData,
  createSystemTaskData 
} from '@/types/converters/taskConverters';

/**
 * Process task update from Progress domain
 * This is called during atomic operations to maintain consistency
 */
export async function processTaskUpdateFromProgress(
  taskUpdate: TaskUpdateRequest,
  token: string
): Promise<{
  taskId: string;
  action: string;
  success: boolean;
  result: any;
  previousState?: any;
}> {
  console.log(`🔄 [TASK-COORD] Processing task update from Progress: ${token}`);
  console.log(`📝 [TASK-COORD] Update details:`, {
    action: taskUpdate.action,
    domainCategory: taskUpdate.domainCategory,
    labels: taskUpdate.labels
  });
  
  try {
    switch (taskUpdate.action) {
      case 'create':
        return await createSystemTaskFromProgress(taskUpdate, token);
      case 'update':
        return await updateTaskFromProgress(taskUpdate, token);
      case 'complete':
        return await completeTaskFromProgress(taskUpdate, token);
      case 'uncomplete':
        return await uncompleteTaskFromProgress(taskUpdate, token);
      default:
        throw new Error(`Unsupported task action: ${taskUpdate.action}`);
    }
  } catch (error) {
    console.error(`💥 [TASK-COORD] Task update failed: ${token}`, error);
    throw error;
  }
}

/**
 * Create system task from other domains
 */
async function createSystemTaskFromProgress(
  taskUpdate: TaskUpdateRequest,
  token: string
): Promise<any> {
  console.log(`➕ [TASK-COORD] Creating system task: ${token}`);
  
  if (!taskUpdate.taskData?.name) {
    throw new Error('Task name required for creation');
  }
  
  const userId = extractUserIdFromUpdate(taskUpdate);
  
  // Check if task already exists
  const existingTask = await Task.findOne({
    user: new Types.ObjectId(userId),
    domainCategory: taskUpdate.domainCategory,
    labels: { $all: taskUpdate.labels || [] },
    isSystemTask: true
  });
  
  if (existingTask) {
    console.log(`⚠️ [TASK-COORD] System task already exists: ${existingTask._id}`);
    return {
      taskId: existingTask._id.toString(),
      action: 'create',
      success: true,
      result: convertTaskToTaskData(existingTask as ITask)
    };
  }
  
  // Create new system task
  const taskData = {
    ...createSystemTaskData(
      userId,
      taskUpdate.taskData.name,
      taskUpdate.domainCategory!,
      taskUpdate.labels || []
    ),
    description: taskUpdate.taskData.description,
    scheduledTime: taskUpdate.taskData.scheduledTime,
    priority: taskUpdate.taskData.priority || 'medium'
  };
  
  const newTask = await Task.create(taskData) as ITask;
  
  console.log(`✅ [TASK-COORD] System task created: ${newTask._id} | ${token}`);
  
  return {
    taskId: newTask._id.toString(),
    action: 'create',
    success: true,
    result: convertTaskToTaskData(newTask)
  };
}

/**
 * Update existing task from other domains
 */
async function updateTaskFromProgress(
  taskUpdate: TaskUpdateRequest,
  token: string
): Promise<any> {
  console.log(`📝 [TASK-COORD] Updating task: ${token}`);
  
  const userId = extractUserIdFromUpdate(taskUpdate);
  let task: ITask | null = null;
  
  // Find task by ID or criteria
  if (taskUpdate.taskId) {
    task = await Task.findOne({
      _id: new Types.ObjectId(taskUpdate.taskId),
      user: new Types.ObjectId(userId)
    }) as ITask;
  } else if (taskUpdate.domainCategory && taskUpdate.labels) {
    task = await Task.findOne({
      user: new Types.ObjectId(userId),
      domainCategory: taskUpdate.domainCategory,
      labels: { $all: taskUpdate.labels },
      isSystemTask: true
    }) as ITask;
  }
  
  if (!task) {
    throw new Error('Task not found for update');
  }
  
  const previousState = {
    progress: taskUpdate.taskData?.progress,
    description: task.description
  };
  
  // Apply updates
  if (taskUpdate.taskData) {
    if (taskUpdate.taskData.description !== undefined) {
      task.description = taskUpdate.taskData.description;
    }
    if (taskUpdate.taskData.priority !== undefined) {
      task.priority = taskUpdate.taskData.priority as any;
    }
    // Note: Don't update completion here - that's handled by complete/uncomplete actions
  }
  
  await task.save();
  
  console.log(`✅ [TASK-COORD] Task updated: ${task._id} | ${token}`);
  
  return {
    taskId: task._id.toString(),
    action: 'update',
    success: true,
    result: convertTaskToTaskData(task),
    previousState
  };
}

/**
 * Complete task from other domains (e.g., nutrition hitting macro goals)
 */
async function completeTaskFromProgress(
  taskUpdate: TaskUpdateRequest,
  token: string
): Promise<any> {
  console.log(`✅ [TASK-COORD] Completing task: ${token}`);
  
  const userId = extractUserIdFromUpdate(taskUpdate);
  let task: ITask | null = null;
  
  // Find task by ID or criteria
  if (taskUpdate.taskId) {
    task = await Task.findOne({
      _id: new Types.ObjectId(taskUpdate.taskId),
      user: new Types.ObjectId(userId)
    }) as ITask;
  } else if (taskUpdate.domainCategory && taskUpdate.labels) {
    task = await Task.findOne({
      user: new Types.ObjectId(userId),
      domainCategory: taskUpdate.domainCategory,
      labels: { $all: taskUpdate.labels },
      isSystemTask: true
    }) as ITask;
  }
  
  if (!task) {
    // Create system task if it doesn't exist and we have enough info
    if (taskUpdate.domainCategory && taskUpdate.labels) {
      console.log(`🔧 [TASK-COORD] Task not found, creating system task: ${token}`);
      
      const defaultName = generateDefaultTaskName(taskUpdate.domainCategory, taskUpdate.labels);
      const createRequest: TaskUpdateRequest = {
        ...taskUpdate,
        action: 'create',
        taskData: {
          name: defaultName,
          ...taskUpdate.taskData
        }
      };
      
      const createResult = await createSystemTaskFromProgress(createRequest, token);
      task = await Task.findById(createResult.taskId) as ITask;
    } else {
      throw new Error('Task not found and insufficient info to create');
    }
  }
  
  // Store previous state
  const completionDate = taskUpdate.taskData?.completionDate 
    ? new Date(taskUpdate.taskData.completionDate)
    : new Date();
    
  const previousState = {
    streak: task.currentStreak,
    totalCompletions: task.totalCompletions,
    completed: task.isCompletedOnDate(completionDate)
  };
  
  // Complete the task if not already completed
  if (!task.isCompletedOnDate(completionDate)) {
    task.completeTask(completionDate);
    await task.save();
    
    // Log the completion
    await TaskLog.logCompletion(
      task._id,
      new Types.ObjectId(userId),
      'completed',
      completionDate,
      task,
      'cross_domain'
    );
    
    console.log(`✅ [TASK-COORD] Task completed: ${task._id} | ${token}`);
  } else {
    console.log(`⚠️ [TASK-COORD] Task already completed for date: ${task._id} | ${token}`);
  }
  
  return {
    taskId: task._id.toString(),
    action: 'complete',
    success: true,
    result: convertTaskToTaskData(task, completionDate),
    previousState
  };
}

/**
 * Uncomplete task from other domains
 */
async function uncompleteTaskFromProgress(
  taskUpdate: TaskUpdateRequest,
  token: string
): Promise<any> {
  console.log(`❌ [TASK-COORD] Uncompleting task: ${token}`);
  
  const userId = extractUserIdFromUpdate(taskUpdate);
  let task: ITask | null = null;
  
  // Find task by ID or criteria
  if (taskUpdate.taskId) {
    task = await Task.findOne({
      _id: new Types.ObjectId(taskUpdate.taskId),
      user: new Types.ObjectId(userId)
    }) as ITask;
  } else if (taskUpdate.domainCategory && taskUpdate.labels) {
    task = await Task.findOne({
      user: new Types.ObjectId(userId),
      domainCategory: taskUpdate.domainCategory,
      labels: { $all: taskUpdate.labels },
      isSystemTask: true
    }) as ITask;
  }
  
  if (!task) {
    throw new Error('Task not found for uncompletion');
  }
  
  // Store previous state
  const completionDate = taskUpdate.taskData?.completionDate 
    ? new Date(taskUpdate.taskData.completionDate)
    : new Date();
    
  const previousState = {
    streak: task.currentStreak,
    totalCompletions: task.totalCompletions,
    completed: task.isCompletedOnDate(completionDate)
  };
  
  // Uncomplete the task if currently completed
  if (task.isCompletedOnDate(completionDate)) {
    task.uncompleteTask(completionDate);
    await task.save();
    
    // Log the uncompletion
    await TaskLog.logCompletion(
      task._id,
      new Types.ObjectId(userId),
      'uncompleted',
      completionDate,
      task,
      'cross_domain'
    );
    
    console.log(`❌ [TASK-COORD] Task uncompleted: ${task._id} | ${token}`);
  } else {
    console.log(`⚠️ [TASK-COORD] Task already incomplete for date: ${task._id} | ${token}`);
  }
  
  return {
    taskId: task._id.toString(),
    action: 'uncomplete',
    success: true,
    result: convertTaskToTaskData(task, completionDate),
    previousState
  };
}

/**
 * Extract user ID from task update request
 */
function extractUserIdFromUpdate(taskUpdate: TaskUpdateRequest): string {
  // In a rich contract, userId should be available from the source
  // For now, we'll need to pass it through the taskUpdate metadata
  // This is a temporary solution until we refactor the interface
  
  if ('userId' in taskUpdate && taskUpdate.userId) {
    return taskUpdate.userId as string;
  }
  
  throw new Error('User ID not found in task update request');
}

/**
 * Generate default task name for system tasks
 */
function generateDefaultTaskName(domainCategory: string, labels: string[]): string {
  const domainNames = {
    ethos: 'Daily Routine',
    trophe: 'Nutrition Tracking', 
    soma: 'Training Session'
  };
  
  const baseName = domainNames[domainCategory as keyof typeof domainNames] || 'System Task';
  
  // Use first label as suffix if available
  if (labels.length > 0) {
    const suffix = labels[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${baseName} - ${suffix}`;
  }
  
  return baseName;
}

/**
 * Bulk task operations for efficiency
 */
export async function processBulkTaskUpdates(
  taskUpdates: TaskUpdateRequest[],
  token: string
): Promise<Array<{
  taskId: string;
  action: string;
  success: boolean;
  result?: any;
  error?: string;
}>> {
  console.log(`📦 [TASK-COORD] Processing ${taskUpdates.length} bulk task updates: ${token}`);
  
  const results = [];
  
  for (const taskUpdate of taskUpdates) {
    try {
      const result = await processTaskUpdateFromProgress(taskUpdate, token);
      results.push(result);
    } catch (error) {
      console.error(`💥 [TASK-COORD] Bulk update failed for task:`, taskUpdate, error);
      results.push({
        taskId: taskUpdate.taskId || 'unknown',
        action: taskUpdate.action,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  console.log(`✅ [TASK-COORD] Bulk task updates complete: ${results.filter(r => r.success).length}/${results.length} | ${token}`);
  
  return results;
}

/**
 * Get task metrics for cross-domain operations
 */
export async function getTaskMetrics(
  userId: string,
  domainCategory?: string,
  labels?: string[]
): Promise<{
  totalTasks: number;
  totalCompletions: number;
  currentStreak: number;
  lastCompletedDate: string | null;
}> {
  const query: any = {
    user: new Types.ObjectId(userId)
  };
  
  if (domainCategory) {
    query.domainCategory = domainCategory;
  }
  
  if (labels && labels.length > 0) {
    query.labels = { $in: labels };
  }
  
  const tasks = await Task.find(query) as ITask[];
  
  const totalCompletions = tasks.reduce((sum, task) => sum + (task.totalCompletions || 0), 0);
  const currentStreak = Math.max(...tasks.map(task => task.currentStreak || 0), 0);
  
  // Find most recent completion
  const completionDates = tasks
    .map(task => task.lastCompletedDate)
    .filter(date => date !== null)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
  
  const lastCompletedDate = completionDates.length > 0 
    ? completionDates[0]!.toISOString() 
    : null;
  
  return {
    totalTasks: tasks.length,
    totalCompletions,
    currentStreak,
    lastCompletedDate
  };
}