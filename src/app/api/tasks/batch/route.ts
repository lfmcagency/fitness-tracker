// src/app/api/tasks/batch/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { convertTaskToTaskData } from '@/types/converters/taskConverters';
import { processEvent, generateToken } from '@/lib/event-coordinator';
import { extractAchievements, mergeAchievementNotifications } from '@/lib/shared-utilities';
import { getTodayString, isSameDay } from '@/lib/shared-utilities';
import { TaskData } from '@/types';
import { BatchTaskRequest } from '@/types/api/taskRequests';
import { isValidObjectId } from 'mongoose';

// Same-day validation helper
function validateSameDay(targetDate: Date): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  if (target.getTime() !== today.getTime()) {
    throw new Error('Can only modify today\'s data. Yesterday is locked history.');
  }
}

/**
 * POST /api/tasks/batch
 * Performs batch operations on tasks with clean event integration
 */
export const POST = withAuth<TaskData[] | { count: number; taskIds: string[]; achievements?: any }>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse request body
      let requestBody: BatchTaskRequest;
      try {
        requestBody = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate operation
      const operation = requestBody?.operation;
      if (!operation || !['complete', 'delete', 'update'].includes(operation)) {
        return apiError(
          'Invalid operation. Supported operations: complete, delete, update.',
          400,
          'ERR_INVALID_OPERATION'
        );
      }
      
      // Validate and filter task IDs
      const taskIds = requestBody?.taskIds;
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return apiError('No task IDs provided.', 400, 'ERR_VALIDATION');
      }
      
      const validTaskIds = taskIds.filter(id => 
        id && typeof id === 'string' && id.trim() !== '' && isValidObjectId(id)
      );
      
      if (validTaskIds.length === 0) {
        return apiError('No valid task IDs provided.', 400, 'ERR_VALIDATION');
      }
      
      const data = requestBody?.data;
      
      // Filter tasks to only include those owned by the user
      const query = {
        _id: { $in: validTaskIds },
        user: userId
      };
      
      // Perform the requested operation
      switch (operation) {
        case 'complete': {
          try {
            const completionDate = data?.completionDate 
              ? new Date(data.completionDate) 
              : new Date();
              
            if (isNaN(completionDate.getTime())) {
              return apiError('Invalid completion date', 400, 'ERR_INVALID_DATE');
            }
            
            // Same-day validation for all completions
            try {
              validateSameDay(completionDate);
            } catch (error) {
              return apiError(error instanceof Error ? error.message : 'Same-day validation failed', 403, 'ERR_HISTORICAL_EDIT');
            }
            
            // Get all tasks and prepare for batch completion
            const tasks = await Task.find(query) as ITask[];
            const completions = [];
            const allAchievements = [];
            
            for (const task of tasks) {
              if (!task.isCompletedOnDate(completionDate)) {
                const token = generateToken();
                
                // Store previous state before completing
                const previousState = {
                  streak: task.currentStreak,
                  totalCompletions: task.totalCompletions,
                  completed: false
                };
                
                // Complete the task
                task.completeTask(completionDate);
                await task.save();
                
                // Log the completion
                await TaskLog.logCompletion(
                  task._id,
                  task.user,
                  'completed',
                  completionDate,
                  task,
                  'api'
                );
                
                // Fire event to coordinator
                const taskEvent = {
                  token,
                  userId,
                  source: 'ethos' as const,
                  action: 'task_completed' as const,
                  timestamp: new Date(),
                  taskData: {
                    taskId: task._id.toString(),
                    taskName: task.name,
                    streakCount: task.currentStreak,
                    totalCompletions: task.totalCompletions,
                    completionDate: completionDate.toISOString(),
                    previousState
                  }
                };
                
                try {
                  const result = await processEvent(taskEvent);
                  const achievements = extractAchievements(result);
                  if (achievements) {
                    allAchievements.push(achievements);
                  }
                } catch (coordinatorError) {
                  console.error(`💥 [BATCH] Error processing coordinator event for task ${task.name}:`, coordinatorError);
                  // Continue - completion still succeeded
                }
                
                completions.push(task);
              }
            }
            
            // Merge all achievements
            const mergedAchievements = mergeAchievementNotifications(...allAchievements);
            
            // Build response
            const completedTaskData = completions.map(task => convertTaskToTaskData(task, completionDate));
            
            const response: any = {
              tasks: completedTaskData,
              completedCount: completedTaskData.length
            };
            
            if (mergedAchievements) {
              response.achievements = {
                unlockedCount: mergedAchievements.unlockedCount,
                achievements: mergedAchievements.achievements
              };
            }
            
            const message = mergedAchievements
              ? `${completedTaskData.length} tasks completed and ${mergedAchievements.unlockedCount} achievement(s) unlocked!`
              : `${completedTaskData.length} tasks marked as completed.`;
            
            return apiResponse(response, true, message);
          } catch (error) {
            return handleApiError(error, 'Error completing tasks');
          }
        }
        
        case 'delete': {
          try {
            // First check for system tasks and same-day validation
            const tasksToDelete = await Task.find(query) as ITask[];
            const systemTasks = tasksToDelete.filter(task => task.isSystemTask);
            
            if (systemTasks.length > 0) {
              return apiError(
                `Cannot delete system tasks: ${systemTasks.map(t => t.name).join(', ')}`,
                403,
                'ERR_FORBIDDEN'
              );
            }
            
            // Same-day validation for all deletions
            const today = getTodayString();
            const invalidTasks = tasksToDelete.filter(task => {
              const taskDate = task.date.toISOString().split('T')[0];
              return taskDate !== today;
            });
            
            if (invalidTasks.length > 0) {
              return apiError(
                `Can only delete today's tasks. Historical tasks: ${invalidTasks.map(t => t.name).join(', ')}`,
                403,
                'ERR_HISTORICAL_DELETE'
              );
            }
            
            // Fire deletion events for each task
            for (const task of tasksToDelete) {
              const token = generateToken();
              
              const taskEvent = {
                token,
                userId,
                source: 'ethos' as const,
                action: 'task_deleted' as const,
                timestamp: new Date(),
                taskData: {
                  taskId: task._id.toString(),
                  taskName: task.name,
                  streakCount: task.currentStreak,
                  totalCompletions: task.totalCompletions
                }
              };
              
              try {
                await processEvent(taskEvent);
              } catch (coordinatorError) {
                console.error(`💥 [BATCH] Error processing deletion event for task ${task.name}:`, coordinatorError);
                // Continue - deletion still succeeded
              }
            }
            
            // Proceed with deletion
            const deleteResult = await Task.deleteMany(query);
            
            return apiResponse(
              { 
                count: deleteResult?.deletedCount || 0, 
                taskIds: validTaskIds 
              },
              true,
              `${deleteResult?.deletedCount || 0} tasks deleted.`
            );
          } catch (error) {
            return handleApiError(error, 'Error deleting tasks');
          }
        }
        
        case 'update': {
          // For 'update' operation, validate the data
          if (!data || typeof data !== 'object') {
            return apiError('No update data provided.', 400, 'ERR_VALIDATION');
          }
          
          // Validate update fields
          const allowedFields = [
            'name', 'description', 'scheduledTime', 'recurrencePattern', 
            'customRecurrenceDays', 'category', 'priority', 'labels'
          ];
          
          const updateFields = Object.keys(data);
          const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
          
          if (invalidFields.length > 0) {
            return apiError(`Invalid update fields: ${invalidFields.join(', ')}`, 400, 'ERR_VALIDATION');
          }
          
          // Prevent updating system task identifying fields
          if (data.domainCategory || data.isSystemTask !== undefined) {
            return apiError('Cannot update domain category or system task status via batch operation', 403, 'ERR_FORBIDDEN');
          }
          
          try {
            // Perform updates for each task individually
            const updatedTasks: TaskData[] = [];
            
            for (const taskId of validTaskIds) {
              try {
                // Check if it's a system task first
                const existingTask = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
                
                if (existingTask?.isSystemTask) {
                  console.warn(`⚠️ [BATCH] Skipping system task update: ${existingTask.name}`);
                  continue;
                }
                
                // Update the task
                const updatedTask = await Task.findOneAndUpdate(
                  { _id: taskId, user: userId },
                  data,
                  { new: true, runValidators: true }
                ) as ITask | null;
                
                if (updatedTask) {
                  const taskData = convertTaskToTaskData(updatedTask);
                  updatedTasks.push(taskData);
                }
              } catch (error) {
                console.error(`💥 [BATCH] Error updating task ${taskId}:`, error);
                // Continue with other tasks even if one fails
              }
            }
            
            return apiResponse(
              updatedTasks,
              true,
              `${updatedTasks.length} tasks updated.`
            );
          } catch (error) {
            return handleApiError(error, 'Error updating tasks');
          }
        }
        
        default:
          return apiError('Invalid operation', 400, 'ERR_INVALID_OPERATION');
      }
    } catch (error) {
      return handleApiError(error, 'Error performing batch operation');
    }
  },
  AuthLevel.DEV_OPTIONAL
);