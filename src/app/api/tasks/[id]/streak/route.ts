export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { convertToTaskEventData } from '@/types/converters/taskConverters';
import { processTaskEvent } from '@/lib/ethos/coordinator';
import { StreakInfo } from '@/types';
import { TaskStreakRequest } from '@/types/api/taskRequests';
import { isValidObjectId } from 'mongoose';

/**
 * GET /api/tasks/[id]/streak
 * Get streak information for a task (simplified)
 */
export const GET = withAuth<StreakInfo, { id: string }>(
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
      
      // Find task by ID
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Calculate if the task is due today
      let isDueToday = false;
      try {
        isDueToday = task.isTaskDueToday(new Date());
      } catch (error) {
        console.error('Error checking if task is due today:', error);
        // Continue without due check rather than failing the request
      }
      
      // Get streak information with defensive property access
      const streakInfo: StreakInfo = {
        taskId: task._id?.toString() || taskId,
        name: task.name || 'Unknown task',
        currentStreak: task.currentStreak || 0, // SIMPLIFIED: Direct from model
        bestStreak: Math.max(task.currentStreak || 0, task.totalCompletions || 0), // Rough estimate
        lastCompletedDate: task.lastCompletedDate ? task.lastCompletedDate.toISOString() : null,
        isDueToday,
        completionHistory: Array.isArray(task.completionHistory) 
          ? task.completionHistory.map(date => date.toISOString()) 
          : []
      };
      
      return apiResponse(streakInfo);
    } catch (error) {
      return handleApiError(error, 'Error fetching streak information');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/tasks/[id]/streak
 * Complete a task for streak purposes (simplified - just calls main completion logic)
 */
export const POST = withAuth<StreakInfo & { achievements?: any }, { id: string }>(
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
      let body: TaskStreakRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Parse date
      let date = new Date();
      if (body?.date) {
        const parsedDate = new Date(body.date);
        if (isNaN(parsedDate.getTime())) {
          return apiError('Invalid date format', 400, 'ERR_INVALID_DATE');
        }
        date = parsedDate;
      }
      
      // Find task by ID
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if task is due on the specified date
      let isDue = false;
      try {
        isDue = task.isTaskDueToday(date);
      } catch (error) {
        return handleApiError(error, 'Error checking if task is due');
      }
      
      if (!isDue) {
        return apiError('Task is not scheduled for this date', 400, 'ERR_INVALID_DATE');
      }
      
      console.log(`🎯 [STREAK] Completing task "${task.name}" for date: ${date.toISOString()}`);
      
      // Store previous state for event creation
      const previousState = {
        streak: task.currentStreak,
        totalCompletions: task.totalCompletions
      };
      
      // Complete the task using the method that handles streak calculation
      try {
        task.completeTask(date);
        console.log(`🔥 [STREAK] New streak: ${task.currentStreak}, total: ${task.totalCompletions}`);
        
        await task.save();
        console.log('💾 [STREAK] Task saved successfully');
        
        // Log the completion
        await TaskLog.logCompletion(
          task._id,
          task.user,
          'completed',
          date,
          task,
          'api'
        );
        
        // 🆕 FIRE EVENT TO COORDINATOR 🆕
        let coordinatorResult = { achievementsNotified: [] as string[] };
        try {
          const eventData = convertToTaskEventData(task, 'completed', date, previousState);
          coordinatorResult = await processTaskEvent(eventData);
          
          console.log('🎉 [STREAK] Coordinator processing complete:', coordinatorResult);
        } catch (coordinatorError) {
          console.error('💥 [STREAK] Error processing coordinator event:', coordinatorError);
          // Continue - streak update still succeeded
        }
        
        // Create streak info response
        const streakInfo: StreakInfo & { achievements?: any } = {
          taskId: task._id?.toString() || taskId,
          name: task.name || 'Unknown task',
          currentStreak: task.currentStreak || 0,
          bestStreak: Math.max(task.currentStreak || 0, task.totalCompletions || 0),
          lastCompletedDate: task.lastCompletedDate ? task.lastCompletedDate.toISOString() : null,
          isDueToday: true, // We've just verified it's due
          completionHistory: Array.isArray(task.completionHistory) 
            ? task.completionHistory.map(date => date.toISOString()) 
            : []
        };
        
        // Add achievement info if any were unlocked
        if (coordinatorResult.achievementsNotified.length > 0) {
          streakInfo.achievements = {
            unlockedCount: coordinatorResult.achievementsNotified.length,
            achievements: coordinatorResult.achievementsNotified
          };
        }
        
        const message = coordinatorResult.achievementsNotified.length > 0
          ? `Streak updated successfully and ${coordinatorResult.achievementsNotified.length} achievement(s) unlocked!`
          : 'Streak updated successfully';
        
        return apiResponse(streakInfo, true, message);
      } catch (error) {
        return handleApiError(error, 'Error updating task streak');
      }
    } catch (error) {
      return handleApiError(error, 'Error updating streak');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * DELETE /api/tasks/[id]/streak
 * Reset streak for a task (simplified)
 */
export const DELETE = withAuth<StreakInfo, { id: string }>(
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
      
      // Find task by ID
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Prevent resetting system task streaks
      if (task.isSystemTask) {
        return apiError('Cannot reset streak for system tasks', 403, 'ERR_FORBIDDEN');
      }
      
      // Reset the streak
      try {
        task.resetStreak();
        await task.save();
        
        console.log(`🔄 [STREAK] Reset streak for task: ${task.name}`);
      } catch (error) {
        return handleApiError(error, 'Error resetting task streak');
      }
      
      // Create streak info response
      const streakInfo: StreakInfo = {
        taskId: task._id?.toString() || taskId,
        name: task.name || 'Unknown task',
        currentStreak: 0,
        bestStreak: Math.max(0, task.totalCompletions || 0),
        lastCompletedDate: task.lastCompletedDate ? task.lastCompletedDate.toISOString() : null,
        isDueToday: false, // Assuming not due after reset
        completionHistory: [] // Reset completion history display
      };
      
      return apiResponse(streakInfo, true, 'Streak reset successfully');
    } catch (error) {
      return handleApiError(error, 'Error resetting streak');
    }
  },
  AuthLevel.DEV_OPTIONAL
);