export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';;
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EnhancedTask } from '@/types';
import { convertTaskToEnhancedTask } from '@/lib/task-utils';

/**
 * POST /api/tasks/batch
 * 
 * Performs batch operations on tasks
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Defensive request body parsing
    let requestBody;
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
      id && typeof id === 'string' && id.trim() !== ''
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
          
          const completedTasks = [];
          
          for (const taskId of validTaskIds) {
            try {
              const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
              
              if (task && !task.completed) {
                task.completeTask(completionDate);
                await task.save();
                
                // Convert task with defensive error handling
                try {
                  const enhancedTask = convertTaskToEnhancedTask(task);
                  completedTasks.push(enhancedTask);
                } catch (error) {
                  console.error(`Error converting task ${taskId}:`, error);
                  // Add basic task info instead
                  completedTasks.push({
                    id: task._id?.toString() || taskId,
                    name: task.name || 'Unknown task',
                    completed: true
                  });
                }
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
          const updatedTasks = [];
          
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
                try {
                  const enhancedTask = convertTaskToEnhancedTask(updatedTask);
                  updatedTasks.push(enhancedTask);
                } catch (error) {
                  console.error(`Error converting task ${taskId}:`, error);
                  // Add basic task info instead
                  updatedTasks.push({
                    id: updatedTask._id?.toString() || taskId,
                    name: updatedTask.name || 'Unknown task',
                    completed: !!updatedTask.completed
                  });
                }
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
}, AuthLevel.DEV_OPTIONAL);