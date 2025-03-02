// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { getAuth } from '@/lib/auth';
import { EnhancedTask, ApiResponse, RecurrencePattern, TaskPriority } from '@/types';
import { convertTaskToEnhancedTask } from '../../../lib/task-utils';

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
 * 
 * Query parameters:
 * - completed: Filter by completion status (true/false)
 * - category: Filter by category
 * - priority: Filter by priority (low, medium, high)
 * - from: Filter by date range start (ISO date string)
 * - to: Filter by date range end (ISO date string)
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 20)
 * - sort: Sort field (default: 'date')
 * - order: Sort order ('asc' or 'desc', default: 'desc')
 */
export async function GET(req: NextRequest) {
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
    const query: any = {};
    
    // If we have a user session, filter by user id
    if (session?.user?.id) {
      query.user = session.user.id;
    }
    
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
    
    // If we have a user session, get real tasks
    if (session?.user?.id) {
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
      
      return NextResponse.json<ApiResponse<EnhancedTask[]>>({
        success: true,
        data: enhancedTasks,
        pagination: {
          total,
          page,
          limit,
          pages: totalPages
        }
      });
    }
    
    // For development without authentication, return mock data
    // Generate 10 mock tasks with different completion statuses 
    const mockTasks: EnhancedTask[] = Array.from({ length: 10 }, (_, i) => ({
      id: `mock-task-${i + 1}`,
      name: `Mock Task ${i + 1}`,
      scheduledTime: "08:00",
      completed: i % 3 === 0, // Every third task is completed
      currentStreak: i % 3 === 0 ? i + 1 : 0,
      bestStreak: i + 5,
      recurrencePattern: ['daily', 'weekdays', 'weekly', 'custom', 'weekends'][i % 5] as RecurrencePattern,
      customRecurrenceDays: [1, 3, 5], // Mon, Wed, Fri
      category: ['fitness', 'work', 'personal'][i % 3],
      priority: ['low', 'medium', 'high'][i % 3] as TaskPriority,
      date: new Date(Date.now() - (i * 86400000)).toISOString(),
      lastCompletedDate: i % 3 === 0 ? new Date(Date.now() - 86400000).toISOString() : null,
      createdAt: new Date(Date.now() - (i + 30) * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - i * 86400000).toISOString()
    }));
    
    // Filter mock tasks according to query params
    let filteredMockTasks = [...mockTasks];
    
    if (completedParam !== null) {
      const isCompleted = completedParam === 'true';
      filteredMockTasks = filteredMockTasks.filter(task => task.completed === isCompleted);
    }
    
    if (category) {
      filteredMockTasks = filteredMockTasks.filter(task => task.category === category);
    }
    
    if (priority) {
      filteredMockTasks = filteredMockTasks.filter(task => task.priority === priority);
    }
    
    if (pattern) {
      filteredMockTasks = filteredMockTasks.filter(task => task.recurrencePattern === pattern);
    }
    
    // Apply pagination
    const mockTotal = filteredMockTasks.length;
    filteredMockTasks = filteredMockTasks.slice(skip, skip + limit);
    
    return NextResponse.json<ApiResponse<EnhancedTask[]>>({
      success: true,
      data: filteredMockTasks,
      pagination: {
        total: mockTotal,
        page,
        limit,
        pages: Math.ceil(mockTotal / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error fetching tasks',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/tasks
 * 
 * Creates a new task
 * 
 * Request body:
 * - name: string (required) - Task name
 * - scheduledTime: string (required) - Task time in HH:MM format
 * - recurrencePattern: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom' - How the task recurs
 * - customRecurrenceDays: number[] - Required if recurrencePattern is 'custom'
 * - category: string - Task category
 * - priority: 'low' | 'medium' | 'high' - Task priority
 * - date: string - Task date (defaults to today)
 */
export async function POST(req: NextRequest) {
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
    
    const taskData = await req.json();
    
    // Basic validation
    if (!taskData.name || !taskData.name.trim()) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Task name is required' 
      }, { status: 400 });
    }
    
    if (!taskData.scheduledTime) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Scheduled time is required' 
      }, { status: 400 });
    }
    
    // Validate time format (HH:MM)
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(taskData.scheduledTime)) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Invalid time format. Use HH:MM format.' 
      }, { status: 400 });
    }
    
    // Validate recurrence pattern if provided
    if (taskData.recurrencePattern && 
        !['daily', 'weekdays', 'weekends', 'weekly', 'custom'].includes(taskData.recurrencePattern)) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Invalid recurrence pattern' 
      }, { status: 400 });
    }
    
    // If pattern is custom, validate customRecurrenceDays
    if (taskData.recurrencePattern === 'custom') {
      if (!Array.isArray(taskData.customRecurrenceDays) || taskData.customRecurrenceDays.length === 0) {
        return NextResponse.json<ApiResponse<never>>({ 
          success: false, 
          message: 'Custom recurrence days are required for custom pattern' 
        }, { status: 400 });
      }
      
      // Validate each day is 0-6 (Sunday to Saturday)
      if (!taskData.customRecurrenceDays.every((day: any) => 
          typeof day === 'number' && day >= 0 && day <= 6)) {
        return NextResponse.json<ApiResponse<never>>({ 
          success: false, 
          message: 'Custom recurrence days must be numbers 0-6 (Sunday to Saturday)' 
        }, { status: 400 });
      }
    }
    
    // Validate priority if provided
    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Invalid priority. Must be low, medium, or high.' 
      }, { status: 400 });
    }
    
    // If we have a user session, create a real task
    if (session?.user?.id) {
      const taskToCreate = {
        ...taskData,
        user: session.user.id,
        // Defaults
        completed: false,
        currentStreak: 0,
        bestStreak: 0,
        date: taskData.date ? new Date(taskData.date) : new Date(),
      };
      
      const newTask = await Task.create(taskToCreate) as ITask;
      const enhancedTask = convertTaskToEnhancedTask(newTask);
      
      return NextResponse.json<ApiResponse<EnhancedTask>>({ 
        success: true, 
        data: enhancedTask,
        message: 'Task created successfully' 
      }, { status: 201 });
    }
    
    // For development without authentication, return a mock response
    const mockTask: EnhancedTask = {
      id: `mock-task-${Date.now()}`,
      _id: `mock-task-${Date.now()}`,
      name: taskData.name,
      scheduledTime: taskData.scheduledTime,
      completed: false,
      currentStreak: 0,
      bestStreak: 0,
      recurrencePattern: taskData.recurrencePattern || 'daily',
      customRecurrenceDays: taskData.recurrencePattern === 'custom' ? taskData.customRecurrenceDays : [],
      category: taskData.category || 'general',
      priority: taskData.priority || 'medium',
      date: taskData.date ? new Date(taskData.date).toISOString() : new Date().toISOString(),
      lastCompletedDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json<ApiResponse<EnhancedTask>>({ 
      success: true, 
      data: mockTask,
      message: 'Task created successfully (mock)' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error creating task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}