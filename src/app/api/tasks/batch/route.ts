export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { TaskData } from '@/types';
import { BatchTaskRequest } from '@/types/api/taskRequests';
import { convertTaskToTaskData } from '@/lib/task-utils';
import { isValidObjectId } from 'mongoose';

/**
 * POST /api/tasks/batch
 * Performs batch operations on tasks
 */
export const POST = withAuth<TaskData[] | { count: number; taskIds: string[] }>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Defensive request body parsing
      let requestBody: BatchTaskRequest;
      try {
        requestBody = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Extract and validate operation with defensive checks
      const operation = requestBody?.operation;
      if (!operation || typeof operation !== 'string' || 
          !['complete', 'delete', 'update'].includes(operation)) {
        return apiError(
          'Invalid operation. Supported operations: complete, delete, update.',
          400,
          'ERR_INVALID_OPERATION'
        );
      }
      
      // Extract and validate taskIds with defensive checks
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
      
      // Extract data object with defensive checks
      const data = requestBody?.data;
      
      // Filter tasks to only include those owned by the user
      const query = {
        _id: { $in: validTaskIds },
        user: userId
      };
      
      // Perform the requested operation with specific error handling for each
      switch (operation) {
        case 'complete': {
          // For 'complete' operation, we need to update each task individually
          // to correctly calculate streaks
          try {
            const completionDate = data?.completionDate 
              ? new Date(data.completionDate) 
              : new Date();
              
            if (isNaN(completionDate.getTime())) {
              return apiError('Invalid completion date', 400, 'ERR_INVALID_DATE');
            }
            
            const completedTasks: TaskData[] = [];
            
            for (const taskId of validTaskIds) {
              try {
                const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
                
                if (task && !task.completed) {
                  task.completeTask(completionDate);
                  await task.save();
                  
                  // Convert task with defensive error handling
                  const taskData = convertTaskToTaskData(task);
                  completedTasks.push(taskData);
                }
              } catch (error) {
                console.error(`Error completing task ${taskId}:`, error);
                // Continue with other tasks even if one fails
              }
            }
            
            return apiResponse(
              completedTasks,
              true,
              `${completedTasks.length} tasks marked as completed.`
            );
          } catch (error) {
            return handleApiError(error, 'Error completing tasks');
          }
        }
        
        case 'delete': {
          // For 'delete' operation, we can use deleteMany with error handling
          try {
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
          
          try {
            // Perform updates for each task individually
            // This ensures proper handling of special cases like recurrence patterns
            const updatedTasks: TaskData[] = [];
            
            for (const taskId of validTaskIds) {
              try {
                // Update the task with validation
                const updatedTask = await Task.findOneAndUpdate(
                  { _id: taskId, user: userId },
                  data,
                  { new: true, runValidators: true }
                ) as ITask | null;
                
                if (updatedTask) {
                  // Convert task with defensive error handling
                  const taskData = convertTaskToTaskData(updatedTask);
                  updatedTasks.push(taskData);
                }
              } catch (error) {
                console.error(`Error updating task ${taskId}:`, error);
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