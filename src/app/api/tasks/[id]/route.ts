export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';;
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EnhancedTask } from '@/types';
import { convertTaskToEnhancedTask } from '@/lib/task-utils';

/**
 * GET /api/tasks/[id]
 * 
 * Retrieves a specific task by ID
 */
export const GET = withAuth<ResponseType['data'], { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      if (!context?.params?.id) {
        return apiError('Missing ID parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const id = context.params.id;
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
    }
    
    // Get query parameters with defensive checks
    const url = new URL(req.url);
    const includeHistoryParam = url.searchParams.get('includeHistory') === 'true';
    
    // Find task by ID with defensive error handling
    let task = null;
    try {
      task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
    } catch (error) {
      return handleApiError(error, 'Error querying task database');
    }
    
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Convert to enhanced task format with defensive error handling
    let enhancedTask;
    try {
      enhancedTask = convertTaskToEnhancedTask(task);
    } catch (error) {
      console.error('Error converting task:', error);
      // Fallback to basic task properties if conversion fails
      enhancedTask = {
        id: task._id?.toString(),
        name: task.name || 'Unknown task',
        completed: !!task.completed,
        date: task.date?.toISOString() || new Date().toISOString()
      };
    }
    
    // If includeHistory is not true, remove the completion history
    if (!includeHistoryParam && enhancedTask && typeof enhancedTask === 'object' && 'completionHistory' in enhancedTask) {
      delete enhancedTask.completionHistory;
    }
    
    return apiResponse(enhancedTask || {});
  } catch (error) {
    return handleApiError(error, 'Error fetching task details');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PATCH /api/tasks/[id]
 * 
 * Updates a task with validation and proper streak handling
 */
export const PATCH = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Defensive taskId validation
    const taskId = params?.id;
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
    }
    
    // Defensive request body parsing
    let updates;
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
    let existingTask = null;
    try {
      existingTask = await Task.findOne({ 
        _id: taskId, 
        user: userId 
      }) as ITask | null;
    } catch (error) {
      return handleApiError(error, 'Error querying task database');
    }
    
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
          let xpResult = null;
          try {
            const { handleTaskXpAward } = await import('@/lib/task-utils');
            xpResult = await handleTaskXpAward(userId, existingTask);
          } catch (error) {
            console.error('Error awarding XP:', error);
            // Continue without XP award rather than failing the request
          }
          
          // Return the updated task with XP info
          const enhancedTask = convertTaskToEnhancedTask(existingTask);
          
          return apiResponse({
            ...enhancedTask,
            xpAward: xpResult
          }, true, xpResult?.leveledUp 
            ? `Task completed! Level up to ${xpResult.newLevel}!` 
            : 'Task marked as completed and streak updated');
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
      
      // Convert to enhanced task format with error handling
      let enhancedTask;
      try {
        enhancedTask = convertTaskToEnhancedTask(updatedTask);
      } catch (error) {
        console.error('Error converting task:', error);
        enhancedTask = {
          id: updatedTask._id?.toString(),
          name: updatedTask.name || 'Unknown task',
          completed: !!updatedTask.completed
        };
      }
      
      return apiResponse(enhancedTask, true, 'Task updated successfully');
    } catch (error) {
      return handleApiError(error, 'Error updating task');
    }
  } catch (error) {
    return handleApiError(error, 'Error updating task');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * DELETE /api/tasks/[id]
 * 
 * Deletes a task after verifying user ownership
 */
export const DELETE = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Defensive taskId validation
    const taskId = params?.id;
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
    }
    
    // First check if the task exists and belongs to the user
    let existingTask = null;
    try {
      existingTask = await Task.findOne({ 
        _id: taskId, 
        user: userId 
      });
    } catch (error) {
      return handleApiError(error, 'Error querying task database');
    }
    
    if (!existingTask) {
      return apiError('Task not found or you do not have permission to delete it', 404, 'ERR_NOT_FOUND');
    }
    
    // Delete the task with error handling
    try {
      await Task.findOneAndDelete({ _id: taskId, user: userId });
    } catch (error) {
      return handleApiError(error, 'Error deleting task from database');
    }
    
    return apiResponse({ id: taskId }, true, 'Task deleted successfully');
  } catch (error) {
    return handleApiError(error, 'Error deleting task');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * Helper function to validate task updates
 * Returns error message if validation fails, or undefined if validation passes
 */
function validateTaskUpdates(updates: any): string | undefined {
  if (!updates || typeof updates !== 'object') {
    return 'Updates must be a valid object';
  }
  
  // Validate name if provided
  if (updates.hasOwnProperty('name')) {
    if (typeof updates.name !== 'string' || updates.name.trim() === '') {
      return 'Task name must be a non-empty string';
    }
  }
  
  // Validate scheduledTime if provided
  if (updates.hasOwnProperty('scheduledTime')) {
    if (typeof updates.scheduledTime !== 'string' || 
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updates.scheduledTime)) {
      return 'Scheduled time must be in HH:MM format';
    }
  }
  
  // Validate recurrence pattern if provided
  if (updates.hasOwnProperty('recurrencePattern')) {
    if (typeof updates.recurrencePattern !== 'string' ||
        !['daily', 'weekdays', 'weekends', 'weekly', 'custom'].includes(updates.recurrencePattern)) {
      return 'Invalid recurrence pattern. Must be one of: daily, weekdays, weekends, weekly, custom';
    }
    
    // If changing to custom recurrence pattern, validate customRecurrenceDays
    if (updates.recurrencePattern === 'custom') {
      if (!updates.hasOwnProperty('customRecurrenceDays') ||
          !Array.isArray(updates.customRecurrenceDays) || 
          updates.customRecurrenceDays.length === 0 ||
          !updates.customRecurrenceDays.every((day: any) => 
            typeof day === 'number' && day >= 0 && day <= 6
          )) {
        return 'Custom recurrence days must be a non-empty array of numbers 0-6 (Sunday to Saturday)';
      }
    }
  }
  
  // Validate customRecurrenceDays separately if provided
  if (updates.hasOwnProperty('customRecurrenceDays') && !updates.hasOwnProperty('recurrencePattern')) {
    if (!Array.isArray(updates.customRecurrenceDays) || 
        updates.customRecurrenceDays.length === 0 ||
        !updates.customRecurrenceDays.every((day: any) => 
          typeof day === 'number' && day >= 0 && day <= 6
        )) {
      return 'Custom recurrence days must be a non-empty array of numbers 0-6 (Sunday to Saturday)';
    }
  }
  
  // Validate priority if provided
  if (updates.hasOwnProperty('priority')) {
    if (typeof updates.priority !== 'string' ||
        !['low', 'medium', 'high'].includes(updates.priority)) {
      return 'Priority must be one of: low, medium, high';
    }
  }
  
  // Validate category if provided
  if (updates.hasOwnProperty('category')) {
    if (typeof updates.category !== 'string' || updates.category.trim() === '') {
      return 'Category must be a non-empty string';
    }
  }
  
  // Validate date if provided
  if (updates.hasOwnProperty('date')) {
    const date = new Date(updates.date);
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
  }
  
  // Validate completionDate if provided (for task completion)
  if (updates.hasOwnProperty('completionDate')) {
    const date = new Date(updates.completionDate);
    if (isNaN(date.getTime())) {
      return 'Invalid completion date format';
    }
  }
  
  // All validations passed
  return undefined;
}