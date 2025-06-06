// src/types/api/taskResponses.ts
import { ApiResponse } from './common';
import { PaginationInfo } from './pagination';
import { TaskData, StreakInfo } from '../index';
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
 * Response for XP award after task completion
 */
export type TaskCompletionXpResponse = ApiResponse<{
  task: TaskData;
  xpAward: {
    xpAwarded: number;
    newLevel: number;
    previousLevel: number;
    leveledUp: boolean;
    totalXp: number;
  };
}>;