// src/lib/api-handlers/taskHandlers.ts
import { TaskData, RecurrencePattern, TaskPriority, DomainCategory } from '@/types';

// UPDATED: Response types that include achievements
export interface TaskCompletionResult {
  task: TaskData;
  achievements?: {
    unlockedCount: number;
    achievements: any[];
    message?: string;
  };
}

export interface BatchTaskResult {
  tasks?: TaskData[];
  count?: number;
  taskIds?: string[];
  achievements?: {
    unlockedCount: number;
    achievements: any[];
  };
}

/**
 * UPDATED: Fetch tasks for a specific date with new filtering options
 */
export async function getTasksForDate(
  dateStr: string,
  filters?: {
    domainCategory?: DomainCategory;
    labels?: string[];
    isSystemTask?: boolean;
    priority?: TaskPriority;
  }
): Promise<TaskData[]> {
  const params = new URLSearchParams({ date: dateStr });
  
  // Add filters if provided
  if (filters?.domainCategory) {
    params.append('domainCategory', filters.domainCategory);
  }
  if (filters?.labels && filters.labels.length > 0) {
    params.append('labels', filters.labels.join(','));
  }
  if (filters?.isSystemTask !== undefined) {
    params.append('isSystemTask', filters.isSystemTask.toString());
  }
  if (filters?.priority) {
    params.append('priority', filters.priority);
  }
  
  const response = await fetch(`/api/tasks/due?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch tasks' }));
    throw new Error(error.message || 'Failed to fetch tasks');
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * UPDATED: Create a new task with organization fields
 */
export async function createTask(taskData: {
  name: string;
  description?: string;
  scheduledTime: string;
  date?: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  domainCategory?: DomainCategory;
  labels?: string[];
  isSystemTask?: boolean;
  category?: string;
  priority?: TaskPriority;
}): Promise<TaskData> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...taskData,
      date: taskData.date || new Date().toISOString().split('T')[0],
      domainCategory: taskData.domainCategory || 'ethos',
      labels: taskData.labels || [],
      isSystemTask: taskData.isSystemTask || false
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create task' }));
    throw new Error(error.message || 'Failed to create task');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * UPDATED: Update task using PATCH and handle organization fields
 */
export async function updateTask(
  taskId: string, 
  updates: Partial<TaskData & { completionDate?: string }>
): Promise<TaskCompletionResult> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH', // UPDATED: Was PUT, now PATCH
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update task' }));
    throw new Error(error.message || 'Failed to update task');
  }
  
  const data = await response.json();
  
  // Handle both TaskData and { task: TaskData } response formats
  const task = 'task' in data.data ? data.data.task : data.data;
  
  // Extract achievements if present
  const achievements = data.data.achievements?.unlockedCount > 0 ? {
    unlockedCount: data.data.achievements.unlockedCount,
    achievements: data.data.achievements.achievements || [],
    message: `🎉 ${data.data.achievements.unlockedCount} achievement(s) unlocked!`
  } : undefined;
  
  return { task, achievements };
}

/**
 * UPDATED: Complete/uncomplete task with achievement handling
 */
export async function completeTask(
  taskId: string, 
  completed: boolean, 
  completionDate?: string
): Promise<TaskCompletionResult> {
  const updates: any = { completed };
  if (completionDate) {
    updates.completionDate = completionDate;
  }
  
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH', // UPDATED: Was PUT, now PATCH
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update task completion' }));
    throw new Error(error.message || 'Failed to update task completion');
  }
  
  const data = await response.json();
  
  // Handle both TaskData and { task: TaskData } response formats
  const task = 'task' in data.data ? data.data.task : data.data;
  
  // Extract achievements if present
  const achievements = data.data.achievements?.unlockedCount > 0 ? {
    unlockedCount: data.data.achievements.unlockedCount,
    achievements: data.data.achievements.achievements || [],
    message: `🎉 ${data.data.achievements.unlockedCount} achievement(s) unlocked!`
  } : undefined;
  
  return { task, achievements };
}

/**
 * Delete a task (with system task protection)
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete task' }));
    throw new Error(error.message || 'Failed to delete task');
  }
}

/**
 * UPDATED: Get task streak information
 */
export async function getTaskStreak(taskId: string): Promise<{
  taskId: string;
  name: string;
  currentStreak: number;
  totalCompletions: number;
  lastCompleted: string | null;
  isDueToday: boolean;
}> {
  const response = await fetch(`/api/tasks/${taskId}/streak`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch task streak' }));
    throw new Error(error.message || 'Failed to fetch task streak');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * UPDATED: Complete task via streak endpoint with achievement handling
 */
export async function completeTaskStreak(
  taskId: string, 
  date?: string
): Promise<TaskCompletionResult> {
  const body: any = {};
  if (date) body.date = date;
  
  const response = await fetch(`/api/tasks/${taskId}/streak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update task streak' }));
    throw new Error(error.message || 'Failed to update task streak');
  }
  
  const data = await response.json();
  
  // Extract achievements if present
  const achievements = data.data.achievements?.unlockedCount > 0 ? {
    unlockedCount: data.data.achievements.unlockedCount,
    achievements: data.data.achievements.achievements || [],
    message: `🎉 ${data.data.achievements.unlockedCount} achievement(s) unlocked!`
  } : undefined;
  
  // Convert streak info to task format
  const task: TaskData = {
    id: data.data.taskId,
    name: data.data.name,
    currentStreak: data.data.currentStreak,
    totalCompletions: data.data.totalCompletions || 0,
    completed: true,
    lastCompleted: data.data.lastCompletedDate,
    // Add default values for required fields
    scheduledTime: '00:00',
    date: new Date().toISOString(),
    recurrencePattern: 'daily',
    domainCategory: 'ethos',
    labels: [],
    isSystemTask: false,
    category: 'general',
    priority: 'medium',
    timeBlock: 'morning'
  };
  
  return { task, achievements };
}

