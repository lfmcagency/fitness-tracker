export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { convertTaskToTaskData } from '@/types/converters/taskConverters';
import { handleTaskCompletion, handleBatchTaskCompletion } from '@/lib/event-coordinator/task-completion';
import { TaskData } from '@/types';
import { BatchTaskRequest } from '@/types/api/taskRequests';
import { isValidObjectId } from 'mongoose';

/**
 * POST /api/tasks/batch
 * Performs batch operations on tasks with FIXED event-driven architecture
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
      
      // Extract and validate operation
      const operation = requestBody?.operation;
      if (!operation || typeof operation !== 'string' || 
          !['complete', 'delete', 'update'].includes(operation)) {
        return apiError(
          'Invalid operation. Supported operations: complete, delete, update.',
          400,
          'ERR_INVALID_OPERATION'
        );
      }
      
      // Extract and validate taskIds
      const taskIds = requestBody?.taskIds;
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return apiError('No task IDs provided.', 400, 'ERR_VALIDATION');
      }
      
      // Filter out invalid task IDs
      const validTaskIds = taskIds.filter(id => 
        id && typeof id === 'string' && id.trim() !== '' && isValidObjectId(id)
      );
      
      if (validTaskIds.length === 0) {
        return apiError('No valid task IDs provided.', 400, 'ERR_VALIDATION');
      }
      
      // Extract data object
      const data = requestBody?.data;
      
      // Filter tasks to only include those owned by the user
      const query = {
        _id: { $in: validTaskIds },
        user: userId
      };
      
      // Perform the requested operation
      switch (operation) {
        case 'complete': {
          console.log(`🎯 [BATCH] Completing ${validTaskIds.length} tasks...`);
          
          try {
            const completionDate = data?.completionDate 
              ? new Date(data.completionDate) 
              : new Date();
              
            if (isNaN(completionDate.getTime())) {
              return apiError('Invalid completion date', 400, 'ERR_INVALID_DATE');
            }
            
            // Get all tasks and prepare for batch completion
            const tasks = await Task.find(query) as ITask[];
            const tasksToComplete = [];
            
            for (const task of tasks) {
              if (!task.isCompletedOnDate(completionDate)) {
                // Store previous state before completing
                const previousState = {
                  streak: task.currentStreak,
                  totalCompletions: task.totalCompletions
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
                
                tasksToComplete.push({
                  task,
                  completionDate,
                  previousState
                });
                
                console.log(`✅ [BATCH] Completed task: ${task.name}`);
              }
            }
            
            // 🆕 FIRE EVENTS TO COORDINATOR - FIXED BATCH VERSION 🆕
            let coordinatorResult = {
              achievementsUnlocked: [] as string[],
              processedTasks: 0,
              errors: [] as string[]
            };
            
            if (tasksToComplete.length > 0) {
              try {
                coordinatorResult = await handleBatchTaskCompletion(userId, tasksToComplete);
                console.log(`🎉 [BATCH] Coordinator processing complete: ${coordinatorResult.processedTasks}/${tasksToComplete.length} tasks`);
              } catch (coordinatorError) {
                console.error('💥 [BATCH] Error processing coordinator events:', coordinatorError);
                // Continue - completions still succeeded
              }
            }
            
            // Build response
            const completedTaskData = tasksToComplete.map(({ task }) => convertTaskToTaskData(task, completionDate));
            
            const response: any = {
              tasks: completedTaskData,
              completedCount: completedTaskData.length
            };
            
            if (coordinatorResult.achievementsUnlocked.length > 0) {
              response.achievements = {
                unlockedCount: coordinatorResult.achievementsUnlocked.length,
                achievements: coordinatorResult.achievementsUnlocked
              };
            }
            
            const message = coordinatorResult.achievementsUnlocked.length > 0
              ? `${completedTaskData.length} tasks completed and ${coordinatorResult.achievementsUnlocked.length} achievement(s) unlocked!`
              : `${completedTaskData.length} tasks marked as completed.`;
            
            return apiResponse(response, true, message);
          } catch (error) {
            return handleApiError(error, 'Error completing tasks');
          }
        }
        
        case 'delete': {
          try {
            // First check for system tasks
            const tasksToDelete = await Task.find(query) as ITask[];
            const systemTasks = tasksToDelete.filter(task => task.isSystemTask);
            
            if (systemTasks.length > 0) {
              return apiError(
                `Cannot delete system tasks: ${systemTasks.map(t => t.name).join(', ')}`,
                403,
                'ERR_FORBIDDEN'
              );
            }
            
            // Proceed with deletion
            const deleteResult = await Task.deleteMany(query);
            
            console.log(`🗑️ [BATCH] Deleted ${deleteResult?.deletedCount || 0} tasks`);
            
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
                  console.log(`📝 [BATCH] Updated task: ${updatedTask.name}`);
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
          // This should never happen due to validation above
          return apiError('Invalid operation', 400, 'ERR_INVALID_OPERATION');
      }
    } catch (error) {
      return handleApiError(error, 'Error performing batch operation');
    }
  },
  AuthLevel.DEV_OPTIONAL
);