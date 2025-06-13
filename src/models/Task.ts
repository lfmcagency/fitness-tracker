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
    enum: ['once', 'daily', 'custom'],
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
  // NEW: Simple counters for event-driven architecture
  currentStreak: {
    type: Number,
    default: 0
  },
  totalCompletions: {
    type: Number,
    default: 0
  },
  lastCompletedDate: {
    type: Date,
    default: null
  },
  // NEW: Organization fields
  domainCategory: {
    type: String,
    required: true,
    enum: ['ethos', 'trophe', 'soma'], // Add more domains as needed
    default: 'ethos'
  },
  labels: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        return v.every(label => label.length > 0 && label.length <= 50);
      },
      message: 'Labels must be non-empty and less than 50 characters'
    }
  },
  // NEW: System task indicator
  isSystemTask: {
    type: Boolean,
    default: false
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
  // Keep completion history for backup/recovery only
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

// Helper function to find previous pattern day for custom recurrence
function getPreviousPatternDay(currentDate: Date, patternDays: number[]): Date | null {
  if (!patternDays || patternDays.length === 0) return null;
  
  const current = normalizeDate(currentDate);
  let daysBack = 1;
  let checkDate = new Date(current);
  
  // Look back up to 7 days to find previous pattern day
  while (daysBack <= 7) {
    checkDate.setUTCDate(current.getUTCDate() - daysBack);
    const dayOfWeek = checkDate.getUTCDay();
    
    if (patternDays.includes(dayOfWeek)) {
      return checkDate;
    }
    
    daysBack++;
  }
  
  return null; // No previous pattern day found
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

// Check if task is due on a specific date
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

// SIMPLIFIED: Calculate current streak with new event-driven logic
TaskSchema.methods.calculateStreak = function(): number {
  // For "once" tasks, no streak logic
  if (this.recurrencePattern === 'once') {
    return this.totalCompletions > 0 ? 1 : 0;
  }
  
  if (!this.completionHistory || this.completionHistory.length === 0) {
    return 0;
  }
  
  // Convert completion history to Set for O(1) lookups
  const completionKeySet = new Set(
    this.completionHistory.map((date: Date) => getDateKey(date))
  );
  
  const today = normalizeDate(new Date());
  let streak = 0;
  let checkDate = new Date(today);
  
  // Pattern-specific streak calculation
  switch (this.recurrencePattern) {
    case 'daily': {
      // Simple 1-day lookback for daily tasks
      while (streak < 365) { // Reasonable limit
        const checkKey = getDateKey(checkDate);
        const isDueOnThisDate = this.isTaskDueToday(checkDate);
        
        if (isDueOnThisDate) {
          const isCompleted = completionKeySet.has(checkKey);
          
          if (isCompleted) {
            streak++;
          } else {
            break; // Gap found - streak ends
          }
        }
        
        // Move to previous day
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        
        // Stop if we go before task creation
        const taskCreationDate = normalizeDate(new Date(this.date));
        if (checkDate < taskCreationDate) {
          break;
        }
      }
      break;
    }
    
    case 'custom': {
      // Smart gap calculation for custom patterns
      const patternDays = this.customRecurrenceDays || [];
      if (patternDays.length === 0) break;
      
      let currentPatternDate = new Date(today);
      
      while (streak < 52) { // Reasonable limit for weekly patterns
        const checkKey = getDateKey(currentPatternDate);
        const dayOfWeek = currentPatternDate.getUTCDay();
        
        // Only check if this date is in the pattern
        if (patternDays.includes(dayOfWeek)) {
          const isCompleted = completionKeySet.has(checkKey);
          
          if (isCompleted) {
            streak++;
            
            // Find previous pattern day
            const previousPatternDate = getPreviousPatternDay(currentPatternDate, patternDays);
            if (!previousPatternDate) break;
            
            currentPatternDate = previousPatternDate;
          } else {
            break; // Gap found - streak ends
          }
        } else {
          // This shouldn't happen, but if it does, find previous pattern day
          const previousPatternDate = getPreviousPatternDay(currentPatternDate, patternDays);
          if (!previousPatternDate) break;
          
          currentPatternDate = previousPatternDate;
        }
        
        // Stop if we go before task creation
        const taskCreationDate = normalizeDate(new Date(this.date));
        if (currentPatternDate < taskCreationDate) {
          break;
        }
      }
      break;
    }
  }
  
  return streak;
};

// SIMPLIFIED: Mark task as completed for a specific date
TaskSchema.methods.completeTask = function(date: Date): void {
  const completionDate = normalizeDate(date);
  const dateKey = getDateKey(completionDate);
  
  // Check if this date already exists in history
  const dateExists = this.completionHistory.some((d: Date) => {
    return getDateKey(d) === dateKey;
  });
  
  if (!dateExists) {
    // Add to completion history (for backup)
    this.completionHistory.push(completionDate);
    this.lastCompletedDate = completionDate;
    
    // Update simple counters
    this.totalCompletions += 1;
    
    // Recalculate streak
    const newStreak = this.calculateStreak();
    this.currentStreak = newStreak;
  }
  
  // Update global completed flag
  this.completed = this.totalCompletions > 0;
};

// SIMPLIFIED: Mark task as uncompleted for a specific date
TaskSchema.methods.uncompleteTask = function(date: Date): void {
  const targetDateKey = getDateKey(date);
  
  // Check if the date exists in completion history
  const dateExists = this.completionHistory.some((d: Date) => {
    return getDateKey(d) === targetDateKey;
  });
  
  if (dateExists) {
    // Remove the date from completion history
    this.completionHistory = this.completionHistory.filter((d: Date) => {
      return getDateKey(d) !== targetDateKey;
    });
    
    // Update simple counters
    this.totalCompletions = Math.max(0, this.totalCompletions - 1);
    
    // Update lastCompletedDate to the most recent completion
    if (this.completionHistory.length > 0) {
      const sortedDates = [...this.completionHistory].sort((a, b) => b.getTime() - a.getTime());
      this.lastCompletedDate = sortedDates[0];
    } else {
      this.lastCompletedDate = null;
    }
    
    // Recalculate streak
    const newStreak = this.calculateStreak();
    this.currentStreak = newStreak;
  }
  
  // Update global completed flag
  this.completed = this.totalCompletions > 0;
};

// Reset streak counter (for manual resets)
TaskSchema.methods.resetStreak = function(): void {
  this.currentStreak = 0;
};

// NEW: Get total completions for a label across all tasks
TaskSchema.statics.getTotalCompletionsForLabel = async function(userId: mongoose.Types.ObjectId, label: string): Promise<number> {
  const tasks = await this.find({ 
    user: userId, 
    labels: label 
  });
  
  return tasks.reduce((total: any, task: { totalCompletions: any; }) => total + (task.totalCompletions || 0), 0);
};

// NEW: Get current streak for a label (highest among tasks with this label)
TaskSchema.statics.getCurrentStreakForLabel = async function(userId: mongoose.Types.ObjectId, label: string): Promise<number> {
  const tasks = await this.find({ 
    user: userId, 
    labels: label 
  });
  
  return Math.max(...tasks.map((task: { currentStreak: any; }) => task.currentStreak || 0), 0);
};

// Pre-save middleware to maintain data integrity
TaskSchema.pre('save', function(this: any, next) {
  // Ensure completionHistory dates are unique and sorted
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
  
  // Ensure counters are never negative
  this.totalCompletions = Math.max(0, this.totalCompletions || 0);
  this.currentStreak = Math.max(0, this.currentStreak || 0);
  
  // Auto-generate labels if empty and not a system task
  if (!this.isSystemTask && (!this.labels || this.labels.length === 0)) {
    const sanitizedName = this.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.labels = [sanitizedName];
  }
  
  next();
});

// Create indexes for efficient queries
TaskSchema.index({ user: 1, domainCategory: 1 });
TaskSchema.index({ user: 1, labels: 1 });
TaskSchema.index({ user: 1, isSystemTask: 1 });
TaskSchema.index({ user: 1, recurrencePattern: 1 });

// This maintains Mongoose model singleton pattern
export default mongoose.models.Task as ITaskModel || 
  mongoose.model<ITask, ITaskModel>('Task', TaskSchema);