// src/types/api/taskResponses.ts
import { ApiResponse } from './common';
import { PaginationInfo } from './pagination';
import { TaskData, StreakInfo, TaskEventData, DomainCategory } from '../index';
import { TaskStatistics } from '@/lib/task-statistics';

/**
 * Response for a single task
 */
export type TaskResponse = ApiResponse<TaskData>;

/**
 * Response for a list of tasks with pagination
 */
export type TaskListResponse = ApiResponse<{
  data: TaskData[];
  pagination: PaginationInfo;
}>;

/**
 * Response for task streak information
 */
export type TaskStreakResponse = ApiResponse<StreakInfo>;

/**
 * Response for batch operations on tasks
 * Can return either a list of updated tasks or a count of affected tasks
 */
export type TaskBatchResponse = ApiResponse<
  | TaskData[]
  | {
      count: number;
      taskIds: string[];
      achievements?: any; // NEW: Achievement unlocks from batch operations
    }
>;

/**
 * Response for tasks due on a specific date
 */
export type TaskDueResponse = ApiResponse<TaskData[]>;

/**
 * Response for task completion statistics
 */
export type TaskStatisticsResponse = ApiResponse<TaskStatistics>;

/**
 * UPDATED: Response for task completion with event data
 * Now includes achievement unlocks from coordinator
 */
export type TaskCompletionResponse = ApiResponse<{
  task: TaskData;
  xpAward?: {
    xpAwarded: number;
    newLevel: number;
    previousLevel: number;
    leveledUp: boolean;
    totalXp: number;
  };
  achievements?: {
    unlockedCount: number;
    achievements: any[];
  };
}>;

/**
 * NEW: Response for system task operations
 */
export type SystemTaskResponse = ApiResponse<{
  task: TaskData;
  eventFired: boolean;
  achievements?: {
    unlockedCount: number;
    achievements: any[];
  };
}>;

/**
 * NEW: Response for label-based queries
 */
export type LabelQueryResponse = ApiResponse<{
  tasks: TaskData[];
  metrics?: {
    totalCompletions: number;
    currentStreak: number;
    averageStreak: number;
  };
}>;

/**
 * NEW: Response for cross-task metrics by label
 */
export type LabelMetricsResponse = ApiResponse<{
  label: string;
  domainCategory?: DomainCategory;
  totalTasks: number;
  totalCompletions: number;
  currentStreak: number;
  averageStreak: number;
  lastCompletedDate: string | null;
  tasks: {
    id: string;
    name: string;
    currentStreak: number;
    totalCompletions: number;
  }[];
}>;

/**
 * NEW: Response for task event logging
 */
export type TaskEventResponse = ApiResponse<{
  eventLogged: boolean;
  eventId: string;
  coordinatorNotified: boolean;
}>;

// DEPRECATED: Keep for compatibility but prefer TaskCompletionResponse
export type TaskCompletionXpResponse = TaskCompletionResponse;