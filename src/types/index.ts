export * from './api/common';
export * from './api/databaseResponses';
export * from './dbUtils';
export * from './api/healthResponses';
export * from './middleware';
export type { PaginationParams, PaginationInfo } from './api/pagination';
export type { PaginatedResponse } from './api/pagination';
export * from './validation';
export type * from './api/taskResponses';
export type * from './api/taskRequests';
export * from './api/exerciseResponses';
export * from './api/exerciseRequests';
export type * from './api/userResponses';
export type * from './models/progress';
export type * from './models/food';
export type * from './models/meal';
export  * from './converters/userConverters';
export * from './api/foodResponses';
export * from './api/foodRequests';
export * from './api/mealResponses';
export * from './api/mealRequests';
export * from './converters/foodConverters';
export * from './converters/mealConverters';
/**
 * Format bytes to human-readable format
 * @param bytes Number of bytes
 * @param decimals Decimal places for formatting
 * @returns Human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export type {
  UserProfile as AuthUserProfile,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SessionUser
} from './api/authResponses';

export type {
  IWeightEntry,
  IUserSettings,
  IUser
} from './models/user';

// Legacy Daily Routine Types
export type RecurrencePattern = 'once' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
export type TaskPriority = 'low' | 'medium' | 'high';

// Simple Task interface for UI/Store layer
export interface TaskItem {
  id: number;
  name: string;
  time: string;
  completed: boolean;
  streak: number;
}

// Comprehensive Task interface for API/Database layer
export interface TaskData {
  description: any;
  id?: string | number;
  _id?: string;
  name: string;
  scheduledTime: string;
  completed: boolean;
  date?: Date | string;
  recurrencePattern: RecurrencePattern;
  customRecurrenceDays?: number[];
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate?: Date | string | null;
  category: string;
  priority: TaskPriority;
  user?: string;
  createdAt?: string;
  updatedAt?: string;
  completionHistory?: string[];
  isNew?: boolean;        // Flag for new tasks being created inline
  timeBlock?: string;     // Time block: 'morning' | 'afternoon' | 'evening'
  completionDate?: string;
}

export interface TaskWithHistory extends TaskData {
  completionHistory: string[];
}

export interface StreakInfo {
  taskId: string | number;
  name: string;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate?: Date | string | null;
  isDueToday: boolean;
  completionHistory?: Array<Date | string>;
}

// Training Types
export interface ExerciseSet {
  reps: number;
  completed: boolean;
}

export interface LastSession {
  maxReps: number;
  totalVolume: number;
}

export interface Exercise {
  id: number;
  name: string;
  sets: ExerciseSet[];
  lastSession: LastSession;
  restTime: number;
}

// Nutrition Types
export interface MacroGoals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface Food {
  name: string;
  amount: number;
  unit?: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  foodId?: string; // Reference to a FoodDB item
}

export interface FoodDB {
  _id?: string;
  name: string;
  description?: string;
  servingSize: number;
  servingUnit: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  category?: string;
  isSystemFood: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Totals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface Meal {
  _id?: string;
  id?: number; // For backward compatibility
  userId?: string;
  name: string;
  time: string;
  date?: Date | string;
  foods: Food[];
  totals?: Totals;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Progress Dashboard Types
export interface PerformanceData {
  date: string;
  pushups: number;
  pullups: number;
  weight: number;
}

export interface Achievement {
  id: number;
  title: string;
  date: string;
  type: 'strength' | 'weight';
}