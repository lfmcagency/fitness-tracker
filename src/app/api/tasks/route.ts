export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { TaskData, PaginationInfo, RecurrencePattern, TaskPriority, DomainCategory } from '@/types';
import { CreateTaskRequest, TaskQueryParams } from '@/types/api/taskRequests';
import { convertTaskToTaskData } from '@/lib/task-utils';
import { processEvent, generateToken } from '@/lib/event-coordinator'; // 🆕 Added for creation events

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/tasks
 * Lists tasks with optional filtering and pagination
 */
export const GET = withAuth<{ data: TaskData[]; pagination: PaginationInfo }>(
  async (req: NextRequest, userId: string) => {
    try {
      console.log('GET /api/tasks - User ID:', userId);
      console.log('Request URL:', req.url);

      await dbConnect();
      console.log('Database connected successfully');

      // Get query parameters for filtering with defensive checks
      const url = new URL(req.url);
      const completedParam = url.searchParams.get('completed');
      const category = url.searchParams.get('category');
      const priority = url.searchParams.get('priority') as TaskPriority;
      const fromDateParam = url.searchParams.get('from');
      const toDateParam = url.searchParams.get('to');
      const patternParam = url.searchParams.get('pattern') as RecurrencePattern;
      
      // NEW: Organization filters
      const domainCategory = url.searchParams.get('domainCategory') as DomainCategory;
      const labelsParam = url.searchParams.get('labels'); // Comma-separated
      const isSystemTaskParam = url.searchParams.get('isSystemTask');
      
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
          ['date', 'name', 'priority', 'category', 'completed', 'currentStreak', 'totalCompletions'].includes(sortParam)) {
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
          ['once', 'daily', 'custom'].includes(patternParam)) {
        query.recurrencePattern = patternParam;
      }
      
      // NEW: Organization filters
      if (domainCategory && typeof domainCategory === 'string' && 
          ['ethos', 'trophe', 'soma'].includes(domainCategory)) {
        query.domainCategory = domainCategory;
      }
      
      if (labelsParam && typeof labelsParam === 'string') {
        const labels = labelsParam.split(',').map(l => l.trim()).filter(l => l.length > 0);
        if (labels.length > 0) {
          query.labels = { $in: labels };
        }
      }
      
      if (isSystemTaskParam !== null) {
        query.isSystemTask = isSystemTaskParam === 'true';
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
      
      // Convert tasks to TaskData format with defensive error handling
      const taskDataList: TaskData[] = [];
      
      for (const task of tasks) {
        try {
          const taskData = convertTaskToTaskData(task);
          taskDataList.push(taskData);
        } catch (error) {
          console.error(`Error converting task ${task._id}:`, error);
          // Add basic task info instead
          taskDataList.push({
            id: task._id?.toString(),
            name: task.name || 'Unknown task',
            completed: !!task.completed,
            date: task.date?.toISOString() || new Date().toISOString(),
            recurrencePattern: task.recurrencePattern || 'once',
            currentStreak: task.currentStreak || 0,
            totalCompletions: task.totalCompletions || 0, // NEW
            category: task.category || 'general',
            priority: task.priority || 'medium',
            scheduledTime: task.scheduledTime || '00:00',
            domainCategory: task.domainCategory || 'ethos', // NEW
            labels: task.labels || [], // NEW
            isSystemTask: task.isSystemTask || false, // NEW
            description: task.description || undefined
          });
        }
      }
      
      // Calculate pagination info with defensive math
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
      
      return apiResponse({
        data: taskDataList,
        pagination: {
          total,
          page,
          limit,
          pages: totalPages
        }
      });
    } catch (error) {
      console.error('GET /api/tasks - Error:', error);
      return handleApiError(error, 'Error fetching tasks');
    }
  },
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/tasks
 * Creates a new task with event firing (FIXED: Now fires creation events!)
 */
export const POST = withAuth<TaskData>(
  async (req: NextRequest, userId: string) => {
    console.log('🚀 POST /api/tasks called - userId:', userId);
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
            !['once', 'daily', 'custom'].includes(taskData.recurrencePattern)) {
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
      
      // NEW: Validate domain category
      if (taskData.domainCategory && 
          (typeof taskData.domainCategory !== 'string' || 
          !['ethos', 'trophe', 'soma'].includes(taskData.domainCategory))) {
        return apiError('Invalid domain category. Must be ethos, trophe, or soma.', 400, 'ERR_VALIDATION');
      }
      
      // NEW: Validate labels
      if (taskData.labels && !Array.isArray(taskData.labels)) {
        return apiError('Labels must be an array of strings', 400, 'ERR_VALIDATION');
      }
      
      if (taskData.labels && taskData.labels.some((label: any) => 
          typeof label !== 'string' || label.trim().length === 0)) {
        return apiError('All labels must be non-empty strings', 400, 'ERR_VALIDATION');
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
          totalCompletions: 0, // NEW: Initialize counter
          date: taskData.date ? new Date(taskData.date) : new Date(),
          domainCategory: taskData.domainCategory || 'ethos', // NEW: Default to ethos
          labels: taskData.labels || [], // NEW: Default to empty array
          isSystemTask: taskData.isSystemTask || false, // NEW: Default to false
        };
        
        newTask = await Task.create(taskToCreate) as ITask;
      } catch (error) {
        return handleApiError(error, 'Error creating task in database');
      }
      
      // Convert to TaskData format with defensive error handling
      const taskData_result = convertTaskToTaskData(newTask);
      
      // 🆕 FIRE CREATION EVENT (this was missing!)
      const taskEvent = {
        token: generateToken(),
        userId,
        source: 'ethos' as const,
        action: 'task_created' as const,
        timestamp: new Date(),
        taskData: {
          taskId: newTask._id.toString(),
          taskName: newTask.name,
          streakCount: 0,
          totalCompletions: 0
        }
      };

      try {
        await processEvent(taskEvent);
        console.log(`✅ [TASK-CREATE] Event processed: ${taskEvent.token}`);
      } catch (coordinatorError) {
        console.error('💥 [TASK-CREATE] Event processing failed:', coordinatorError);
        // Continue - task creation still succeeded, just event logging failed
      }
      
      return apiResponse(taskData_result, true, 'Task created successfully', 201);
    } catch (error) {
      return handleApiError(error, 'Error creating task');
    }
  },
  AuthLevel.DEV_OPTIONAL
);