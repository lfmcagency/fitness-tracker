export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { TaskData } from '@/types';
import { convertTaskToTaskData } from '@/lib/task-utils';

/**
 * GET /api/tasks/due
 * Get all tasks due for the specified date
 */
export const GET = withAuth<TaskData[]>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Get the query parameters with defensive checks
      const url = new URL(req.url);
      const dateParam = url.searchParams.get('date');
      const categoryParam = url.searchParams.get('category');
      const priorityParam = url.searchParams.get('priority');
      
      // Parse the date or use today with defensive date parsing
      let checkDate = new Date();
      if (dateParam) {
        const parsedDate = new Date(dateParam);
        if (isNaN(parsedDate.getTime())) {
          return apiError('Invalid date format', 400, 'ERR_INVALID_DATE');
        }
        checkDate = parsedDate;
      }
      
      // Normalize to start of day
      checkDate.setHours(0, 0, 0, 0);
      
      // Validate category and priority if provided
      if (categoryParam && (typeof categoryParam !== 'string' || categoryParam.trim() === '')) {
        return apiError('Invalid category', 400, 'ERR_INVALID_CATEGORY');
      }
      
      if (priorityParam && 
          (typeof priorityParam !== 'string' || 
          !['low', 'medium', 'high'].includes(priorityParam))) {
        return apiError('Invalid priority', 400, 'ERR_INVALID_PRIORITY');
      }
      
      // Build query with validated parameters
      const query: any = { user: userId };
      
      if (categoryParam && categoryParam.trim() !== '') {
        query.category = categoryParam;
      }
      
      if (priorityParam && ['low', 'medium', 'high'].includes(priorityParam)) {
        query.priority = priorityParam;
      }
      
      // Find all user's tasks with filters and defensive error handling
      const allTasks = await Task.find(query) as ITask[];
      
      if (!Array.isArray(allTasks)) {
        return apiResponse([]);
      }
      
      // Filter tasks that are due on the check date based on their recurrence pattern
      // with defensive error handling
      const dueTasks: TaskData[] = [];
      
      for (const task of allTasks) {
        try {
          if (task && typeof task.isTaskDueToday === 'function' && task.isTaskDueToday(checkDate)) {
            // Convert task with defensive error handling
            const taskData = convertTaskToTaskData(task, checkDate);
            dueTasks.push(taskData);
          }
        } catch (error) {
          console.error(`Error checking if task ${task._id} is due:`, error);
          // Skip this task and continue with others
        }
      }
      
      return apiResponse(dueTasks);
    } catch (error) {
      return handleApiError(error, 'Error fetching due tasks');
    }
  },
  AuthLevel.DEV_OPTIONAL
);