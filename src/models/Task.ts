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

// Calculate current streak based on completion history
TaskSchema.methods.calculateStreak = function(): number {
  if (!this.completionHistory.length) return 0;
  
  // Sort dates in descending order
  const sortedDates = [...this.completionHistory].sort((a, b) => b.getTime() - a.getTime());
  
  let streak = 1;
  const MILLISECONDS_IN_DAY = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If the most recent completion is not from today or yesterday, streak is broken
  const mostRecentDate = new Date(sortedDates[0]);
  mostRecentDate.setHours(0, 0, 0, 0);
  
  const dayDifference = Math.floor((today.getTime() - mostRecentDate.getTime()) / MILLISECONDS_IN_DAY);
  
  // If the most recent completion is older than yesterday, streak is broken
  if (dayDifference > 1) return 0;
  
  // Calculate consecutive days
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = new Date(sortedDates[i]);
    const nextDate = new Date(sortedDates[i + 1]);
    
    // Set to beginning of day for comparison
    currentDate.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / MILLISECONDS_IN_DAY);
    
    // If days are consecutive, increment streak
    if (diffDays === 1) {
      streak++;
    } else {
      break; // Break the streak chain if not consecutive
    }
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
    this.lastCompletedDate = date;
    this.completed = true;
    
    // Update streak
    const newStreak = this.calculateStreak();
    this.currentStreak = newStreak;
    
    // Update best streak if current streak is better
    if (newStreak > this.bestStreak) {
      this.bestStreak = newStreak;
    }
  }
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

// Pre-save middleware to maintain streak integrity
TaskSchema.pre('save', function(this: any, next) {
  const task = this;
  
  // Check if completion status changed to false
  if (task.isModified('completed') && !task.completed) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If the task was due today and marked incomplete, reset streak
    if (task.isTaskDueToday(today)) {
      task.resetStreak();
    }
  }
  
  next();
});

// This maintains Mongoose model singleton pattern
export default mongoose.models.Task as ITaskModel || 
  mongoose.model<ITaskDocument, ITaskModel>('Task', TaskSchema);