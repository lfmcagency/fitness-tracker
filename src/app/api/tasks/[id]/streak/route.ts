// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { getAuth } from '@/lib/auth';

/**
 * API endpoint to manage task streaks
 * - GET: Get streak information for a task
 * - POST: Calculate and update streak for a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const taskId = params.id;
    
    // If we have a user session, get the real task
    if (session?.user?.id) {
      const task = await Task.findOne({ _id: taskId, user: session.user.id }) as ITask;
      
      if (!task) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
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
      
      return NextResponse.json({ success: true, data: streakInfo });
    }
    
    // Mock response for development
    const today = new Date();
    const mockStreakInfo = {
      taskId,
      name: "Mock Task",
      currentStreak: 5,
      bestStreak: 14,
      lastCompletedDate: new Date(today.getTime() - 86400000).toISOString(),
      isDueToday: true,
      completionHistory: [
        new Date(today.getTime() - 86400000).toISOString(),
        new Date(today.getTime() - 86400000 * 2).toISOString(),
        new Date(today.getTime() - 86400000 * 3).toISOString(),
        new Date(today.getTime() - 86400000 * 4).toISOString(),
        new Date(today.getTime() - 86400000 * 5).toISOString()
      ]
    };
    
    return NextResponse.json({ success: true, data: mockStreakInfo });
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]/streak:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching streak information' 
    }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const taskId = params.id;
    const body = await req.json();
    const date = body.date ? new Date(body.date) : new Date();
    
    // If we have a user session, update the real task streak
    if (session?.user?.id) {
      const task = await Task.findOne({ _id: taskId, user: session.user.id }) as ITask;
      
      if (!task) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }
      
      // Check if task is due on the specified date
      const isDue = task.isTaskDueToday(date);
      
      if (!isDue) {
        return NextResponse.json({ 
          success: false, 
          message: 'Task is not scheduled for this date' 
        }, { status: 400 });
      }
      
      // Complete the task using the method that handles streak calculation
      task.completeTask(date);
      await task.save();
      
      return NextResponse.json({ 
        success: true, 
        data: {
          taskId: task._id,
          name: task.name,
          currentStreak: task.currentStreak,
          bestStreak: task.bestStreak,
          lastCompletedDate: task.lastCompletedDate
        }
      });
    }
    
    // Mock response for development
    return NextResponse.json({ 
      success: true, 
      data: {
        taskId,
        name: "Mock Task",
        currentStreak: 6, // Increment by 1
        bestStreak: 14,
        lastCompletedDate: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.error('Error in POST /api/tasks/[id]/streak:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Error updating streak'
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const taskId = params.id;
    
    // If we have a user session, reset the streak
    if (session?.user?.id) {
      const task = await Task.findOne({ _id: taskId, user: session.user.id }) as ITask;
      
      if (!task) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }
      
      // Reset the streak
      task.resetStreak();
      await task.save();
      
      return NextResponse.json({ 
        success: true, 
        data: {
          taskId: task._id,
          name: task.name,
          currentStreak: 0,
          bestStreak: task.bestStreak
        }
      });
    }
    
    // Mock response for development
    return NextResponse.json({ 
      success: true, 
      data: {
        taskId,
        name: "Mock Task",
        currentStreak: 0,
        bestStreak: 14
      } 
    });
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]/streak:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error resetting streak' 
    }, { status: 500 });
  }
}