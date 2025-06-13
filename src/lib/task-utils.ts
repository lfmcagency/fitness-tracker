import { TaskData, DomainCategory } from '@/types';
import { ITask } from '@/types/models/tasks';

/**
 * SIMPLIFIED Task utilities for event-driven architecture
 * 
 * NO XP COORDINATION - that's handled by the coordinator now
 * Just pure task logic, conversions, and validation
 */

/**
 * Convert database task to API format with new architecture fields
 */
export function convertTaskToTaskData(task: ITask, checkDate?: Date): TaskData {
  if (!task) {
    throw new Error('Task is required for conversion');
  }

  // Defensive access to nested properties
  const completionHistory = Array.isArray(task.completionHistory) ? task.completionHistory : [];
  const lastCompleted = task.lastCompletedDate?.toISOString() || null;
  
  // NEW: Handle date-specific completion checking if checkDate provided
  const isCompletedForDate = checkDate ? task.isCompletedOnDate(checkDate) : task.completed;
  
  return {
    id: task._id.toString(),
    name: task.name || '',
    description: task.description || '',
    scheduledTime: task.scheduledTime || '00:00',
    completed: isCompletedForDate || false,
    date: task.date ? task.date.toISOString() : new Date().toISOString(),
    recurrencePattern: task.recurrencePattern || 'once',
    customRecurrenceDays: task.customRecurrenceDays || [],
    
    // NEW: Simple counters from model (no calculations here)
    currentStreak: task.currentStreak || 0,
    totalCompletions: task.totalCompletions || 0,
    lastCompleted,
    
    // NEW: Organization fields
    domainCategory: task.domainCategory || 'ethos',
    labels: Array.isArray(task.labels) ? [...task.labels] : [],
    isSystemTask: task.isSystemTask || false,
    
    // Existing fields
    category: task.category || 'general',
    priority: task.priority || 'medium',
    timeBlock: getTaskTimeBlock(task.scheduledTime),
    user: task.user?.toString(),
    createdAt: task.createdAt ? task.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: task.updatedAt ? task.updatedAt.toISOString() : new Date().toISOString(),
    
    // DEPRECATED: Keep for compatibility but not used for calculations
    bestStreak: Math.max(task.currentStreak || 0, task.totalCompletions || 0), // Rough estimate
    completionHistory: completionHistory.map(date => date.toISOString()),
    lastCompletedDate: lastCompleted, // Alias for lastCompleted
  };
}

/**
 * Check if task is due on a specific date based on recurrence pattern
 * Pure date logic, no side effects
 */
export function isTaskDueOnDate(task: ITask, targetDate: Date): boolean {
  if (!task || !targetDate) return false;
  
  try {
    return task.isTaskDueToday(targetDate);
  } catch (error) {
    console.error('Error checking if task is due:', error);
    return false;
  }
}

/**
 * Get the appropriate time block for a task
 * Helper for task organization
 */
export function getTaskTimeBlock(scheduledTime: string): 'morning' | 'afternoon' | 'evening' {
  if (!scheduledTime) return 'morning';
  
  const [hoursStr] = scheduledTime.split(':');
  const hours = parseInt(hoursStr, 10);
  
  if (isNaN(hours)) return 'morning';
  
  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 18) return 'afternoon';
  return 'evening';
}

/**
 * Validate task data for creation/updates
 * Enhanced for new architecture fields
 */
export function validateTaskData(data: Partial<TaskData>): string[] {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Task name is required');
  }
  
  if (data.name && data.name.length > 100) {
    errors.push('Task name must be less than 100 characters');
  }
  
  if (data.scheduledTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.scheduledTime)) {
    errors.push('Scheduled time must be in HH:MM format');
  }
  
  const validPriorities = ['low', 'medium', 'high'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    errors.push('Priority must be low, medium, or high');
  }
  
  const validTimeBlocks = ['morning', 'afternoon', 'evening'];
  if (data.timeBlock && !validTimeBlocks.includes(data.timeBlock)) {
    errors.push('Time block must be morning, afternoon, or evening');
  }
  
  const validPatterns = ['once', 'daily', 'custom']; // UPDATED: Only 3 patterns
  if (data.recurrencePattern && !validPatterns.includes(data.recurrencePattern)) {
    errors.push('Invalid recurrence pattern');
  }
  
  // NEW: Validate domain category
  const validDomainCategories = ['ethos', 'trophe', 'soma'];
  if (data.domainCategory && !validDomainCategories.includes(data.domainCategory)) {
    errors.push('Domain category must be ethos, trophe, or soma');
  }
  
  // NEW: Validate labels
  if (data.labels && !Array.isArray(data.labels)) {
    errors.push('Labels must be an array of strings');
  }
  
  if (data.labels && data.labels.some(label => 
    typeof label !== 'string' || label.trim().length === 0 || label.length > 50)) {
    errors.push('All labels must be non-empty strings less than 50 characters');
  }
  
  // Custom recurrence validation
  if (data.recurrencePattern === 'custom') {
    if (!data.customRecurrenceDays || !Array.isArray(data.customRecurrenceDays) || 
        data.customRecurrenceDays.length === 0) {
      errors.push('Custom recurrence days are required for custom pattern');
    }
    
    if (data.customRecurrenceDays && 
        !data.customRecurrenceDays.every(day => 
          typeof day === 'number' && day >= 0 && day <= 6)) {
      errors.push('Custom recurrence days must be numbers 0-6 (Sunday to Saturday)');
    }
  }
  
  return errors;
}

