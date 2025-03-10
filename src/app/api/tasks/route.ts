export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EnhancedTask, PaginationInfo, RecurrencePattern, TaskPriority } from '@/types';
import { CreateTaskRequest, TaskQueryParams } from '@/types/api/taskRequests';
import { convertTaskToEnhancedTask } from '@/lib/task-utils';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/tasks
 * Lists tasks with optional filtering and pagination
 */
export const GET = withAuth<{ data: EnhancedTask[]; pagination: PaginationInfo }>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Get query parameters for filtering with defensive checks
      const url = new URL(req.url);
      const completedParam = url.searchParams.get('completed');
      const category = url.searchParams.get('category');
      const priority = url.searchParams.get('priority') as TaskPriority;
      const fromDateParam = url.searchParams.get('from');
      const toDateParam = url.searchParams.get('to');
      const patternParam = url.searchParams.get('pattern') as RecurrencePattern;
      
      // Parse date parameters
      const fromDate = fromDateParam ? new Date(fromDateParam) : null;
      const toDate = toDateParam ? new Date(toDateParam) : null;
      
      // Validate dates
      if (fromDate && isNaN(fromDate.getTime())) {
        return apiError('Invalid from date format', 400, 'ERR_INVALID_DATE');
      }
      
      if (toDate && isNaN(toDate.getTime())) {
        return apiError('Invalid to date format', 400, 'ERR_INVALID_DATE');
      }
      
      // Get pagination parameters with defensive parsing
      let page = DEFAULT_PAGE;
      try {
        const pageParam = url.searchParams.get('page');
        if (pageParam) {
          const parsedPage = parseInt(pageParam);
          if (!isNaN(parsedPage) && parsedPage > 0) {
            page = parsedPage;
          }
        }
      } catch (error) {
        console.error('Error parsing page parameter:', error);
        // Continue with default value
      }
      
      let limit = DEFAULT_LIMIT;
      try {
        const limitParam = url.searchParams.get('limit');
        if (limitParam) {
          const parsedLimit = parseInt(limitParam);
          if (!isNaN(parsedLimit) && parsedLimit > 0) {
            limit = Math.min(parsedLimit, 100); // Cap at 100 to prevent abuse
          }
        }
      } catch (error) {
        console.error('Error parsing limit parameter:', error);
        // Continue with default value
      }
      
      const skip = (page - 1) * limit;
      
      // Get sorting parameters with validation
      let sort = 'date';
      const sortParam = url.searchParams.get('sort');
      if (sortParam && typeof sortParam === 'string' && 
          ['date', 'name', 'priority', 'category', 'completed'].includes(sortParam)) {
        sort = sortParam;
      }
      
      const order = url.searchParams.get('order') === 'asc' ? 1 : -1;
      
      // Build the query object with defensive validation
      const query: any = { user: userId };
      
      // Add other filters if provided with validation
      if (completedParam !== null) {
        query.completed = completedParam === 'true';
      }
      
      if (category && typeof category === 'string' && category.trim() !== '') {
        query.category = category;
      }
      
      if (priority && typeof priority === 'string' && 
          ['low', 'medium', 'high'].includes(priority)) {
        query.priority = priority;
      }
      
      if (patternParam && typeof patternParam === 'string' && 
          ['daily', 'weekdays', 'weekends', 'weekly', 'custom'].includes(patternParam)) {
        query.recurrencePattern = patternParam;
      }
      
      // Date range filter with defensive null checks
      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) {
          query.date.$gte = fromDate;
        }
        if (toDate) {
          query.date.$lte = toDate;
        }
      }
      
      // Count total tasks matching the query for pagination with error handling
      let total = 0;
      try {
        total = await Task.countDocuments(query);
      } catch (error) {
        console.error('Error counting tasks:', error);
        // Continue with zero count
      }
      
      // Get tasks with pagination and sorting with error handling
      let tasks: ITask[] = [];
      try {
        const sortOption: any = {};
        sortOption[sort] = order;
        
        tasks = await Task.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limit) as ITask[];
      } catch (error) {
        return handleApiError(error, 'Error querying tasks database');
      }
      
      if (!Array.isArray(tasks)) {
        tasks = [];
      }
      
      // Convert tasks to enhanced format with defensive error handling
      const enhancedTasks: EnhancedTask[] = [];
      
      for (const task of tasks) {
        try {
          const enhancedTask = convertTaskToEnhancedTask(task);
          enhancedTasks.push(enhancedTask);
        } catch (error) {
          console.error(`Error converting task ${task._id}:`, error);
          // Add basic task info instead
          enhancedTasks.push({
            id: task._id?.toString(),
            name: task.name || 'Unknown task',
            completed: !!task.completed,
            date: task.date?.toISOString() || new Date().toISOString(),
            recurrencePattern: task.recurrencePattern || 'daily',
            currentStreak: task.currentStreak || 0,
            bestStreak: task.bestStreak || 0, 
            category: task.category || 'general',
            priority: task.priority || 'medium',
            scheduledTime: task.scheduledTime || '00:00'
          });
        }
      }
      
      // Calculate pagination info with defensive math
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
      
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
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/tasks
 * Creates a new task
 */
export const POST = withAuth<EnhancedTask>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse request body with defensive error handling
      let taskData: CreateTaskRequest;
      try {
        taskData = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      if (!taskData || typeof taskData !== 'object') {
        return apiError('Invalid task data', 400, 'ERR_INVALID_FORMAT');
      }
      
      // Basic validation with defensive string checks
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
      
      // Validate recurrence pattern if provided
      if (taskData.recurrencePattern) {
        if (typeof taskData.recurrencePattern !== 'string' ||
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
      }
      
      // Validate priority if provided
      if (taskData.priority && 
          (typeof taskData.priority !== 'string' || 
          !['low', 'medium', 'high'].includes(taskData.priority))) {
        return apiError('Invalid priority. Must be low, medium, or high.', 400, 'ERR_VALIDATION');
      }
      
      // Validate date if provided
      if (taskData.date) {
        const date = new Date(taskData.date);
        if (isNaN(date.getTime())) {
          return apiError('Invalid date format', 400, 'ERR_VALIDATION');
        }
      }
      
      // Create the task with defensive error handling
      let newTask: ITask;
      try {
        // Prepare task data with defaults
        const taskToCreate = {
          ...taskData,
          user: userId,
          completed: false,
          currentStreak: 0,
          bestStreak: 0,
          date: taskData.date ? new Date(taskData.date) : new Date(),
        };
        
        newTask = await Task.create(taskToCreate) as ITask;
      } catch (error) {
        return handleApiError(error, 'Error creating task in database');
      }
      
      // Convert to enhanced format with defensive error handling
      const enhancedTask = convertTaskToEnhancedTask(newTask);
      
      return apiResponse(enhancedTask, true, 'Task created successfully', 201);
    } catch (error) {
      return handleApiError(error, 'Error creating task');
    }
  },
  AuthLevel.DEV_OPTIONAL
);