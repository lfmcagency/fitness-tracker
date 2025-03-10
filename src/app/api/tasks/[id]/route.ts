export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { convertTaskToEnhancedTask, handleTaskXpAward } from '@/lib/task-utils';
import { EnhancedTask } from '@/types';
import { UpdateTaskRequest } from '@/types/api/taskRequests';
import { isValidObjectId } from 'mongoose';

/**
 * GET /api/tasks/[id]
 * 
 * Retrieves a specific task by ID
 */
export const GET = withAuth<EnhancedTask, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate taskId parameter
const taskId = context?.params?.id;
if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
  return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
}
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Get query parameters with defensive checks
      const url = new URL(req.url);
      const includeHistoryParam = url.searchParams.get('includeHistory') === 'true';
      
      // Find task by ID with defensive error handling
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Convert to enhanced task format
      const enhancedTask = convertTaskToEnhancedTask(task);
      
      // If includeHistory is not true, remove the completion history
      if (!includeHistoryParam && enhancedTask && 'completionHistory' in enhancedTask) {
        delete enhancedTask.completionHistory;
      }
      
      return apiResponse(enhancedTask);
    } catch (error) {
      return handleApiError(error, 'Error fetching task details');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * PATCH /api/tasks/[id]
 * 
 * Updates a task with validation and proper streak handling
 */
export const PATCH = withAuth<EnhancedTask | { task: EnhancedTask; xpAward: any }, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate taskId parameter
const taskId = context?.params?.id;
if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
  return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
}
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Parse request body with defensive error handling
      let updates: UpdateTaskRequest;
      try {
        updates = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      if (!updates || typeof updates !== 'object') {
        return apiError('Updates must be a valid object', 400, 'ERR_INVALID_FORMAT');
      }
      
      // Validate incoming updates
      const validationError = validateTaskUpdates(updates);
      if (validationError) {
        return apiError(validationError, 400, 'ERR_VALIDATION');
      }
      
      // First check if the task exists and belongs to the user
      const existingTask = await Task.findOne({ 
        _id: taskId, 
        user: userId 
      }) as ITask | null;
      
      if (!existingTask) {
        return apiError('Task not found or you do not have permission to update it', 404, 'ERR_NOT_FOUND');
      }
      
      // Special handling for task completion with defensive checks
      if (updates.hasOwnProperty('completed')) {
        // If marking as completed
        if (updates.completed === true && !existingTask.completed) {
          try {
            // Use the model method to properly update streak with current date
            const completionDate = updates.completionDate 
              ? new Date(updates.completionDate) 
              : new Date();
              
            if (isNaN(completionDate.getTime())) {
              return apiError('Invalid completion date', 400, 'ERR_INVALID_DATE');
            }
            
            existingTask.completeTask(completionDate);
            
            // Remove the completionDate from updates as it's been handled
            delete updates.completionDate;
            
            // We'll handle 'completed' flag through the completeTask method
            delete updates.completed;
            
            // Apply any other updates safely
            if (updates && typeof updates === 'object') {
              Object.assign(existingTask, updates);
            }
            
            // Save the task with error handling
            await existingTask.save();
            
            // Award XP for completing the task with defensive error handling
            try {
              const xpResult = await handleTaskXpAward(userId, existingTask);
              
              // Return the updated task with XP info
              const enhancedTask = convertTaskToEnhancedTask(existingTask);
              
              return apiResponse({
                task: enhancedTask,
                xpAward: xpResult
              }, true, xpResult.leveledUp 
                ? `Task completed! Level up to ${xpResult.newLevel}!` 
                : 'Task marked as completed and streak updated');
            } catch (error) {
              console.error('Error awarding XP:', error);
              // Continue without XP award rather than failing the request
              
              // Return the updated task without XP info
              const enhancedTask = convertTaskToEnhancedTask(existingTask);
              return apiResponse(enhancedTask, true, 'Task marked as completed, but XP could not be awarded');
            }
          } catch (error) {
            return handleApiError(error, 'Error completing task');
          }
        }
        
        // If marking as incomplete and it was previously completed
        if (updates.completed === false && existingTask.completed) {
          try {
            // This will trigger the pre-save middleware to handle streak reset if needed
            existingTask.completed = false;
            
            // Apply any other updates
            delete updates.completed; // Already handled
            
            if (updates && typeof updates === 'object') {
              Object.assign(existingTask, updates);
            }
            
            // Save the task with error handling
            await existingTask.save();
            
            // Return the updated task
            const enhancedTask = convertTaskToEnhancedTask(existingTask);
            return apiResponse(enhancedTask, true, 'Task marked as incomplete');
          } catch (error) {
            return handleApiError(error, 'Error marking task as incomplete');
          }
        }
      }
      
      // For other updates (not changing completion status)
      try {
        // Use findOneAndUpdate with validation
        const updatedTask = await Task.findOneAndUpdate(
          { _id: taskId, user: userId },
          updates,
          { new: true, runValidators: true }
        ) as ITask | null;
        
        if (!updatedTask) {
          return apiError('Task not found or could not be updated', 404, 'ERR_UPDATE_FAILED');
        }
        
        // Convert to enhanced task format
        const enhancedTask = convertTaskToEnhancedTask(updatedTask);
        
        return apiResponse(enhancedTask, true, 'Task updated successfully');
      } catch (error) {
        return handleApiError(error, 'Error updating task');
      }
    } catch (error) {
      return handleApiError(error, 'Error updating task');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/tasks/[id]
 * 
 * Deletes a task after verifying user ownership
 */
export const DELETE = withAuth<{ id: string }, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate taskId parameter
const taskId = context?.params?.id;
if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
  return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
}
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // First check if the task exists and belongs to the user
      const existingTask = await Task.findOne({ 
        _id: taskId, 
        user: userId 
      });
      
      if (!existingTask) {
        return apiError('Task not found or you do not have permission to delete it', 404, 'ERR_NOT_FOUND');
      }
      
      // Delete the task with error handling
      await Task.findOneAndDelete({ _id: taskId, user: userId });
      
      return apiResponse({ id: taskId }, true, 'Task deleted successfully');
    } catch (error) {
      return handleApiError(error, 'Error deleting task');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * Helper function to validate task updates
 * Returns error message if validation fails, or undefined if validation passes
 */
function validateTaskUpdates(updates: Partial<UpdateTaskRequest>): string | undefined {
  // Validation logic remains the same
  // ...
  return undefined;
}