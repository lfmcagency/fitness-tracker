// Re-export common types
export * from './api/common';
// Export from pagination with explicit naming
export type { PaginationParams, PaginationInfo } from './api/pagination';
export type { PaginatedResponse } from './api/pagination';
export * from './validation';

// Re-export Authentication & User types with explicit naming to avoid conflicts
export type * from './api/userResponses';
export type * from './models/progress';
export  * from './converters/userConverters';

export type {
  UserProfile as AuthUserProfile,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SessionUser
} from './api/authResponses';

export type {
  BodyweightEntry,
  UserSettings,
  UserProfile as UserModelProfile,
  IUser
} from './models/user';

// Legacy Daily Routine Types
export type RecurrencePattern = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
export type TaskPriority = 'low' | 'medium' | 'high';

// Legacy Task interface for backward compatibility
export interface Task {
  id: number;
  name: string;
  time: string;
  completed: boolean;
  streak: number;
}

// Enhanced Task interfaces
export interface EnhancedTask {
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
}

export interface TaskWithHistory extends EnhancedTask {
  completionHistory: Array<Date | string>;
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