/**
 * NEW: Batch complete tasks with achievement aggregation
 */
export async function batchCompleteTasks(
  taskIds: string[], 
  completionDate?: string
): Promise<BatchTaskResult> {
  const requestBody: any = {
    operation: 'complete',
    taskIds
  };
  
  if (completionDate) {
    requestBody.data = { completionDate };
  }
  
  const response = await fetch('/api/tasks/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to complete tasks' }));
    throw new Error(error.message || 'Failed to complete tasks');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * NEW: Batch delete tasks
 */
export async function batchDeleteTasks(taskIds: string[]): Promise<BatchTaskResult> {
  const response = await fetch('/api/tasks/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'delete',
      taskIds
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete tasks' }));
    throw new Error(error.message || 'Failed to delete tasks');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * NEW: Get tasks by domain category
 */
export async function getTasksByDomain(
  domainCategory: DomainCategory,
  filters?: {
    completed?: boolean;
    priority?: TaskPriority;
    isSystemTask?: boolean;
  }
): Promise<TaskData[]> {
  const params = new URLSearchParams({ domainCategory });
  
  if (filters?.completed !== undefined) {
    params.append('completed', filters.completed.toString());
  }
  if (filters?.priority) {
    params.append('priority', filters.priority);
  }
  if (filters?.isSystemTask !== undefined) {
    params.append('isSystemTask', filters.isSystemTask.toString());
  }
  
  const response = await fetch(`/api/tasks?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch tasks' }));
    throw new Error(error.message || 'Failed to fetch tasks');
  }
  
  const data = await response.json();
  return data.data?.data || [];
}

/**
 * NEW: Get tasks by labels
 */
export async function getTasksByLabels(
  labels: string[],
  filters?: {
    domainCategory?: DomainCategory;
    completed?: boolean;
    isSystemTask?: boolean;
  }
): Promise<TaskData[]> {
  const params = new URLSearchParams({ labels: labels.join(',') });
  
  if (filters?.domainCategory) {
    params.append('domainCategory', filters.domainCategory);
  }
  if (filters?.completed !== undefined) {
    params.append('completed', filters.completed.toString());
  }
  if (filters?.isSystemTask !== undefined) {
    params.append('isSystemTask', filters.isSystemTask.toString());
  }
  
  const response = await fetch(`/api/tasks?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch tasks' }));
    throw new Error(error.message || 'Failed to fetch tasks');
  }
  
  const data = await response.json();
  return data.data?.data || [];
}

/**
 * NEW: Get task statistics with domain filtering
 */
export async function getTaskStatistics(filters?: {
  period?: 'day' | 'week' | 'month' | 'year' | 'all';
  domainCategory?: DomainCategory;
  labels?: string[];
  from?: string;
  to?: string;
}): Promise<any> {
  const params = new URLSearchParams();
  
  if (filters?.period) params.append('period', filters.period);
  if (filters?.domainCategory) params.append('domainCategory', filters.domainCategory);
  if (filters?.labels && filters.labels.length > 0) {
    params.append('labels', filters.labels.join(','));
  }
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  
  const response = await fetch(`/api/tasks/statistics?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch statistics' }));
    throw new Error(error.message || 'Failed to fetch statistics');
  }
  
  const data = await response.json();
  return data.data;
}