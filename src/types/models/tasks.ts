import mongoose from 'mongoose';

// SIMPLIFIED: Only 3 recurrence patterns now
export type RecurrencePattern = 'once' | 'daily' | 'custom';
export type TaskPriority = 'low' | 'medium' | 'high';
export type DomainCategory = 'ethos' | 'trophe' | 'soma';

// Define interface for task instance methods
export interface ITaskMethods {
  calculateStreak(): number;
  completeTask(date: Date): void;
  uncompleteTask(date: Date): void;
  isCompletedOnDate(date: Date): boolean;
  isTaskDueToday(date: Date): boolean;
  resetStreak(): void;
}

// Define interface for task static methods
export interface ITaskStatics {
  getTotalCompletionsForLabel(userId: mongoose.Types.ObjectId, label: string): Promise<number>;
  getCurrentStreakForLabel(userId: mongoose.Types.ObjectId, label: string): Promise<number>;
}

// Define the main task interface with new fields
export interface ITask extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  scheduledTime: string;
  completed: boolean;
  date: Date;
  recurrencePattern: RecurrencePattern;
  customRecurrenceDays: number[];
  
  // SIMPLIFIED: Simple counters instead of complex calculations
  currentStreak: number;
  totalCompletions: number;
  lastCompletedDate: Date | null;
  
  // NEW: Organization and identification
  domainCategory: DomainCategory;
  labels: string[];
  isSystemTask: boolean;
  
  // Existing fields
  category: string;
  priority: TaskPriority;
  completionHistory: Date[]; // Kept for backup/recovery only
  createdAt: Date;
  updatedAt: Date;
  
  // Include methods from ITaskMethods
  calculateStreak: () => number;
  completeTask: (date: Date) => void;
  uncompleteTask: (date: Date) => void;
  isCompletedOnDate: (date: Date) => boolean;
  isTaskDueToday: (date: Date) => boolean;
  resetStreak: () => void;
}

// Define the task model interface with static methods
export interface ITaskModel extends mongoose.Model<ITask, {}, ITaskMethods>, ITaskStatics {}