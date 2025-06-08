import mongoose from 'mongoose';
import { ITask, ITaskMethods, RecurrencePattern, TaskPriority, ITaskModel } from '@/types/models/tasks';

const TaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  scheduledTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid time format! Use HH:MM format.`
    }
  },
  completed: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  recurrencePattern: {
    type: String,
    enum: ['once', 'daily', 'custom'], // Simplified: removed weekdays, weekends, weekly
    default: 'once'
  },
  customRecurrenceDays: {
    type: [Number],
    validate: {
      validator: function(this: any, v: number[]) {
        if (this.recurrencePattern !== 'custom') return true;
        return v.length > 0 && v.every(day => day >= 0 && day <= 6);
      },
      message: 'Custom recurrence days must be specified (0-6, where 0 is Sunday)'
    },
    default: []
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  bestStreak: {
    type: Number,
    default: 0
  },
  lastCompletedDate: {
    type: Date,
    default: null
  },
  category: {
    type: String,
    default: 'general',
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completionHistory: {
    type: [Date],
    default: []
  }
}, { timestamps: true });

// Helper function to normalize date to start of day in UTC
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

// Helper function to format date for comparison
function getDateKey(date: Date): string {
  const normalized = normalizeDate(date);
  return normalized.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Helper function to calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  const diffTime = Math.abs(normalized2.getTime() - normalized1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Check if task is completed on a specific date
TaskSchema.methods.isCompletedOnDate = function(date: Date): boolean {
  if (!this.completionHistory || this.completionHistory.length === 0) return false;
  
  const targetDateKey = getDateKey(date);
  
  return this.completionHistory.some((completionDate: Date) => {
    const historyDateKey = getDateKey(completionDate);
    return historyDateKey === targetDateKey;
  });
};

// SIMPLIFIED: Check if task is due on a specific date (only 3 patterns now)
TaskSchema.methods.isTaskDueToday = function(date: Date): boolean {
  const taskId = this._id?.toString() || 'unknown';
  const checkDate = normalizeDate(date);
  const checkDateKey = getDateKey(checkDate);
  const dayOfWeek = checkDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Validate task has required fields
  if (!this.recurrencePattern || !this.date) {
    console.warn(`⚠️ [TASK-${taskId}] Missing required fields for due check`);
    return false;
  }
  
  const taskCreationDate = normalizeDate(new Date(this.date));
  const taskDateKey = getDateKey(taskCreationDate);
  
  console.log(`🔍 [TASK-${taskId}] Due check for "${this.name}":`, {
    pattern: this.recurrencePattern,
    checkDate: checkDateKey,
    taskCreated: taskDateKey,
    dayOfWeek
  });
  
  switch (this.recurrencePattern) {
    case 'once': {
      // Task only occurs on its exact creation date
      const isDue = taskDateKey === checkDateKey;
      console.log(`📅 [TASK-${taskId}] "Once" pattern: ${isDue ? 'DUE' : 'NOT DUE'} (created: ${taskDateKey}, check: ${checkDateKey})`);
      return isDue;
    }
    
    case 'daily': {
      // Task is due every day after (and including) creation date
      const isDue = checkDate >= taskCreationDate;
      console.log(`📅 [TASK-${taskId}] "Daily" pattern: ${isDue ? 'DUE' : 'NOT DUE'} (check >= creation: ${checkDate >= taskCreationDate})`);
      return isDue;
    }
    
    case 'custom': {
      // Task is due on specified days of week after creation date
      const isAfterCreation = checkDate >= taskCreationDate;
      if (!isAfterCreation) {
        console.log(`📅 [TASK-${taskId}] "Custom" pattern: NOT DUE (before creation date)`);
        return false;
      }
      
      const customDays = this.customRecurrenceDays || [];
      const isDue = customDays.includes(dayOfWeek);
      console.log(`📅 [TASK-${taskId}] "Custom" pattern: ${isDue ? 'DUE' : 'NOT DUE'} (custom days: [${customDays.join(',')}], today: ${dayOfWeek})`);
      return isDue;
    }
    
    default: {
      console.warn(`⚠️ [TASK-${taskId}] Unknown recurrence pattern: ${this.recurrencePattern}`);
      return false;
    }
  }
};

// OPTIMIZED: Calculate current streak with early termination and pattern-specific logic
TaskSchema.methods.calculateStreak = function(): number {
  if (!this.completionHistory || this.completionHistory.length === 0) return 0;
  
  // For "once" tasks, streak is just 0 or 1
  if (this.recurrencePattern === 'once') {
    return this.completionHistory.length > 0 ? 1 : 0;
  }
  
  // Convert completion history to Set for O(1) lookups
  const completionKeySet = new Set(
    this.completionHistory.map((date: Date) => getDateKey(date))
  );
  
  const today = normalizeDate(new Date());
  const MAX_DAYS_TO_CHECK = 90; // Reasonable limit
  
  let streak = 0;
  let checkDate = new Date(today);
  let daysChecked = 0;
  
  // Pattern-specific streak calculation with early termination
  while (daysChecked < MAX_DAYS_TO_CHECK) {
    const checkKey = getDateKey(checkDate);
    const isDueOnThisDate = this.isTaskDueToday(checkDate);
    
    if (isDueOnThisDate) {
      const isCompleted = completionKeySet.has(checkKey);
      
      if (isCompleted) {
        streak++;
      } else {
        // Gap found - task was due but not completed, streak ends
        break;
      }
    }
    
    // Move to previous day
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    daysChecked++;
    
    // Early termination for daily tasks if we hit creation date
    if (this.recurrencePattern === 'daily') {
      const taskCreationDate = normalizeDate(new Date(this.date));
      if (checkDate < taskCreationDate) {
        break; // Can't go before task was created
      }
    }
  }
  
  return streak;
};

// Mark task as completed for a specific date
TaskSchema.methods.completeTask = function(date: Date): void {
  const completionDate = normalizeDate(date);
  const dateKey = getDateKey(completionDate);
  
  // Check if this date already exists in history using date key comparison
  const dateExists = this.completionHistory.some((d: Date) => {
    return getDateKey(d) === dateKey;
  });
  
  if (!dateExists) {
    this.completionHistory.push(completionDate);
    this.lastCompletedDate = completionDate;
    
    // Update streak after adding completion
    const newStreak = this.calculateStreak();
    this.currentStreak = newStreak;
    
    // Update best streak if current streak is better
    if (newStreak > this.bestStreak) {
      this.bestStreak = newStreak;
    }
  }
  
  // Update global completed flag
  this.completed = this.completionHistory.length > 0;
};

// Mark task as uncompleted for a specific date
TaskSchema.methods.uncompleteTask = function(date: Date): void {
  const targetDateKey = getDateKey(date);
  
  // Remove the date from completion history using date key comparison
  this.completionHistory = this.completionHistory.filter((d: Date) => {
    return getDateKey(d) !== targetDateKey;
  });
  
  // Update lastCompletedDate to the most recent completion
  if (this.completionHistory.length > 0) {
    const sortedDates = [...this.completionHistory].sort((a, b) => b.getTime() - a.getTime());
    this.lastCompletedDate = sortedDates[0];
  } else {
    this.lastCompletedDate = null;
  }
  
  // Update streak after removing completion
  const newStreak = this.calculateStreak();
  this.currentStreak = newStreak;
  
  // Update global completed flag
  this.completed = this.completionHistory.length > 0;
};

// Reset streak counter
TaskSchema.methods.resetStreak = function(): void {
  this.currentStreak = 0;
};

// Pre-save middleware to maintain data integrity
TaskSchema.pre('save', function(this: any, next) {
  // Ensure completionHistory dates are unique using date keys
  const uniqueDateKeys = new Set();
  const uniqueDates: Date[] = [];
  
  this.completionHistory.forEach((d: Date) => {
    const dateKey = getDateKey(d);
    if (!uniqueDateKeys.has(dateKey)) {
      uniqueDateKeys.add(dateKey);
      uniqueDates.push(normalizeDate(d));
    }
  });
  
  this.completionHistory = uniqueDates.sort((a, b) => a.getTime() - b.getTime());
  
  next();
});

// This maintains Mongoose model singleton pattern
export default mongoose.models.Task as ITaskModel || 
  mongoose.model<ITask, ITaskModel>('Task', TaskSchema);