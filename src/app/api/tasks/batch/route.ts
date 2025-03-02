// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { getAuth } from '@/lib/auth';
import { EnhancedTask, ApiResponse } from '@/types';
import { convertTaskToEnhancedTask } from '../../../../lib/task-utils';

/**
 * POST /api/tasks/batch
 * 
 * Performs batch operations on tasks
 * 
 * Supported operations:
 * - complete: Marks multiple tasks as complete
 * - delete: Deletes multiple tasks
 * - update: Updates multiple tasks with the same values
 * 
 * Request body:
 * - operation: 'complete', 'delete', or 'update'
 * - taskIds: Array of task IDs to operate on
 * - data: Additional data for the operation (e.g., updates for 'update' operation)
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { operation, taskIds, data } = await req.json();
    
    // Validate operation type
    if (!operation || !['complete', 'delete', 'update'].includes(operation)) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Invalid operation. Supported operations: complete, delete, update.' 
      }, { status: 400 });
    }
    
    // Validate taskIds
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'No task IDs provided.' 
      }, { status: 400 });
    }
    
    // If we have a user session, perform the real batch operation
    if (session?.user?.id) {
      // Filter tasks to only include those owned by the user
      const query = {
        _id: { $in: taskIds },
        user: session.user.id
      };
      
      let result: ApiResponse<any>;
      
      // Perform the requested operation
      switch (operation) {
        case 'complete':
          // For 'complete' operation, we need to update each task individually
          // to correctly calculate streaks
          const completionDate = data?.completionDate ? new Date(data.completionDate) : new Date();
          const completedTasks = [];
          
          for (const taskId of taskIds) {
            const task = await Task.findOne({ _id: taskId, user: session.user.id }) as ITask | null;
            
            if (task && !task.completed) {
              task.completeTask(completionDate);
              await task.save();
              completedTasks.push(convertTaskToEnhancedTask(task));
            }
          }
          
          result = {
            success: true,
            data: completedTasks,
            message: `${completedTasks.length} tasks marked as completed.`
          };
          break;
          
        case 'delete':
          // For 'delete' operation, we can use deleteMany
          const deleteResult = await Task.deleteMany(query);
          
          result = {
            success: true,
            data: { count: deleteResult.deletedCount, taskIds },
            message: `${deleteResult.deletedCount} tasks deleted.`
          };
          break;
          
        case 'update':
          // For 'update' operation, validate the data
          if (!data || typeof data !== 'object') {
            return NextResponse.json<ApiResponse<never>>({ 
              success: false, 
              message: 'No update data provided.' 
            }, { status: 400 });
          }
          
          // Perform updates for each task individually
          // This ensures proper handling of special cases like recurrence patterns
          const updatedTasks = [];
          
          for (const taskId of taskIds) {
            // Update the task with validation
            const updatedTask = await Task.findOneAndUpdate(
              { _id: taskId, user: session.user.id },
              data,
              { new: true, runValidators: true }
            ) as ITask | null;
            
            if (updatedTask) {
              updatedTasks.push(convertTaskToEnhancedTask(updatedTask));
            }
          }
          
          result = {
            success: true,
            data: updatedTasks,
            message: `${updatedTasks.length} tasks updated.`
          };
          break;
          
        default:
          // This should never happen due to validation above, but needed for TypeScript
          result = {
            success: false,
            message: 'Invalid operation'
          };
      }
      
      return NextResponse.json(result);
    }
    
    // Mock response for development without authentication
    const mockResult = {
      success: true,
      data: {
        count: taskIds.length,
        taskIds,
        details: `Mock ${operation} operation on ${taskIds.length} tasks`
      },
      message: `Mock batch operation: ${taskIds.length} tasks processed.`
    };
    
    return NextResponse.json<ApiResponse<any>>(mockResult);
  } catch (error) {
    console.error('Error in POST /api/tasks/batch:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error performing batch operation',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}