// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { getAuth } from '@/lib/auth';
import { EnhancedTask, ApiResponse, RecurrencePattern, TaskPriority } from '@/types';
import { convertTaskToEnhancedTask } from '../task-utils';

/**
 * GET /api/tasks/[id]
 * 
 * Retrieves a specific task by ID
 * 
 * Query parameters:
 * - includeHistory: if 'true', include completion history in response
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
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const taskId = params.id;
    
    // Get query parameters
    const url = new URL(req.url);
    const includeHistoryParam = url.searchParams.get('includeHistory') === 'true';
    
    // If we have a user session, get the real task
    if (session?.user?.id) {
      const task = await Task.findOne({ _id: taskId, user: session.user.id }) as ITask | null;
      
      if (!task) {
        return NextResponse.json<ApiResponse<never>>({ 
          success: false, 
          message: 'Task not found' 
        }, { status: 404 });
      }
      
      // Convert to enhanced task format
      const enhancedTask = convertTaskToEnhancedTask(task);
      
      // If includeHistory is not true, remove the completion history
      if (!includeHistoryParam) {
        // @ts-ignore - we know this might exist due to conversion
        delete enhancedTask.completionHistory;
      }
      
      return NextResponse.json<ApiResponse<EnhancedTask>>({ 
        success: true, 
        data: enhancedTask 
      });
    }
    
    // Mock response for development
    const mockTask: EnhancedTask = {
      id: taskId,
      name: "Mock Task Details",
      scheduledTime: "08:00",
      completed: false,
      currentStreak: 5,
      bestStreak: 14,
      recurrencePattern: "daily",
      category: "fitness",
      priority: "medium",
      date: new Date().toISOString(),
      lastCompletedDate: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Add completion history if requested
    if (includeHistoryParam) {
      const completionHistory = [
        new Date(Date.now() - 86400000).toISOString(),
        new Date(Date.now() - 86400000 * 2).toISOString(),
        new Date(Date.now() - 86400000 * 3).toISOString(),
        new Date(Date.now() - 86400000 * 4).toISOString(),
        new Date(Date.now() - 86400000 * 5).toISOString()
      ];
      
      // @ts-ignore - adding optional field
      mockTask.completionHistory = completionHistory;
    }
    
    return NextResponse.json<ApiResponse<EnhancedTask>>({ 
      success: true, 
      data: mockTask 
    });
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error fetching task details',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/tasks/[id]
 * 
 * Updates a task with validation and proper streak handling
 * 
 * Request body can include:
 * - completed: boolean - marks the task as completed or not
 * - name: string - updates the task name
 * - scheduledTime: string - updates the scheduled time (HH:MM format)
 * - recurrencePattern: 'daily', 'weekdays', 'weekends', 'weekly', or 'custom'
 * - customRecurrenceDays: array of numbers 0-6 (required if recurrencePattern is 'custom')
 * - category: string - updates the task category
 * - priority: 'low', 'medium', 'high' - updates the task priority
 * - date: string - updates the task creation/activation date
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const taskId = params.id;
    const updates = await req.json();
    
    // Validate incoming updates
    const validationError = validateTaskUpdates(updates);
    if (validationError) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: validationError 
      }, { status: 400 });
    }
    
    // If we have a user session, update the real task
    if (session?.user?.id) {
      // First check if the task exists and belongs to the user
      const existingTask = await Task.findOne({ 
        _id: taskId, 
        user: session.user.id 
      }) as ITask | null;
      
      if (!existingTask) {
        return NextResponse.json<ApiResponse<never>>({ 
          success: false, 
          message: 'Task not found or you do not have permission to update it' 
        }, { status: 404 });
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
          const { handleTaskXpAward } = await import('../task-utils');
          const xpResult = await handleTaskXpAward(session.user.id, existingTask);
          
          // Return the updated task with XP info
          const enhancedTask = convertTaskToEnhancedTask(existingTask);
          return NextResponse.json<ApiResponse<EnhancedTask & { xpAward?: any }>>({ 
            success: true, 
            data: {
              ...enhancedTask,
              xpAward: xpResult
            },
            message: xpResult?.leveledUp 
              ? `Task completed! Level up to ${xpResult.newLevel}!` 
              : 'Task marked as completed and streak updated'
          });
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
          return NextResponse.json<ApiResponse<EnhancedTask>>({ 
            success: true, 
            data: enhancedTask,
            message: 'Task marked as incomplete' 
          });
        }
      }
      
      // For other updates (not changing completion status)
      // Use findOneAndUpdate with validation
      const updatedTask = await Task.findOneAndUpdate(
        { _id: taskId, user: session.user.id },
        updates,
        { new: true, runValidators: true }
      ) as ITask;
      
      // Convert to enhanced task format
      const enhancedTask = convertTaskToEnhancedTask(updatedTask);
      
      return NextResponse.json<ApiResponse<EnhancedTask>>({ 
        success: true, 
        data: enhancedTask,
        message: 'Task updated successfully' 
      });
    }
    
    // Mock response for development
    const mockUpdatedTask: EnhancedTask = {
      id: taskId,
      name: updates.name || "Updated Mock Task",
      scheduledTime: updates.scheduledTime || "08:00",
      completed: updates.hasOwnProperty('completed') ? updates.completed : false,
      currentStreak: updates.completed ? 1 : 0,
      bestStreak: 14, // This stays the same in mock
      recurrencePattern: updates.recurrencePattern || "daily",
      category: updates.category || "fitness",
      priority: updates.priority || "medium",
      date: updates.date ? new Date(updates.date).toISOString() : new Date().toISOString(),
      lastCompletedDate: updates.completed ? new Date().toISOString() : null,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString() // Updated now
    };
    
    // If custom recurrence pattern, include the days
    if (updates.recurrencePattern === 'custom') {
      mockUpdatedTask.customRecurrenceDays = updates.customRecurrenceDays || [1, 3, 5]; // Mon, Wed, Fri
    }
    
    return NextResponse.json<ApiResponse<EnhancedTask>>({ 
      success: true, 
      data: mockUpdatedTask,
      message: 'Task updated successfully (mock)' 
    });
  } catch (error) {
    console.error('Error in PATCH /api/tasks/[id]:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error updating task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[id]
 * 
 * Deletes a task after verifying user ownership
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const taskId = params.id;
    
    // If we have a user session, delete the real task
    if (session?.user?.id) {
      // First check if the task exists and belongs to the user
      const existingTask = await Task.findOne({ 
        _id: taskId, 
        user: session.user.id 
      });
      
      if (!existingTask) {
        return NextResponse.json<ApiResponse<never>>({ 
          success: false, 
          message: 'Task not found or you do not have permission to delete it' 
        }, { status: 404 });
      }
      
      // Delete the task
      await Task.findOneAndDelete({ _id: taskId, user: session.user.id });
      
      return NextResponse.json<ApiResponse<{id: string}>>({ 
        success: true,
        data: { id: taskId },
        message: 'Task deleted successfully' 
      });
    }
    
    // Mock response for development
    return NextResponse.json<ApiResponse<{id: string}>>({ 
      success: true,
      data: { id: taskId },
      message: 'Task deleted successfully (mock)' 
    });
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error deleting task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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