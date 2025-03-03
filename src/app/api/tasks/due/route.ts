export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/tasks/due
 * 
 * Get all tasks due for the specified date
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get the query parameters
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const categoryParam = url.searchParams.get('category');
    const priorityParam = url.searchParams.get('priority');
    
    // Parse the date or use today
    const checkDate = dateParam ? new Date(dateParam) : new Date();
    // Normalize to start of day
    checkDate.setHours(0, 0, 0, 0);
    
    // Find all user's tasks with filters
    const allTasks = await Task.find({ 
      user: userId,
      ...(categoryParam ? { category: categoryParam } : {}),
      ...(priorityParam ? { priority: priorityParam } : {})
    }) as ITask[];
    
    // Filter tasks that are due on the check date based on their recurrence pattern
    const dueTasks = allTasks.filter(task => task.isTaskDueToday(checkDate));
    
    return apiResponse(dueTasks);
  } catch (error) {
    return handleApiError(error, 'Error fetching due tasks');
  }
}, AuthLevel.DEV_OPTIONAL);