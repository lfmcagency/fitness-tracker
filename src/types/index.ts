// Core API types
export * from './api/common';
export * from './api/databaseResponses';
export * from './api/healthResponses';
export * from './api/pagination';

// Authentication & User types
export type {
  UserProfile as AuthUserProfile,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SessionUser
} from './api/authResponses';
export type * from './api/userResponses';
export type * from './models/user';
export * from './converters/userConverters';

// Task types
export type * from './api/taskResponses';
export type * from './api/taskRequests';

// Exercise types
export * from './api/exerciseResponses';
export * from './api/exerciseRequests';

// Nutrition types (API ONLY - no legacy types)
export * from './api/foodResponses';
export * from './api/foodRequests';
export * from './api/mealResponses';
export * from './api/mealRequests';
export * from './converters/foodConverters';
export * from './converters/mealConverters';

// Progress types (PRESERVED - no changes)
export type * from './models/progress';

// Utils
export * from './dbUtils';
export * from './middleware';
export * from './validation';

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

// UPDATED: Task-related types for event-driven architecture
export type RecurrencePattern = 'once' | 'daily' | 'custom'; // SIMPLIFIED: Only 3 patterns
export type TaskPriority = 'low' | 'medium' | 'high';
export type DomainCategory = 'ethos' | 'trophe' | 'soma'; // NEW: Domain categories

// Simple Task interface for UI/Store layer (PRESERVED)
export interface TaskItem {
  id: number;
  name: string;
  time: string;
  completed: boolean;
  streak: number;
}

// UPDATED: CreateTaskParams for new architecture
export interface CreateTaskParams {
  name: string;
  scheduledTime: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  domainCategory?: DomainCategory; // NEW
  labels?: string[]; // NEW
  category?: string;
  priority?: TaskPriority;
  description?: string;
  isSystemTask?: boolean; // NEW
}

// UPDATED: Comprehensive Task interface for API/Database layer
export interface TaskData {
  id?: string | number;
  _id?: string;
  name: string;
  description?: string;
  scheduledTime: string;
  completed: boolean;
  date?: Date | string;
  recurrencePattern: RecurrencePattern;
  customRecurrenceDays?: number[];
  
  // UPDATED: Simple counters instead of complex calculations
  currentStreak: number;
  totalCompletions: number; // NEW: Replaces complex completion counting
  lastCompleted?: Date | string | null; // RENAMED from lastCompletedDate
  
  // NEW: Organization fields
  domainCategory: DomainCategory;
  labels: string[];
  isSystemTask: boolean;
  
  // EXISTING: Keep these for compatibility
  category: string;
  priority: TaskPriority;
  timeBlock?: string; // 'morning' | 'afternoon' | 'evening'
  user?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // DEPRECATED: Keep for compatibility but not used for calculations
  bestStreak?: number; // Can be calculated from totalCompletions if needed
  completionHistory?: string[]; // Backup only, not used for counters
  lastCompletedDate?: Date | string | null; // Alias for lastCompleted
  
  // UI-only flags
  isNew?: boolean; // Flag for new tasks being created inline
  completionDate?: string; // For completion operations
}

// UPDATED: TaskWithHistory for statistics (now simpler)
export interface TaskWithHistory extends TaskData {
  completionHistory: string[]; // Required for statistics calculations
}

// UPDATED: StreakInfo interface
export interface StreakInfo {
  taskId: string | number;
  name: string;
  currentStreak: number;
  bestStreak: number; // Deprecated but kept for compatibility
  lastCompletedDate?: Date | string | null;
  isDueToday: boolean;
  completionHistory?: Array<Date | string>;
}

// NEW: Event data for coordinator communication
export interface TaskEventData {
  currentStreak: any;
  name: string;
  completionHistory: never[];
  taskId: string;
  userId: string;
  action: 'completed' | 'uncompleted';
  completionDate: string; // ISO string
  
  // Task context for coordinator
  taskName: string;
  domainCategory: DomainCategory;
  labels: string[];
  isSystemTask: boolean;
  
  // Current metrics after the action
  newStreak: number;
  totalCompletions: number;
  
  // For milestone detection
  previousStreak?: number;
  previousTotalCompletions?: number;
  
  // Source of the event
  source: 'api' | 'system';
  timestamp: Date;
}

// Training Types (PRESERVED - no changes)
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

// Progress Dashboard Types (PRESERVED - no changes)
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