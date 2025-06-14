export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { convertTaskToTaskData, convertToTaskEventData } from '@/types/converters/taskConverters';
import { processEvent } from '@/lib/event-coordinator';
import { EthosContracts } from '@/lib/event-coordinator/contracts';
import { generateToken } from '@/lib/event-coordinator/logging';
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
    const validPatterns = ['once', 'daily', 'custom']; // UPDATED: Only 3 patterns
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
  
  // NEW: Validate domain category
  if (updates.domainCategory !== undefined) {
    const validCategories = ['ethos', 'trophe', 'soma'];
    if (!validCategories.includes(updates.domainCategory)) {
      return 'Invalid domain category';
    }
  }
  
  // NEW: Validate labels
  if (updates.labels !== undefined) {
    if (!Array.isArray(updates.labels)) {
      return 'Labels must be an array of strings';
    }
    if (updates.labels.some(label => typeof label !== 'string' || label.trim().length === 0)) {
      return 'All labels must be non-empty strings';
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
 * Updates a task with simplified event-driven logic
 */
export const PATCH = withAuth<TaskData | { task: TaskData; achievements?: any }, { id: string }>(
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
        console.log('📝 [TASK] PATCH updates received:', updates);
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
      console.log('📅 [TASK] Using completion date:', completionDate.toISOString());
      
      // Handle completion status changes - SIMPLIFIED
      if (updates.hasOwnProperty('completed')) {
        console.log('🎯 [TASK] Processing completion status change:', updates.completed);
        
        try {
          // Store previous state for event creation
          const previousState = {
            streak: existingTask.currentStreak,
            totalCompletions: existingTask.totalCompletions
          };
          
          if (updates.completed === true) {
            // Mark as completed
            console.log('✅ [TASK] Marking task as completed for date:', completionDate.toISOString());
            existingTask.completeTask(completionDate);
            console.log('📊 [TASK] After completeTask - streak:', existingTask.currentStreak, 'total:', existingTask.totalCompletions);
            
            // Apply other updates (except completion-related fields)
            const otherUpdates = { ...updates };
            delete otherUpdates.completed;
            delete otherUpdates.completionDate;
            
            if (Object.keys(otherUpdates).length > 0) {
              Object.assign(existingTask, otherUpdates);
            }
            
            // Save the task
            await existingTask.save();
            console.log('💾 [TASK] Task saved successfully');
            
            // Log the completion
            await TaskLog.logCompletion(
              existingTask._id,
              existingTask.user,
              'completed',
              completionDate,
              existingTask,
              'api'
            );
            
            // 🆕 FIRE EVENT TO NEW COORDINATOR 🆕
            try {
              const token = generateToken();
              const taskEventData = convertToTaskEventData(existingTask, 'completed', completionDate, previousState);
              const eventData = EthosContracts.taskCompletion(token, userId, taskEventData);
              const coordinatorResult = await processEvent(eventData);
              
              console.log('🎉 [TASK] Coordinator processing complete:', coordinatorResult);
              
              const taskData = convertTaskToTaskData(existingTask, completionDate);
              
              // Build response with achievement info if any were unlocked
              let message = 'Task marked as completed';
              if (coordinatorResult.achievementsUnlocked && coordinatorResult.achievementsUnlocked.length > 0) {
                message = `Task completed and ${coordinatorResult.achievementsUnlocked.length} achievement(s) unlocked!`;
              }
              
              return apiResponse({
                task: taskData,
                achievements: coordinatorResult.achievementsUnlocked && coordinatorResult.achievementsUnlocked.length > 0 ? {
                  unlockedCount: coordinatorResult.achievementsUnlocked.length,
                  achievements: coordinatorResult.achievementsUnlocked
                } : undefined
              }, true, message);
              
            } catch (coordinatorError) {
              console.error('💥 [TASK] Error processing coordinator event:', coordinatorError);
              
              const taskData = convertTaskToTaskData(existingTask, completionDate);
              return apiResponse({
                task: taskData,
                achievements: undefined
              }, true, 'Task completed, but event processing failed');
            }
            
          } else if (updates.completed === false) {
            // Mark as uncompleted
            console.log('❌ [TASK] Marking task as incomplete for date:', completionDate.toISOString());
            existingTask.uncompleteTask(completionDate);
            console.log('📊 [TASK] After uncompleteTask - streak:', existingTask.currentStreak, 'total:', existingTask.totalCompletions);
            
            // Apply other updates (except completion-related fields)
            const otherUpdates = { ...updates };
            delete otherUpdates.completed;
            delete otherUpdates.completionDate;
            
            if (Object.keys(otherUpdates).length > 0) {
              Object.assign(existingTask, otherUpdates);
            }
            
            // Save the task
            await existingTask.save();
            console.log('💾 [TASK] Task saved successfully');
            
            // Log the uncompletion
            await TaskLog.logCompletion(
              existingTask._id,
              existingTask.user,
              'uncompleted',
              completionDate,
              existingTask,
              'api'
            );
            
            // 🆕 FIRE EVENT TO NEW COORDINATOR (for uncompleted too) 🆕
            try {
              const token = generateToken();
              const taskEventData = convertToTaskEventData(existingTask, 'uncompleted', completionDate, previousState);
              const eventData = EthosContracts.taskCompletion(token, userId, taskEventData);
              await processEvent(eventData);
              console.log('✅ [TASK] Uncomplete event processed by coordinator');
            } catch (coordinatorError) {
              console.error('💥 [TASK] Error processing coordinator uncomplete event:', coordinatorError);
              // Continue - uncompletion still succeeded
            }
            
            const taskData = convertTaskToTaskData(existingTask, completionDate);
            return apiResponse(taskData, true, 'Task marked as incomplete');
          }
        } catch (error) {
          console.error('💥 [TASK] Error updating task completion:', error);
          return handleApiError(error, 'Error updating task completion');
        }
      }
      
      // Handle other updates (non-completion related) - SIMPLIFIED
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
        console.error('💥 [TASK] Error updating task:', error);
        return handleApiError(error, 'Error updating task');
      }
    } catch (error) {
      console.error('💥 [TASK] Unexpected error in PATCH /api/tasks/[id]:', error);
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
      console.error('💥 [TASK] Error in GET /api/tasks/[id]:', error);
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
      
      // Prevent deletion of system tasks via API
      if (existingTask.isSystemTask) {
        return apiError('System tasks cannot be deleted via API', 403, 'ERR_FORBIDDEN');
      }
      
      // Delete the task
      await Task.findOneAndDelete({ _id: taskId, user: userId });
      
      // NOTE: No need to fire coordinator events for deletions
      // The task is gone, so no progress implications
      
      return apiResponse({ id: taskId }, true, 'Task deleted successfully');
    } catch (error) {
      console.error('💥 [TASK] Error in DELETE /api/tasks/[id]:', error);
      return handleApiError(error, 'Error deleting task');
    }
  },
  AuthLevel.DEV_OPTIONAL
);