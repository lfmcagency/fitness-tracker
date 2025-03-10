// src/types/api/taskRequests.ts
import { RecurrencePattern, TaskPriority } from '../index';

/**
 * Query parameters for task listing
 */
export interface TaskQueryParams {
  completed?: boolean;
  category?: string;
  priority?: TaskPriority;
  from?: string;
  to?: string;
  pattern?: RecurrencePattern;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Request body for creating a new task
 */
export interface CreateTaskRequest {
  name: string;
  scheduledTime: string;
  date?: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  category?: string;
  priority?: TaskPriority;
}

/**
 * Request body for updating a task
 */
export interface UpdateTaskRequest {
  name?: string;
  scheduledTime?: string;
  completed?: boolean;
  completionDate?: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  category?: string;
  priority?: TaskPriority;
  date?: string;
}

/**
 * Request body for batch operations on tasks
 */
export interface BatchTaskRequest {
  operation: 'complete' | 'delete' | 'update';
  taskIds: string[];
  data?: any;
}

/**
 * Request body for updating a task streak
 */
export interface TaskStreakRequest {
  date?: string;
}

/**
 * Query parameters for task statistics
 */
export interface TaskStatisticsParams {
  period?: 'day' | 'week' | 'month' | 'year' | 'all';
  from?: string;
  to?: string;
  category?: string;
  trend?: boolean;
}