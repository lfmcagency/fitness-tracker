// src/app/api/tasks/route.ts (updated version)
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EnhancedTask, RecurrencePattern, TaskPriority } from '@/types';
import { convertTaskToEnhancedTask } from '@/lib/task-utils';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

// Helper function to parse date or return null
const parseDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * GET /api/tasks
 * 
 * Lists tasks with optional filtering and pagination
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get query parameters for filtering
    const url = new URL(req.url);
    const completedParam = url.searchParams.get('completed');
    const category = url.searchParams.get('category');
    const priority = url.searchParams.get('priority') as TaskPriority;
    const fromDate = parseDate(url.searchParams.get('from'));
    const toDate = parseDate(url.searchParams.get('to'));
    const pattern = url.searchParams.get('pattern') as RecurrencePattern;
    
    // Get pagination parameters
    const page = parseInt(url.searchParams.get('page') || String(DEFAULT_PAGE));
    const limit = parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    
    // Get sorting parameters
    const sort = url.searchParams.get('sort') || 'date';
    const order = url.searchParams.get('order') === 'asc' ? 1 : -1;
    
    // Build the query object
    const query: any = { user: userId };
    
    // Add other filters if provided
    if (completedParam !== null) {
      query.completed = completedParam === 'true';
    }
    
    if (category) {
      query.category = category;
    }
    
    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      query.priority = priority;
    }
    
    if (pattern && ['daily', 'weekdays', 'weekends', 'weekly', 'custom'].includes(pattern)) {
      query.recurrencePattern = pattern;
    }
    
    // Date range filter
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        query.date.$gte = fromDate;
      }
      if (toDate) {
        query.date.$lte = toDate;
      }
    }
    
    // Count total tasks matching the query for pagination
    const total = await Task.countDocuments(query);
    
    // Get tasks with pagination and sorting
    const sortOption: any = {};
    sortOption[sort] = order;
    
    const tasks = await Task.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit) as ITask[];
    
    // Convert tasks to enhanced format
    const enhancedTasks = tasks.map(task => convertTaskToEnhancedTask(task));
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    
    return apiResponse({
      data: enhancedTasks,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching tasks');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/tasks
 * 
 * Creates a new task
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    const taskData = await req.json();
    
    // Basic validation
    if (!taskData.name || !taskData.name.trim()) {
      return apiError('Task name is required', 400, 'ERR_VALIDATION');
    }
    
    if (!taskData.scheduledTime) {
      return apiError('Scheduled time is required', 400, 'ERR_VALIDATION');
    }
    
    // Validate time format (HH:MM)
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(taskData.scheduledTime)) {
      return apiError('Invalid time format. Use HH:MM format.', 400, 'ERR_VALIDATION');
    }
    
    // Validate recurrence pattern if provided
    if (taskData.recurrencePattern && 
        !['daily', 'weekdays', 'weekends', 'weekly', 'custom'].includes(taskData.recurrencePattern)) {
      return apiError('Invalid recurrence pattern', 400, 'ERR_VALIDATION');
    }
    
    // If pattern is custom, validate customRecurrenceDays
    if (taskData.recurrencePattern === 'custom') {
      if (!Array.isArray(taskData.customRecurrenceDays) || taskData.customRecurrenceDays.length === 0) {
        return apiError('Custom recurrence days are required for custom pattern', 400, 'ERR_VALIDATION');
      }
      
      // Validate each day is 0-6 (Sunday to Saturday)
      if (!taskData.customRecurrenceDays.every((day: any) => 
          typeof day === 'number' && day >= 0 && day <= 6)) {
        return apiError('Custom recurrence days must be numbers 0-6 (Sunday to Saturday)', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate priority if provided
    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
      return apiError('Invalid priority. Must be low, medium, or high.', 400, 'ERR_VALIDATION');
    }
    
    // Create the task
    const taskToCreate = {
      ...taskData,
      user: userId,
      // Defaults
      completed: false,
      currentStreak: 0,
      bestStreak: 0,
      date: taskData.date ? new Date(taskData.date) : new Date(),
    };
    
    const newTask = await Task.create(taskToCreate) as ITask;
    const enhancedTask = convertTaskToEnhancedTask(newTask);
    
    return apiResponse(enhancedTask, true, 'Task created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'Error creating task');
  }
}, AuthLevel.DEV_OPTIONAL);