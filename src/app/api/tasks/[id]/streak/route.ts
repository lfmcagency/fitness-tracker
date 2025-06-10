export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { checkTaskStreakMilestones } from '@/lib/achievements/unlock';
import { TaskData, StreakInfo } from '@/types';
import { TaskStreakRequest } from '@/types/api/taskRequests';
import { isValidObjectId } from 'mongoose';

/**
 * GET /api/tasks/[id]/streak
 * Get streak information for a task
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
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Find task by ID with defensive error handling
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Calculate if the task is due today with defensive date handling
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
        currentStreak: task.currentStreak || 0,
        bestStreak: task.bestStreak || 0,
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
 * Update streak for a task + check achievement milestones
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
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Defensive request body parsing
      let body: TaskStreakRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Defensive date parsing
      let date = new Date();
      if (body?.date) {
        const parsedDate = new Date(body.date);
        if (isNaN(parsedDate.getTime())) {
          return apiError('Invalid date format', 400, 'ERR_INVALID_DATE');
        }
        date = parsedDate;
      }
      
      // Find task by ID with defensive error handling
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if task is due on the specified date with defensive error handling
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
      
      // Complete the task using the method that handles streak calculation
      try {
        task.completeTask(date);
        console.log(`🔥 [STREAK] New streak: ${task.currentStreak}`);
        
        // 🆕 CHECK ACHIEVEMENT MILESTONES 🆕
        let achievementResult;
        try {
          console.log('🏆 [STREAK] Checking achievement milestones...');
          achievementResult = await checkTaskStreakMilestones(userId, task.currentStreak);
          
          if (achievementResult.unlockedCount > 0) {
            console.log(`🎉 [STREAK] Unlocked ${achievementResult.unlockedCount} achievements!`, 
              achievementResult.achievements.map(a => a.title));
          }
        } catch (achievementError) {
          console.error('💥 [STREAK] Error checking achievement milestones:', achievementError);
          // Continue without failing the streak update
          achievementResult = { unlockedCount: 0, achievements: [] };
        }
        
        await task.save();
        console.log('💾 [STREAK] Task saved successfully');
        
        // Create streak info response
        const streakInfo: StreakInfo & { achievements?: any } = {
          taskId: task._id?.toString() || taskId,
          name: task.name || 'Unknown task',
          currentStreak: task.currentStreak || 0,
          bestStreak: task.bestStreak || 0,
          lastCompletedDate: task.lastCompletedDate ? task.lastCompletedDate.toISOString() : null,
          isDueToday: true, // We've just verified it's due
          completionHistory: Array.isArray(task.completionHistory) 
            ? task.completionHistory.map(date => date.toISOString()) 
            : []
        };
        
        // Add achievement info if any were unlocked
        if (achievementResult.unlockedCount > 0) {
          streakInfo.achievements = achievementResult;
        }
        
        const message = achievementResult.unlockedCount > 0
          ? `Streak updated successfully and ${achievementResult.unlockedCount} achievement(s) unlocked!`
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
 * Reset streak for a task
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
      
      // Additional validation for ObjectId format
      if (!isValidObjectId(taskId)) {
        return apiError('Invalid task ID format', 400, 'ERR_INVALID_ID');
      }
      
      // Find task by ID with defensive error handling
      const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
      
      if (!task) {
        return apiError('Task not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Reset the streak with error handling
      try {
        if (typeof task.resetStreak === 'function') {
          task.resetStreak();
        } else {
          // Fallback if method doesn't exist
          task.currentStreak = 0;
        }
        await task.save();
      } catch (error) {
        return handleApiError(error, 'Error resetting task streak');
      }
      
      // Create streak info response
      const streakInfo: StreakInfo = {
        taskId: task._id?.toString() || taskId,
        name: task.name || 'Unknown task',
        currentStreak: 0,
        bestStreak: task.bestStreak || 0,
        lastCompletedDate: null,
        isDueToday: false,
        completionHistory: []
      };
      
      return apiResponse(streakInfo, true, 'Streak reset successfully');
    } catch (error) {
      return handleApiError(error, 'Error resetting streak');
    }
  },
  AuthLevel.DEV_OPTIONAL
);