import mongoose from 'mongoose';
import { ITask, ITaskMethods, RecurrencePattern, TaskPriority, ITaskModel } from '@/types/models/tasks';

// Define TypeScript interfaces
export interface ITaskDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  scheduledTime: string;
  completed: boolean;
  date: Date;
  recurrencePattern: RecurrencePattern;
  customRecurrenceDays: number[];
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: Date | null;
  category: string;
  priority: TaskPriority;
  completionHistory: Array<Date>;
  calculateStreak(): number;
  completeTask(date: Date): void;
  uncompleteTask(date: Date): void;
  isCompletedOnDate(date: Date): boolean;
  isTaskDueToday(date: Date): boolean;
  resetStreak(): void;
}

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

// Check if task is completed on a specific date
TaskSchema.methods.isCompletedOnDate = function(date: Date): boolean {
  if (!this.completionHistory || this.completionHistory.length === 0) return false;
  
  const targetDateKey = getDateKey(date);
  
  return this.completionHistory.some((completionDate: Date) => {
    const historyDateKey = getDateKey(completionDate);
    return historyDateKey === targetDateKey;
  });
};

// Check if task is due on a specific date based on recurrence pattern
TaskSchema.methods.isTaskDueToday = function(date: Date): boolean {
  const checkDate = normalizeDate(date);
  const dayOfWeek = checkDate.getUTCDay(); // Use UTC day
  
  switch (this.recurrencePattern) {
    case 'once':
      // Task only occurs on its creation date
      const taskDate = normalizeDate(new Date(this.date));
      return getDateKey(taskDate) === getDateKey(checkDate);
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
      // If the original creation day matches the current day
      const creationDate = normalizeDate(new Date(this.date));
      return creationDate.getUTCDay() === dayOfWeek;
    case 'custom':
      return this.customRecurrenceDays.includes(dayOfWeek);
    default:
      return false;
  }
};

// Calculate current streak based on completion history and recurrence pattern
TaskSchema.methods.calculateStreak = function(): number {
  if (!this.completionHistory || this.completionHistory.length === 0) return 0;
  
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
  mongoose.model<ITaskDocument, ITaskModel>('Task', TaskSchema);