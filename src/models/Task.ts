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
    enum: ['once', 'daily', 'weekdays', 'weekends', 'weekly', 'custom'],
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

// BULLETPROOF: Check if task is due on a specific date based on recurrence pattern
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
    
    case 'weekdays': {
      // Task is due Monday-Friday after creation date
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isAfterCreation = checkDate >= taskCreationDate;
      const isDue = isWeekday && isAfterCreation;
      console.log(`📅 [TASK-${taskId}] "Weekdays" pattern: ${isDue ? 'DUE' : 'NOT DUE'} (weekday: ${isWeekday}, after creation: ${isAfterCreation})`);
      return isDue;
    }
    
    case 'weekends': {
      // Task is due Saturday-Sunday after creation date
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isAfterCreation = checkDate >= taskCreationDate;
      const isDue = isWeekend && isAfterCreation;
      console.log(`📅 [TASK-${taskId}] "Weekends" pattern: ${isDue ? 'DUE' : 'NOT DUE'} (weekend: ${isWeekend}, after creation: ${isAfterCreation})`);
      return isDue;
    }
    
    case 'weekly': {
      // Task is due every 7 days starting from creation date
      const isAfterCreation = checkDate >= taskCreationDate;
      if (!isAfterCreation) {
        console.log(`📅 [TASK-${taskId}] "Weekly" pattern: NOT DUE (before creation date)`);
        return false;
      }
      
      const daysDiff = daysBetween(taskCreationDate, checkDate);
      const isDue = daysDiff % 7 === 0;
      console.log(`📅 [TASK-${taskId}] "Weekly" pattern: ${isDue ? 'DUE' : 'NOT DUE'} (days since creation: ${daysDiff}, divisible by 7: ${isDue})`);
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

// Calculate current streak based on completion history and recurrence pattern
TaskSchema.methods.calculateStreak = function(): number {
  if (!this.completionHistory || this.completionHistory.length === 0) return 0;
  
  // For "once" tasks, streak is just 0 or 1
  if (this.recurrencePattern === 'once') {
    return this.completionHistory.length > 0 ? 1 : 0;
  }
  // Get all completion dates as normalized date keys, sorted in descending order
  const completionKeys = this.completionHistory
    .map((date: Date) => getDateKey(date))
    .sort()
    .reverse(); // Most recent first
  
  const today = normalizeDate(new Date());
  const todayKey = getDateKey(today);
  
  // For daily tasks, calculate consecutive days
  if (this.recurrencePattern === 'daily') {
    let streak = 0;
    let checkDate = new Date(today);
    
    // Start from today and go backwards
    for (let i = 0; i < 365; i++) {
      const checkKey = getDateKey(checkDate);
      
      if (completionKeys.includes(checkKey)) {
        streak++;
      } else {
        // Gap found, streak ends
        break;
      }
      
      // Move to previous day
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }
    
    return streak;
  }
  
  // For other patterns, check consecutive due dates
  let streak = 0;
  let checkDate = new Date(today);
  
  for (let i = 0; i < 365; i++) {
    const isDue = this.isTaskDueToday(checkDate);
    const checkKey = getDateKey(checkDate);
    const isCompleted = completionKeys.includes(checkKey);
    
    if (isDue) {
      if (isCompleted) {
        streak++;
      } else {
        // Task was due but not completed, streak ends
        break;
      }
    }
    
    // Move to previous day
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
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