/**
 * Generate default labels for a task based on its name
 * Helper for automatic labeling
 */
export function generateDefaultLabels(taskName: string, domainCategory?: DomainCategory): string[] {
  if (!taskName) return [];
  
  // Sanitize task name to create a label
  const sanitizedName = taskName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 30); // Limit length
  
  const labels = [sanitizedName];
  
  // Add domain-specific default labels
  if (domainCategory) {
    switch (domainCategory) {
      case 'ethos':
        labels.push('productivity', 'habit');
        break;
      case 'trophe':
        labels.push('nutrition', 'health');
        break;
      case 'soma':
        labels.push('exercise', 'fitness');
        break;
    }
  }
  
  return labels.filter(label => label.length > 0);
}

/**
 * Check if a task is a system task (connected to other domains)
 */
export function isSystemTask(task: ITask | TaskData): boolean {
  return !!(task.isSystemTask);
}

/**
 * Get user-friendly recurrence pattern description
 */
export function getRecurrenceDescription(pattern: string, customDays?: number[]): string {
  switch (pattern) {
    case 'once':
      return 'One time only';
    case 'daily':
      return 'Every day';
    case 'custom':
      if (!customDays || customDays.length === 0) return 'Custom schedule';
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const selectedDays = customDays.map(day => dayNames[day]).join(', ');
      return `${selectedDays}`;
    default:
      return 'Unknown pattern';
  }
}

/**
 * Calculate completion percentage for a task based on its total completions and streak
 * Simple heuristic for UI progress indicators
 */
export function getTaskCompletionScore(task: TaskData | ITask): number {
  const totalCompletions = task.totalCompletions || 0;
  const currentStreak = task.currentStreak || 0;
  
  // Simple scoring: combination of total completions and current streak
  // Scale: 0-100 where 100 is very active task
  const completionScore = Math.min(totalCompletions * 2, 50); // Max 50 from completions
  const streakScore = Math.min(currentStreak * 3, 50); // Max 50 from streak
  
  return Math.min(completionScore + streakScore, 100);
}

/**
 * Get task status for UI display
 */
export function getTaskStatus(task: TaskData | ITask): {
  status: 'active' | 'inactive' | 'new' | 'system';
  description: string;
  color: 'green' | 'yellow' | 'gray' | 'blue';
} {
  if (task.isSystemTask) {
    return {
      status: 'system',
      description: 'System managed',
      color: 'blue'
    };
  }
  
  const totalCompletions = task.totalCompletions || 0;
  const currentStreak = task.currentStreak || 0;
  
  if (totalCompletions === 0) {
    return {
      status: 'new',
      description: 'Not started',
      color: 'gray'
    };
  }
  
  if (currentStreak >= 3) {
    return {
      status: 'active',
      description: `${currentStreak} day streak`,
      color: 'green'
    };
  }
  
  return {
    status: 'inactive',
    description: `${totalCompletions} completions`,
    color: 'yellow'
  };
}

/**
 * Sort tasks by priority and activity for UI display
 */
export function sortTasksByPriority(tasks: TaskData[]): TaskData[] {
  return [...tasks].sort((a, b) => {
    // System tasks first
    if (a.isSystemTask && !b.isSystemTask) return -1;
    if (!a.isSystemTask && b.isSystemTask) return 1;
    
    // Then by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 2;
    const bPriority = priorityOrder[b.priority] || 2;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }
    
    // Then by current streak (active tasks first)
    const aStreak = a.currentStreak || 0;
    const bStreak = b.currentStreak || 0;
    
    if (aStreak !== bStreak) {
      return bStreak - aStreak; // Higher streak first
    }
    
    // Finally by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter tasks by various criteria for UI
 */
export function filterTasks(tasks: TaskData[], filters: {
  domainCategory?: DomainCategory;
  labels?: string[];
  isSystemTask?: boolean;
  priority?: string;
  hasStreak?: boolean;
}): TaskData[] {
  return tasks.filter(task => {
    if (filters.domainCategory && task.domainCategory !== filters.domainCategory) {
      return false;
    }
    
    if (filters.labels && filters.labels.length > 0) {
      const hasLabel = filters.labels.some(label => task.labels.includes(label));
      if (!hasLabel) return false;
    }
    
    if (filters.isSystemTask !== undefined && task.isSystemTask !== filters.isSystemTask) {
      return false;
    }
    
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    
    if (filters.hasStreak && (task.currentStreak || 0) === 0) {
      return false;
    }
    
    return true;
  });
}

/**
 * Get tasks grouped by time block for daily view
 */
export function groupTasksByTimeBlock(tasks: TaskData[]): {
  morning: TaskData[];
  afternoon: TaskData[];
  evening: TaskData[];
} {
  const grouped = {
    morning: [] as TaskData[],
    afternoon: [] as TaskData[],
    evening: [] as TaskData[]
  };
  
  tasks.forEach(task => {
    const timeBlock = getTaskTimeBlock(task.scheduledTime);
    grouped[timeBlock].push(task);
  });
  
  // Sort each time block by scheduled time
  Object.keys(grouped).forEach(timeBlock => {
    grouped[timeBlock as keyof typeof grouped].sort((a, b) => 
      a.scheduledTime.localeCompare(b.scheduledTime)
    );
  });
  
  return grouped;
}