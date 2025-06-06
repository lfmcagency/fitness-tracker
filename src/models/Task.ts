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

// Check if task is completed on a specific date
TaskSchema.methods.isCompletedOnDate = function(date: Date): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return this.completionHistory.some((completionDate: Date) => {
    const historyDate = new Date(completionDate);
    historyDate.setHours(0, 0, 0, 0);
    return historyDate.getTime() === checkDate.getTime();
  });
};

// Calculate current streak based on completion history and recurrence pattern
TaskSchema.methods.calculateStreak = function(): number {
  if (!this.completionHistory.length) return 0;
  
  // Sort dates in descending order (most recent first)
  const sortedDates = [...this.completionHistory]
    .map(date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    })
    .sort((a, b) => b.getTime() - a.getTime());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if task is due today and if it's completed
  const isDueToday = this.isTaskDueToday(today);
  const isCompletedToday = this.isCompletedOnDate(today);
  
  // If task is due today but not completed, streak is broken
  if (isDueToday && !isCompletedToday) {
    return 0;
  }
  
  let streak = 0;
  let checkDate = new Date(today);
  
  // Start from today and go backwards
  while (true) {
    const isDue = this.isTaskDueToday(checkDate);
    const isCompleted = this.isCompletedOnDate(checkDate);
    
    if (isDue) {
      if (isCompleted) {
        streak++;
      } else {
        // Task was due but not completed, streak ends
        break;
      }
    }
    // If task is not due on this date, continue to previous day
    
    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Stop if we've gone too far back (e.g., 365 days)
    const daysDiff = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) break;
  }
  
  return streak;
};

// Mark task as completed for a specific date
TaskSchema.methods.completeTask = function(date: Date): void {
  const completionDate = new Date(date);
  completionDate.setHours(0, 0, 0, 0);
  
  // Check if this date already exists in history
  const dateExists = this.completionHistory.some((d: Date) => {
    const existingDate = new Date(d);
    existingDate.setHours(0, 0, 0, 0);
    return existingDate.getTime() === completionDate.getTime();
  });
  
  if (!dateExists) {
    this.completionHistory.push(completionDate);
    this.lastCompletedDate = completionDate;
    
    // Update streak
    const newStreak = this.calculateStreak();
    this.currentStreak = newStreak;
    
    // Update best streak if current streak is better
    if (newStreak > this.bestStreak) {
      this.bestStreak = newStreak;
    }
  }
  
  // Update global completed flag for the most recent completion
  this.completed = this.completionHistory.length > 0;
};

// Mark task as uncompleted for a specific date
TaskSchema.methods.uncompleteTask = function(date: Date): void {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  // Remove the date from completion history
  this.completionHistory = this.completionHistory.filter((d: Date) => {
    const existingDate = new Date(d);
    existingDate.setHours(0, 0, 0, 0);
    return existingDate.getTime() !== targetDate.getTime();
  });
  
  // Update lastCompletedDate to the most recent completion
  if (this.completionHistory.length > 0) {
    const sortedDates = [...this.completionHistory].sort((a, b) => b.getTime() - a.getTime());
    this.lastCompletedDate = sortedDates[0];
  } else {
    this.lastCompletedDate = null;
  }
  
  // Update streak
  const newStreak = this.calculateStreak();
  this.currentStreak = newStreak;
  
  // Update global completed flag
  this.completed = this.completionHistory.length > 0;
};

// Check if task is due today based on recurrence pattern
TaskSchema.methods.isTaskDueToday = function(date: Date): boolean {
  const checkDate = new Date(date);
  const dayOfWeek = checkDate.getDay(); // 0 is Sunday, 6 is Saturday
  
  switch (this.recurrencePattern) {
    case 'once':
      // Task only occurs on its creation date
      const taskDate = new Date(this.date);
      taskDate.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === checkDate.getTime();
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
      // If the original creation day matches the current day
      const creationDate = new Date(this.date);
      return creationDate.getDay() === dayOfWeek;
    case 'custom':
      return this.customRecurrenceDays.includes(dayOfWeek);
    default:
      return false;
  }
};

// Reset streak counter
TaskSchema.methods.resetStreak = function(): void {
  this.currentStreak = 0;
};

// Pre-save middleware to maintain data integrity
TaskSchema.pre('save', function(this: any, next) {
  // Ensure completionHistory dates are unique and sorted
  const uniqueDates = [...new Set(this.completionHistory.map((d: Date) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }))];
  
  this.completionHistory = uniqueDates.map(timestamp => new Date(timestamp as number));
  
  next();
});

// This maintains Mongoose model singleton pattern
export default mongoose.models.Task as ITaskModel || 
  mongoose.model<ITaskDocument, ITaskModel>('Task', TaskSchema);