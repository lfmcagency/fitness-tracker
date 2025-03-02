// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Task, { ITask } from '@/models/Task';
import { getAuth } from '@/lib/auth';

/**
 * API endpoint to get tasks due for a specific date
 * - GET: Get all tasks due for the specified date
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access even without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the query parameters
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const categoryParam = url.searchParams.get('category');
    const priorityParam = url.searchParams.get('priority');
    
    // Parse the date or use today
    const checkDate = dateParam ? new Date(dateParam) : new Date();
    // Normalize to start of day
    checkDate.setHours(0, 0, 0, 0);
    
    // Get day of week for recurrence pattern check
    const dayOfWeek = checkDate.getDay(); // 0 is Sunday, 6 is Saturday
    
    // If we have a user session, get the real tasks
    if (session?.user?.id) {
      // Find all user's tasks
      const allTasks = await Task.find({ 
        user: session.user.id,
        ...(categoryParam ? { category: categoryParam } : {}),
        ...(priorityParam ? { priority: priorityParam } : {})
      }) as ITask[];
      
      // Filter tasks that are due on the check date based on their recurrence pattern
      const dueTasks = allTasks.filter(task => task.isTaskDueToday(checkDate));
      
      return NextResponse.json({ success: true, data: dueTasks });
    }
    
    // Mock data for development
    // Create a set of tasks with different recurrence patterns
    const mockTasks = [];
    
    // Add daily tasks
    mockTasks.push({
      id: 1,
      name: "Morning Weigh-in",
      scheduledTime: "06:00",
      completed: false,
      currentStreak: 7,
      bestStreak: 12,
      recurrencePattern: "daily",
      category: "health",
      priority: "high"
    });
    
    // Add weekday tasks if current day is a weekday
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      mockTasks.push({
        id: 2,
        name: "Workout Session",
        scheduledTime: "17:00",
        completed: false,
        currentStreak: 3,
        bestStreak: 10,
        recurrencePattern: "weekdays",
        category: "fitness",
        priority: "high"
      });
    }
    
    // Add weekend tasks if current day is weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      mockTasks.push({
        id: 3,
        name: "Long Run",
        scheduledTime: "08:00",
        completed: false,
        currentStreak: 2,
        bestStreak: 8,
        recurrencePattern: "weekends",
        category: "fitness",
        priority: "medium"
      });
    }
    
    // Add weekly task if today matches creation day (use Monday as example)
    if (dayOfWeek === 1) {
      mockTasks.push({
        id: 4,
        name: "Weekly Planning",
        scheduledTime: "09:00",
        completed: false,
        currentStreak: 4,
        bestStreak: 12,
        recurrencePattern: "weekly",
        category: "productivity",
        priority: "high"
      });
    }
    
    // Add custom recurrence tasks if day matches the pattern
    // Example: Tuesday and Thursday (days 2 and 4)
    if (dayOfWeek === 2 || dayOfWeek === 4) {
      mockTasks.push({
        id: 5,
        name: "Yoga Session",
        scheduledTime: "19:00",
        completed: false,
        currentStreak: 5,
        bestStreak: 14,
        recurrencePattern: "custom",
        customRecurrenceDays: [2, 4],
        category: "wellness",
        priority: "medium"
      });
    }
    
    // Filter by category if specified
    let filteredTasks = mockTasks;
    if (categoryParam) {
      filteredTasks = filteredTasks.filter(task => task.category === categoryParam);
    }
    
    // Filter by priority if specified
    if (priorityParam) {
      filteredTasks = filteredTasks.filter(task => task.priority === priorityParam);
    }
    
    return NextResponse.json({ success: true, data: filteredTasks });
  } catch (error) {
    console.error('Error in GET /api/tasks/due:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching due tasks' 
    }, { status: 500 });
  }
}