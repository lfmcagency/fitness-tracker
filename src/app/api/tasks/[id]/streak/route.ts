export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/tasks/[id]/streak
 * 
 * Get streak information for a task
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
    
    // Calculate if the task is due today with defensive date handling
    let isDueToday = false;
    try {
      isDueToday = task.isTaskDueToday(new Date());
    } catch (error) {
      console.error('Error checking if task is due today:', error);
      // Continue without due check rather than failing the request
    }
    
    // Get streak information with defensive property access
    const streakInfo = {
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
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/tasks/[id]/streak
 * 
 * Update streak for a task
 */
export const POST = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Defensive taskId validation
    const taskId = params?.id;
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
    }
    
    // Defensive request body parsing
    let body;
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
    let task = null;
    try {
      task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
    } catch (error) {
      return handleApiError(error, 'Error querying task database');
    }
    
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
    
    // Complete the task using the method that handles streak calculation with error handling
    try {
      task.completeTask(date);
      await task.save();
    } catch (error) {
      return handleApiError(error, 'Error updating task streak');
    }
    
    return apiResponse({
      taskId: task._id?.toString() || taskId,
      name: task.name || 'Unknown task',
      currentStreak: task.currentStreak || 0,
      bestStreak: task.bestStreak || 0,
      lastCompletedDate: task.lastCompletedDate ? task.lastCompletedDate.toISOString() : null
    }, true, 'Streak updated successfully');
  } catch (error) {
    return handleApiError(error, 'Error updating streak');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * DELETE /api/tasks/[id]/streak
 * 
 * Reset streak for a task
 */
export const DELETE = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    // Defensive taskId validation
    const taskId = params?.id;
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      return apiError('Invalid task ID', 400, 'ERR_INVALID_ID');
    }
    
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
    
    return apiResponse({
      taskId: task._id?.toString() || taskId,
      name: task.name || 'Unknown task',
      currentStreak: 0,
      bestStreak: task.bestStreak || 0
    }, true, 'Streak reset successfully');
  } catch (error) {
    return handleApiError(error, 'Error resetting streak');
  }
}, AuthLevel.DEV_OPTIONAL);