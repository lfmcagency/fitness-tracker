// src/app/api/tasks/[id]/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { convertTaskToTaskData } from '@/types/converters/taskConverters';
import { processEvent, reverseEvent, generateToken } from '@/lib/event-coordinator';
import { findRecentEvents } from '@/lib/event-coordinator/reverse';
import { extractAchievements } from '@/lib/shared-utilities';
import { getTodayString, isSameDay } from '@/lib/shared-utilities';
import { TaskData } from '@/types';

// Same-day validation helper
function validateSameDay(targetDate: Date): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  if (target.getTime() !== today.getTime()) {
    throw new Error('Can only modify today\'s data. Yesterday is locked history.');
  }
}

export const GET = withAuth<TaskData>(async (req: NextRequest, userId: string, context) => {
  try {
    await dbConnect();
    const taskId = (context?.params as { id?: string })?.id;
    
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }

    const taskData = convertTaskToTaskData(task);
    return apiResponse(taskData, true, 'Task retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving task');
  }
});

// Task creation with event firing
export const POST = withAuth<TaskData>(async (req: NextRequest, userId: string) => {
  const token = generateToken();
  
  try {
    await dbConnect();
    
    // Parse request body
    let taskData;
    try {
      taskData = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    if (!taskData || typeof taskData !== 'object') {
      return apiError('Invalid task data', 400, 'ERR_INVALID_FORMAT');
    }
    
    // Basic validation
    if (!taskData.name || typeof taskData.name !== 'string' || !taskData.name.trim()) {
      return apiError('Task name is required', 400, 'ERR_VALIDATION');
    }
    
    if (!taskData.scheduledTime || typeof taskData.scheduledTime !== 'string') {
      return apiError('Scheduled time is required', 400, 'ERR_VALIDATION');
    }
    
    // Validate time format (HH:MM)
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(taskData.scheduledTime)) {
      return apiError('Invalid time format. Use HH:MM format.', 400, 'ERR_VALIDATION');
    }
    
    // Create the task
    const taskToCreate = {
      ...taskData,
      user: userId,
      completed: false,
      currentStreak: 0,
      totalCompletions: 0,
      date: taskData.date ? new Date(taskData.date) : new Date(),
      domainCategory: taskData.domainCategory || 'ethos',
      labels: taskData.labels || [],
      isSystemTask: taskData.isSystemTask || false,
    };
    
    const newTask = await Task.create(taskToCreate);
    
    // Fire creation event
    const taskEvent = {
      token,
      userId,
      source: 'ethos' as const,
      action: 'task_created' as const,
      timestamp: new Date(),
      taskData: {
        taskId: newTask._id.toString(),
        taskName: newTask.name,
        streakCount: 0,
        totalCompletions: 0
      }
    };
    
    try {
      await processEvent(taskEvent);
    } catch (coordinatorError) {
      console.error('💥 [TASK-CREATE] Error processing coordinator event:', coordinatorError);
      // Continue - task creation still succeeded
    }
    
    const taskDataResult = convertTaskToTaskData(newTask);
    
    return apiResponse(taskDataResult, true, 'Task created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'Error creating task');
  }
});

export const PATCH = withAuth<any>(async (req: NextRequest, userId: string, context) => {
  const token = generateToken();
  const taskId = (context?.params as { id?: string })?.id;
  
  try {
    await dbConnect();
    const updates = await req.json();
    
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }

    const completionDate = updates.completionDate ? new Date(updates.completionDate) : new Date();

    // Handle completion/uncompletion with events
    if ('completed' in updates) {
      const wasCompleted = task.isCompletedOnDate(completionDate);
      const willBeCompleted = updates.completed;
      
      // Same-day validation for any completion changes
      try {
        validateSameDay(completionDate);
      } catch (error) {
        return apiError(error instanceof Error ? error.message : 'Same-day validation failed', 403, 'ERR_HISTORICAL_EDIT');
      }
      
      if (willBeCompleted && !wasCompleted) {
        // COMPLETION: Store previous state, update task, fire event
        const previousState = {
          streak: task.currentStreak,
          totalCompletions: task.totalCompletions,
          completed: false
        };
        
        task.completeTask(completionDate);
        await task.save();
        
        // Build simple TaskEvent
        const taskEvent = {
          token,
          userId,
          source: 'ethos' as const,
          action: 'task_completed' as const,
          timestamp: new Date(),
          taskData: {
            taskId: task._id.toString(),
            taskName: task.name,
            streakCount: task.currentStreak,
            totalCompletions: task.totalCompletions,
            completionDate: completionDate.toISOString(),
            previousState
          }
        };
        
        // Fire to coordinator
        const result = await processEvent(taskEvent);
        const achievements = extractAchievements(result);
        
        const taskData = convertTaskToTaskData(task);
        return apiResponse({
          task: taskData,
          achievements: achievements ? {
            unlockedCount: achievements.unlockedCount,
            achievements: achievements.achievements
          } : undefined,
          token: result.token
        }, true, 'Task completed successfully');
        
      } else if (!willBeCompleted && wasCompleted) {
        // UNCOMPLETION: Find original token and reverse
        const recentEvents = await findRecentEvents(userId, 50);
        const originalEvent = recentEvents.find(event => 
          event.action === 'task_completed' && 
          event.token && // Has token
          event.timestamp.toDateString() === completionDate.toDateString() // Same day
        );
        
        if (!originalEvent) {
          return apiError('No original completion event found for today', 404, 'ERR_NO_ORIGINAL_EVENT');
        }
        
        // Reverse the original event
        const reverseResult = await reverseEvent(originalEvent.token, userId);
        
        if (!reverseResult.success) {
          return apiError(`Reversal failed: ${reverseResult.error}`, 500, 'ERR_REVERSAL_FAILED');
        }
        
        // Update task after successful reversal
        task.uncompleteTask(completionDate);
        await task.save();
        
        const taskData = convertTaskToTaskData(task);
        return apiResponse({
          task: taskData,
          originalToken: originalEvent.token,
          reverseToken: reverseResult.token
        }, true, 'Task uncompletion reversed successfully');
      }
    }

    // Handle other field updates (same-day validation for edits)
    const allowedUpdates = ['name', 'description', 'scheduledTime', 'labels', 'category', 'priority'];
    let hasUpdates = false;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        (task as any)[key] = value;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await task.save();
    }

    const taskData = convertTaskToTaskData(task);
    return apiResponse(taskData, true, 'Task updated successfully');
    
  } catch (error) {
    return handleApiError(error, 'Error updating task');
  }
});

export const DELETE = withAuth<{ deleted: boolean }>(async (req: NextRequest, userId: string, context) => {
  const token = generateToken();
  
  try {
    await dbConnect();
    
    const taskId = (context?.params as { id?: string })?.id;
    const task = await Task.findOne({ _id: taskId, user: userId });
    
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Same-day validation for deletion
    try {
      validateSameDay(task.date);
    } catch (error) {
      return apiError(error instanceof Error ? error.message : 'Same-day validation failed', 403, 'ERR_HISTORICAL_DELETE');
    }
    
    // Store data before deletion
    const taskData = {
      taskId: task._id.toString(),
      taskName: task.name,
      streakCount: task.currentStreak,
      totalCompletions: task.totalCompletions
    };
    
    // Delete task
    await Task.findOneAndDelete({ _id: taskId, user: userId });
    
    // Fire deletion event
    const taskEvent = {
      token,
      userId,
      source: 'ethos' as const,
      action: 'task_deleted' as const,
      timestamp: new Date(),
      taskData
    };
    
    await processEvent(taskEvent);
    
    return apiResponse({ deleted: true }, true, 'Task deleted successfully');
  } catch (error) {
    return handleApiError(error, 'Error deleting task');
  }
});