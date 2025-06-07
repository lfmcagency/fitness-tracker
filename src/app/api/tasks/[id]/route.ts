export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { convertTaskToTaskData, handleTaskXpAward } from '@/lib/task-utils';
import { TaskData } from '@/types';
import { UpdateTaskRequest } from '@/types/api/taskRequests';
import { isValidObjectId } from 'mongoose';

/**
 * Helper function to validate task updates
 */
function validateTaskUpdates(updates: Partial<UpdateTaskRequest>): string | undefined {
  if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
    return 'Task name cannot be empty';
  }
  
  if (updates.scheduledTime !== undefined) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(updates.scheduledTime)) {
      return 'Invalid scheduled time format. Use HH:MM';
    }
  }
  
  if (updates.recurrencePattern !== undefined) {
    const validPatterns = ['once', 'daily', 'weekdays', 'weekends', 'weekly', 'custom'];
    if (!validPatterns.includes(updates.recurrencePattern)) {
      return 'Invalid recurrence pattern';
    }
  }
  
  if (updates.priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(updates.priority)) {
      return 'Invalid priority level';
    }
  }
  
  return undefined;
}

/**
 * Helper function to parse and validate completion date
 */
function parseCompletionDate(dateString?: string): Date {
  if (!dateString) {
    return new Date();
  }
  
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  
  return parsed;
}

/**
 * PATCH /api/tasks/[id]
 * Updates a task with validation and proper streak handling
 */
export const PATCH = withAuth<TaskData | { task: TaskData; xpAward: any }, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate taskId parameter
      const taskId = context?.params?.id;
      if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
        return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
      }
      
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Parse request body
      let updates: UpdateTaskRequest & { completionDate?: string };
      try {
        updates = await req.json();
        console.log('PATCH updates received:', updates);
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      if (!updates || typeof updates !== 'object') {
        return apiError('Updates must be a valid object', 400, 'ERR_INVALID_FORMAT');
      }
      
      // Validate updates
      const validationError = validateTaskUpdates(updates);
      if (validationError) {
        return apiError(validationError, 400, 'ERR_VALIDATION');
      }
      
      // Find the task
      const existingTask = await Task.findOne({ 
        _id: taskId, 
        user: userId 
      }) as ITask | null;
      
      if (!existingTask) {
        return apiError('Task not found or you do not have permission to update it', 404, 'ERR_NOT_FOUND');
      }
      
      // Parse completion date for all operations
      const completionDate = parseCompletionDate(updates.completionDate);
      console.log('Using completion date:', completionDate.toISOString());
      
      // Handle completion status changes
      if (updates.hasOwnProperty('completed')) {
        console.log('Processing completion status change:', updates.completed);
        
        try {
          if (updates.completed === true) {
            // Mark as completed
            console.log('Marking task as completed for date:', completionDate.toISOString());
            existingTask.completeTask(completionDate);
            console.log('After completeTask - completion history:', existingTask.completionHistory.map(d => d.toISOString()));
            console.log('Current streak:', existingTask.currentStreak);
            
            // Apply other updates (except completion-related fields)
            const otherUpdates = { ...updates };
            delete otherUpdates.completed;
            delete otherUpdates.completionDate;
            
            if (Object.keys(otherUpdates).length > 0) {
              Object.assign(existingTask, otherUpdates);
            }
            
            // Save the task
            await existingTask.save();
            console.log('Task saved successfully');
            
            // Award XP
            try {
              const xpResult = await handleTaskXpAward(userId, existingTask);
              console.log('XP awarded:', xpResult);
              
              const taskData = convertTaskToTaskData(existingTask, completionDate);
              
              return apiResponse({
                task: taskData,
                xpAward: xpResult
              }, true, xpResult.leveledUp 
                ? `Task completed! Level up to ${xpResult.newLevel}!` 
                : 'Task marked as completed and streak updated');
            } catch (xpError) {
              console.error('Error awarding XP:', xpError);
              
              const taskData = convertTaskToTaskData(existingTask, completionDate);
              return apiResponse(taskData, true, 'Task marked as completed, but XP could not be awarded');
            }
            
          } else if (updates.completed === false) {
            // Mark as uncompleted
            console.log('Marking task as incomplete for date:', completionDate.toISOString());
            existingTask.uncompleteTask(completionDate);
            console.log('After uncompleteTask - completion history:', existingTask.completionHistory.map(d => d.toISOString()));
            console.log('Current streak:', existingTask.currentStreak);
            
            // Apply other updates (except completion-related fields)
            const otherUpdates = { ...updates };
            delete otherUpdates.completed;
            delete otherUpdates.completionDate;
            
            if (Object.keys(otherUpdates).length > 0) {
              Object.assign(existingTask, otherUpdates);
            }
            
            // Save the task
            await existingTask.save();
            console.log('Task saved successfully');
            
            const taskData = convertTaskToTaskData(existingTask, completionDate);
            return apiResponse(taskData, true, 'Task marked as incomplete');
          }
        } catch (error) {
          console.error('Error updating task completion:', error);
          return handleApiError(error, 'Error updating task completion');
        }
      }
      
      // Handle other updates (non-completion related)
      try {
        const updatedTask = await Task.findOneAndUpdate(
          { _id: taskId, user: userId },
          updates,
          { new: true, runValidators: true }
        ) as ITask | null;
        
        if (!updatedTask) {
          return apiError('Task not found or could not be updated', 404, 'ERR_UPDATE_FAILED');
        }
        
        const taskData = convertTaskToTaskData(updatedTask, completionDate);
        return apiResponse(taskData, true, 'Task updated successfully');
      } catch (error) {
        console.error('Error updating task:', error);
        return handleApiError(error, 'Error updating task');
      }
    } catch (error) {
      console.error('Unexpected error in PATCH /api/tasks/[id]:', error);
      return handleApiError(error, 'Error updating task');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * GET /api/tasks/[id]
 * Retrieves a specific task by ID
 */
export const GET = withAuth<TaskData, { id: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      await dbConnect();
      
      // Validate taskId parameter
      const taskId = context?.params?.id;
      if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
        return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
      }
      
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Get query parameters
      const url = new URL(req.url);
      const includeHistoryParam = url.searchParams.get('includeHistory') === 'true';
      const dateParam = url.searchParams.get('date');
      
      // Find task by ID
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Parse date parameter for date-specific completion checking
      let checkDate = new Date();
      if (dateParam) {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          checkDate = parsedDate;
        }
      }
      
      // Convert to TaskData format with date-specific completion
      const taskData = convertTaskToTaskData(task, checkDate);
      
      // Remove completion history if not requested
      if (!includeHistoryParam && taskData && 'completionHistory' in taskData) {
        delete taskData.completionHistory;
      }
      
      return apiResponse(taskData);
    } catch (error) {
      console.error('Error in GET /api/tasks/[id]:', error);
      return handleApiError(error, 'Error fetching task details');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/tasks/[id]
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
      
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Check if task exists and belongs to user
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
      console.error('Error in DELETE /api/tasks/[id]:', error);
      return handleApiError(error, 'Error deleting task');
    }
  },
  AuthLevel.DEV_OPTIONAL
);