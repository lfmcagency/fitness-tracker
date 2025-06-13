// src/types/api/taskRequests.ts
import { RecurrencePattern, TaskPriority, DomainCategory } from '../index';

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
  
  // NEW: Query by organization fields
  domainCategory?: DomainCategory;
  labels?: string; // Comma-separated labels
  isSystemTask?: boolean;
  
  // Pagination
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
  
  // NEW: Organization fields
  domainCategory?: DomainCategory;
  labels?: string[];
  isSystemTask?: boolean;
  
  // Existing fields
  category?: string;
  priority?: TaskPriority;
  description?: string;
}

/**
 * Request body for updating a task
 */
export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  scheduledTime?: string;
  completed?: boolean;
  completionDate?: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  
  // NEW: Organization fields
  domainCategory?: DomainCategory;
  labels?: string[];
  
  // Existing fields
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
  
  // NEW: Filter by organization fields
  domainCategory?: DomainCategory;
  labels?: string; // Comma-separated labels
  
  trend?: boolean;
}

/**
 * NEW: Request for system task operations (coordinator -> model)
 */
export interface SystemTaskRequest {
  userId: string;
  domainCategory: DomainCategory;
  labels: string[];
  action: 'complete' | 'uncomplete' | 'update';
  completionDate?: string;
  
  // For updates
  updates?: {
    name?: string;
    description?: string;
    scheduledTime?: string;
  };
  
  // Context for event creation
  source: 'system';
  metadata?: {
    triggerDomain?: string;
    eventType?: string;
    additionalContext?: any;
  };
}

/**
 * NEW: Request for label-based queries (coordinator uses these)
 */
export interface LabelQueryRequest {
  userId: string;
  labels: string[];
  domainCategory?: DomainCategory;
  includeMetrics?: boolean; // Whether to include streak/completion counts
}

/**
 * NEW: Request for creating system tasks
 */
export interface CreateSystemTaskRequest {
  userId: string;
  name: string;
  scheduledTime: string;
  domainCategory: DomainCategory;
  labels: string[];
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  category?: string;
  priority?: TaskPriority;
  description?: string;
}