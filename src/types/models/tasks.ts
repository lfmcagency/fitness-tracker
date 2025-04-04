import mongoose from 'mongoose';

// Define type for recurrence patterns
export type RecurrencePattern = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';

// Define type for task priorities
export type TaskPriority = 'low' | 'medium' | 'high';

// Define interface for task methods
export interface ITaskMethods {
  calculateStreak(): number;
  completeTask(date: Date): void;
  isTaskDueToday(date: Date): boolean;
  resetStreak(): void;
}

// Define the main task interface
export interface ITask extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  name: string;
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
  completionHistory: Date[];
  createdAt: Date;
  updatedAt: Date;
  
  // Include methods from ITaskMethods
  calculateStreak: () => number;
  completeTask: (date: Date) => void;
  isTaskDueToday: (date: Date) => boolean;
  resetStreak: () => void;
}

// Define the task model interface
export interface ITaskModel extends mongoose.Model<ITask, {}, ITaskMethods> {}