export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/tasks/[id]/streak
 * 
 * Get streak information for a task
 */
export const GET = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    const taskId = params.id;
    
    // Find task by ID
    const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
    
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Calculate if the task is due today
    const isDueToday = task.isTaskDueToday(new Date());
    
    // Get streak information
    const streakInfo = {
      taskId: task._id,
      name: task.name,
      currentStreak: task.currentStreak,
      bestStreak: task.bestStreak,
      lastCompletedDate: task.lastCompletedDate,
      isDueToday,
      completionHistory: task.completionHistory
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
    
    const taskId = params.id;
    const body = await req.json();
    const date = body.date ? new Date(body.date) : new Date();
    
    // Find task by ID
    const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
    
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Check if task is due on the specified date
    const isDue = task.isTaskDueToday(date);
    
    if (!isDue) {
      return apiError('Task is not scheduled for this date', 400, 'ERR_INVALID_DATE');
    }
    
    // Complete the task using the method that handles streak calculation
    task.completeTask(date);
    await task.save();
    
    return apiResponse({
      taskId: task._id,
      name: task.name,
      currentStreak: task.currentStreak,
      bestStreak: task.bestStreak,
      lastCompletedDate: task.lastCompletedDate
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
    
    const taskId = params.id;
    
    // Find task by ID
    const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
    
    if (!task) {
      return apiError('Task not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Reset the streak
    task.resetStreak();
    await task.save();
    
    return apiResponse({
      taskId: task._id,
      name: task.name,
      currentStreak: 0,
      bestStreak: task.bestStreak
    }, true, 'Streak reset successfully');
  } catch (error) {
    return handleApiError(error, 'Error resetting streak');
  }
}, AuthLevel.DEV_OPTIONAL);