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
 * Normalize date to start of day in UTC for consistent comparison
 */
function normalizeToUTC(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Parse date parameter with comprehensive validation and logging
 */
function parseDateParameter(dateParam: string | null): { date: Date; dateKey: string } | null {
  console.log('📅 [DUE] Parsing date parameter:', dateParam);
  
  let checkDate = new Date();
  
  if (dateParam) {
    const parsedDate = new Date(dateParam);
    if (isNaN(parsedDate.getTime())) {
      console.error('❌ [DUE] Invalid date format:', dateParam);
      return null;
    }
    checkDate = parsedDate;
  }
  
  // Normalize to UTC start of day
  const normalizedDate = normalizeToUTC(checkDate);
  const dateKey = normalizedDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  console.log('✅ [DUE] Date normalized:', {
    original: dateParam || 'today',
    parsed: checkDate.toISOString(),
    normalized: normalizedDate.toISOString(),
    dateKey
  });
  
  return { date: normalizedDate, dateKey };
}

/**
 * Enhanced task due checking with comprehensive logging
 */
function isTaskDueOnDate(task: ITask, checkDate: Date, dateKey: string): boolean {
  const taskId = task._id.toString();
  
  try {
    console.log(`🔍 [DUE] Checking task "${task.name}" (${taskId}) for date ${dateKey}`);
    console.log(`📋 [DUE] Task details:`, {
      recurrencePattern: task.recurrencePattern,
      createdDate: task.date?.toISOString(),
      customRecurrenceDays: task.customRecurrenceDays
    });
    
    // Use the task's built-in method but with extra logging
    const isDue = task.isTaskDueToday(checkDate);
    
    console.log(`${isDue ? '✅' : '❌'} [DUE] Task "${task.name}" is ${isDue ? 'DUE' : 'NOT DUE'} on ${dateKey}`);
    
    // Extra validation for "once" pattern to prevent phantom tasks
    if (task.recurrencePattern === 'once' && isDue) {
      const taskDateKey = normalizeToUTC(new Date(task.date)).toISOString().split('T')[0];
      const dateMatches = taskDateKey === dateKey;
      
      console.log(`🔍 [DUE] "Once" task validation:`, {
        taskDateKey,
        checkDateKey: dateKey,
        matches: dateMatches
      });
      
      if (!dateMatches) {
        console.warn(`⚠️ [DUE] "Once" task date mismatch - should not be due!`);
        return false;
      }
    }
    
    return isDue;
  } catch (error) {
    console.error(`💥 [DUE] Error checking if task "${task.name}" (${taskId}) is due:`, error);
    return false; // Fail safe - don't show task if we can't determine
  }
}

/**
 * GET /api/tasks/due
 * Get all tasks due for the specified date with bulletproof date handling
 */
export const GET = withAuth<TaskData[]>(
  async (req: NextRequest, userId: string) => {
    console.log('🚀 [DUE] Starting due tasks fetch for user:', userId);
    
    try {
      await dbConnect();
      console.log('✅ [DUE] Database connected');
      
      // Parse query parameters with defensive checks
      const url = new URL(req.url);
      const dateParam = url.searchParams.get('date');
      const categoryParam = url.searchParams.get('category');
      const priorityParam = url.searchParams.get('priority');
      
      console.log('📝 [DUE] Query parameters:', { dateParam, categoryParam, priorityParam });
      
      // Parse and validate date
      const dateResult = parseDateParameter(dateParam);
      if (!dateResult) {
        return apiError('Invalid date format. Use YYYY-MM-DD format.', 400, 'ERR_INVALID_DATE');
      }
      
      const { date: checkDate, dateKey } = dateResult;
      
      // Validate category parameter
      if (categoryParam && (typeof categoryParam !== 'string' || categoryParam.trim() === '')) {
        console.error('❌ [DUE] Invalid category parameter:', categoryParam);
        return apiError('Invalid category parameter', 400, 'ERR_INVALID_CATEGORY');
      }
      
      // Validate priority parameter
      if (priorityParam && 
          (typeof priorityParam !== 'string' || 
          !['low', 'medium', 'high'].includes(priorityParam))) {
        console.error('❌ [DUE] Invalid priority parameter:', priorityParam);
        return apiError('Invalid priority. Must be low, medium, or high.', 400, 'ERR_INVALID_PRIORITY');
      }
      
      // Build database query
      const query: any = { user: userId };
      
      if (categoryParam && categoryParam.trim() !== '') {
        query.category = categoryParam;
      }
      
      if (priorityParam && ['low', 'medium', 'high'].includes(priorityParam)) {
        query.priority = priorityParam;
      }
      
      console.log('🔍 [DUE] Database query:', query);
      
      // Fetch all user's tasks matching filters
      const allTasks = await Task.find(query) as ITask[];
      
      console.log(`📊 [DUE] Found ${allTasks.length} total tasks for user`);
      
      if (!Array.isArray(allTasks)) {
        console.warn('⚠️ [DUE] Database returned non-array result');
        return apiResponse([]);
      }
      
      // Filter tasks that are due on the check date
      const dueTasks: TaskData[] = [];
      let processedCount = 0;
      let dueCount = 0;
      let errorCount = 0;
      
      for (const task of allTasks) {
        processedCount++;
        
        try {
          if (!task || !task._id) {
            console.warn('⚠️ [DUE] Skipping invalid task:', task);
            continue;
          }
          
          const isDue = isTaskDueOnDate(task, checkDate, dateKey);
          
          if (isDue) {
            dueCount++;
            const taskData = convertTaskToTaskData(task, checkDate);
            dueTasks.push(taskData);
            console.log(`✅ [DUE] Added due task: "${task.name}" (${task._id})`);
          }
        } catch (error) {
          errorCount++;
          console.error(`💥 [DUE] Error processing task ${task._id}:`, error);
          // Continue processing other tasks instead of failing completely
        }
      }
      
      console.log('📈 [DUE] Processing summary:', {
        totalTasks: allTasks.length,
        processed: processedCount,
        dueTasksFound: dueCount,
        errors: errorCount,
        finalDueTasksCount: dueTasks.length
      });
      
      // Sort due tasks by scheduled time for consistent ordering
      dueTasks.sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        return 0;
      });
      
      console.log('🏁 [DUE] Returning due tasks:', dueTasks.map(t => ({
        id: t.id,
        name: t.name,
        scheduledTime: t.scheduledTime,
        pattern: t.recurrencePattern
      })));
      
      return apiResponse(dueTasks);
    } catch (error) {
      console.error('💥 [DUE] Fatal error in due tasks endpoint:', error);
      return handleApiError(error, 'Error fetching due tasks');
    }
  },
  AuthLevel.DEV_OPTIONAL
);