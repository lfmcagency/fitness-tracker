// src/app/api/tasks/[id]/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { convertTaskToTaskData } from '@/types/converters/taskConverters';
import { generateToken } from '@/lib/event-coordinator';
import { processEvent } from '@/lib/event-coordinator';
import { reverseEvent, findTaskCompletionEvent } from '@/lib/event-coordinator/reverse';
import { TaskData } from '@/types';

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

export const PATCH = withAuth<any>(async (req: NextRequest, userId: string, context) => {
  const token = generateToken();
  const taskId = (context?.params as { id?: string })?.id;
  
  console.log(`🎯 [TASK-API] PATCH started with token: ${token}`);
  
  try {
    await dbConnect();
    console.log(`📍 [TOKEN] ${token} → db_connected`);
    
    const updates = await req.json();
    console.log(`📝 [TASK-API] PATCH updates received:`, updates);
    
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }
    console.log(`📍 [TOKEN] ${token} → task_found`);

    const completionDate = updates.completionDate ? 
      new Date(updates.completionDate) : new Date();
    console.log(`📅 [TASK-API] Using completion date:`, completionDate);

    // Handle completion status changes with event system
    if ('completed' in updates) {
      const wasCompleted = task.isCompletedOnDate(completionDate);
      const willBeCompleted = updates.completed;
      
      console.log(`🎯 [TASK-API] Processing completion status change: ${willBeCompleted}`);
      
      if (willBeCompleted && !wasCompleted) {
        // COMPLETION: Fire event as usual
        console.log(`✅ [TASK-API] Marking task as completed for date:`, completionDate);
        
        // Store previous state for event
        const previousStreak = task.currentStreak;
        const previousTotal = task.totalCompletions;
        
        // Update task
        task.completeTask(completionDate);
        console.log(`📊 [TASK-API] After completeTask - streak: ${task.currentStreak} total: ${task.totalCompletions}`);
        
        await task.save();
        console.log(`📍 [TOKEN] ${token} → task_saved`);
        
        // Fire completion event with taskId
        console.log(`🎯 [TASK-API] Calling rich coordinator for completion...`);
        console.log(`📍 [TOKEN] ${token} → coordinator_call_start`);
        
        const eventData = {
          token,
          userId,
          source: 'ethos' as const,
          action: 'task_completed',
          timestamp: new Date(),
          metadata: {
            taskId: taskId, // 🆕 Include task ID for reversal matching
            taskEventData: {
              taskId: task._id.toString(),
              taskName: task.name,
              completionDate: completionDate.toISOString(),
              previousStreak,
              previousTotalCompletions: previousTotal,
              currentStreak: task.currentStreak,
              totalCompletions: task.totalCompletions,
              completionHistory: task.completionHistory || []
            }
          }
        };
        
        console.log(`📋 [TASK-API] Firing rich event:`, {
          token: eventData.token,
          action: eventData.action,
          taskName: task.name,
          streakCount: task.currentStreak
        });
        
        const coordinatorResult = await processEvent(eventData);
        console.log(`📍 [TOKEN] ${token} → coordinator_complete`);
        
        console.log(`🎉 [TASK-API] Rich coordinator processing complete:`, {
          success: coordinatorResult.success,
          achievementsUnlocked: coordinatorResult.achievementsUnlocked?.length || 0,
          token: coordinatorResult.token
        });
        
        const taskData = convertTaskToTaskData(task);
        return apiResponse({
          task: taskData,
          achievements: coordinatorResult.achievementsUnlocked || [],
          token: coordinatorResult.token
        }, true, 'Task completed successfully');
        
      } else if (!willBeCompleted && wasCompleted) {
        // UNCOMPLETION: Use reverse flow instead of new event
        console.log(`🔄 [TASK-API] Unmarking task - finding original completion event...`);
        
        // Find original completion token
        const originalToken = await findTaskCompletionEvent(
          userId,
          taskId!, // Use task ID for precise matching
          completionDate,
          7 // Look back 7 days
        );
        
        if (originalToken) {
          console.log(`📋 [TASK-API] Found original completion token: ${originalToken}`);
          console.log(`🔄 [TASK-API] Reversing original event...`);
          
          // Reverse the original event
          const reverseResult = await reverseEvent(
            originalToken,
            userId,
            `Task uncompletion via API (${taskId})`
          );
          
          if (reverseResult.success) {
            // Update task state after successful reversal
            task.uncompleteTask(completionDate);
            await task.save();
            
            console.log(`✅ [TASK-API] Event reversal complete:`, {
              originalToken,
              reverseToken: reverseResult.token,
              success: true
            });
            
            const taskData = convertTaskToTaskData(task);
            return apiResponse({
              task: taskData,
              originalToken,
              reverseToken: reverseResult.token,
              reversalData: reverseResult.progressResult
            }, true, 'Task uncompletion reversed successfully');
          } else {
            console.error(`💥 [TASK-API] Event reversal failed:`, reverseResult.error);
            return apiError(`Reversal failed: ${reverseResult.error}`, 500, 'ERR_REVERSAL_FAILED');
          }
        } else {
          // No original event found - fallback to direct update
          console.log(`⚠️ [TASK-API] No original completion event found - using fallback`);
          
          task.uncompleteTask(completionDate);
          await task.save();
          
          const taskData = convertTaskToTaskData(task);
          return apiResponse({
            task: taskData,
            warning: 'No original completion event found for reversal'
          }, true, 'Task uncompleted (no original event found)');
        }
      }
    }

    // Handle other field updates (no events needed)
    const allowedUpdates = ['name', 'description', 'scheduledTime', 'labels', 'category', 'priority'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        (task as any)[key] = value;
      }
    }

    await task.save();
    console.log(`📍 [TOKEN] ${token} → task_updated`);

    const taskData = convertTaskToTaskData(task);
    return apiResponse(taskData, true, 'Task updated successfully');
    
  } catch (error) {
    console.error(`💥 [TASK-API] PATCH failed with token: ${token}`, error);
    return handleApiError(error, 'Error updating task');
  }
});

export const DELETE = withAuth<{ deleted: boolean }>(async (req: NextRequest, userId: string, context) => {
  try {
    await dbConnect();
    
    const params = context?.params as { id?: string };
    const task = await Task.findOneAndDelete({ _id: params?.id, user: userId });
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }

    return apiResponse({ deleted: true }, true, 'Task deleted successfully');
  } catch (error) {
    return handleApiError(error, 'Error deleting task');
  }
});