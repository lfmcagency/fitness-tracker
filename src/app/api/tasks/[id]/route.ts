export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
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
export const GET = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    const taskId = params.id;
    
    // Get query parameters
    const url = new URL(req.url);
    const includeHistoryParam = url.searchParams.get('includeHistory') === 'true';
    
    // Find task by ID
    const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
    
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Convert to enhanced task format
    const enhancedTask = convertTaskToEnhancedTask(task);
    
    // If includeHistory is not true, remove the completion history
    if (!includeHistoryParam && 'completionHistory' in enhancedTask) {
      delete enhancedTask.completionHistory;
    }
    
    return apiResponse(enhancedTask);
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
    
    const taskId = params.id;
    const updates = await req.json();
    
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
    
    // Special handling for task completion
    if (updates.hasOwnProperty('completed')) {
      // If marking as completed
      if (updates.completed === true && !existingTask.completed) {
        // Use the model method to properly update streak with current date
        existingTask.completeTask(updates.completionDate ? new Date(updates.completionDate) : new Date());
        
        // Remove the completionDate from updates as it's been handled
        delete updates.completionDate;
        
        // We'll handle 'completed' flag through the completeTask method
        delete updates.completed;
        
        // Apply any other updates
        Object.assign(existingTask, updates);
        
        // Save the task
        await existingTask.save();
        
        // Award XP for completing the task
        const { handleTaskXpAward } = await import('@/lib/task-utils');
        const xpResult = await handleTaskXpAward(userId, existingTask);
        
        // Return the updated task with XP info
        const enhancedTask = convertTaskToEnhancedTask(existingTask);
        
        return apiResponse({
          ...enhancedTask,
          xpAward: xpResult
        }, true, xpResult?.leveledUp 
          ? `Task completed! Level up to ${xpResult.newLevel}!` 
          : 'Task marked as completed and streak updated');
      }
      
      // If marking as incomplete and it was previously completed
      if (updates.completed === false && existingTask.completed) {
        // This will trigger the pre-save middleware to handle streak reset if needed
        existingTask.completed = false;
        
        // Apply any other updates
        delete updates.completed; // Already handled
        Object.assign(existingTask, updates);
        
        // Save the task
        await existingTask.save();
        
        // Return the updated task
        const enhancedTask = convertTaskToEnhancedTask(existingTask);
        return apiResponse(enhancedTask, true, 'Task marked as incomplete');
      }
    }
    
    // For other updates (not changing completion status)
    // Use findOneAndUpdate with validation
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, user: userId },
      updates,
      { new: true, runValidators: true }
    ) as ITask;
    
    // Convert to enhanced task format
    const enhancedTask = convertTaskToEnhancedTask(updatedTask);
    
    return apiResponse(enhancedTask, true, 'Task updated successfully');
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
    
    const taskId = params.id;
    
    // First check if the task exists and belongs to the user
    const existingTask = await Task.findOne({ 
      _id: taskId, 
      user: userId 
    });
    
    if (!existingTask) {
      return apiError('Task not found or you do not have permission to delete it', 404, 'ERR_NOT_FOUND');
    }
    
    // Delete the task
    await Task.findOneAndDelete({ _id: taskId, user: userId });
    
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
  // Validate name if provided
  if (updates.hasOwnProperty('name')) {
    if (typeof updates.name !== 'string' || updates.name.trim() === '') {
      return 'Task name must be a non-empty string';
    }
  }
  
  // Validate scheduledTime if provided
  if (updates.hasOwnProperty('scheduledTime')) {
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updates.scheduledTime)) {
      return 'Scheduled time must be in HH:MM format';
    }
  }
  
  // Validate recurrence pattern if provided
  if (updates.hasOwnProperty('recurrencePattern')) {
    if (!['daily', 'weekdays', 'weekends', 'weekly', 'custom'].includes(updates.recurrencePattern)) {
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
    if (!['low', 'medium', 'high'].includes(updates.priority)) {
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