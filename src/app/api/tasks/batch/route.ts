export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
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
    
    const { operation, taskIds, data } = await req.json();
    
    // Validate operation type
    if (!operation || !['complete', 'delete', 'update'].includes(operation)) {
      return apiError(
        'Invalid operation. Supported operations: complete, delete, update.',
        400,
        'ERR_INVALID_OPERATION'
      );
    }
    
    // Validate taskIds
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return apiError('No task IDs provided.', 400, 'ERR_VALIDATION');
    }
    
    // Filter tasks to only include those owned by the user
    const query = {
      _id: { $in: taskIds },
      user: userId
    };
    
    // Perform the requested operation
    switch (operation) {
      case 'complete': {
        // For 'complete' operation, we need to update each task individually
        // to correctly calculate streaks
        const completionDate = data?.completionDate ? new Date(data.completionDate) : new Date();
        const completedTasks = [];
        
        for (const taskId of taskIds) {
          const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
          
          if (task && !task.completed) {
            task.completeTask(completionDate);
            await task.save();
            completedTasks.push(convertTaskToEnhancedTask(task));
          }
        }
        
        return apiResponse(
          completedTasks,
          true,
          `${completedTasks.length} tasks marked as completed.`
        );
      }
      
      case 'delete': {
        // For 'delete' operation, we can use deleteMany
        const deleteResult = await Task.deleteMany(query);
        
        return apiResponse(
          { count: deleteResult.deletedCount, taskIds },
          true,
          `${deleteResult.deletedCount} tasks deleted.`
        );
      }
      
      case 'update': {
        // For 'update' operation, validate the data
        if (!data || typeof data !== 'object') {
          return apiError('No update data provided.', 400, 'ERR_VALIDATION');
        }
        
        // Perform updates for each task individually
        // This ensures proper handling of special cases like recurrence patterns
        const updatedTasks = [];
        
        for (const taskId of taskIds) {
          // Update the task with validation
          const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, user: userId },
            data,
            { new: true, runValidators: true }
          ) as ITask | null;
          
          if (updatedTask) {
            updatedTasks.push(convertTaskToEnhancedTask(updatedTask));
          }
        }
        
        return apiResponse(
          updatedTasks,
          true,
          `${updatedTasks.length} tasks updated.`
        );
      }
      
      default:
        // This should never happen due to validation above
        return apiError('Invalid operation', 400, 'ERR_INVALID_OPERATION');
    }
  } catch (error) {
    return handleApiError(error, 'Error performing batch operation');
  }
}, AuthLevel.DEV_OPTIONAL);