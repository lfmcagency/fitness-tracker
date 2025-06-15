// Main exports for shared utilities

// ==============================================
// API CALLS - Standard patterns for all stores
// ==============================================
export {
  // Core API utilities
  makeApiCall,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  
  // API error handling
  ApiError,
  
  // Loading state management
  createLoadingState,
  setLoading,
  setSuccess,
  setError,
  
  // Retry and batch utilities
  retryApiCall,
  batchApiCalls,
  
  // Types
  type ApiCallResult,
  type ApiCallConfig,
  type LoadingState
} from './api-calls';

// ==============================================
// ACHIEVEMENTS - Notification extraction logic
// ==============================================
export {
  // Extraction utilities
  extractAchievements,
  extractCoordinatorAchievements,
  mergeAchievementNotifications,
  
  // Filtering and sorting
  filterAchievementsByStatus,
  filterAchievementsByType,
  sortAchievementsForDisplay,
  
  // Statistics and display
  calculateAchievementStats,
  getAchievementTypes,
  hasClaimableAchievements,
  getClaimableAchievements,
  
  // Notification utilities
  formatAchievementMessage,
  createAchievementToast,
  
  // Types
  type AchievementNotification,
  type AchievementData,
  type AchievementStats,
  type NotificationDisplayOptions,
  type AchievementToastData
} from './achievements';

// ==============================================
// DATA SECTIONS - Clean state management
// ==============================================
export {
  // Core data section utilities
  createDataSection,
  setDataSectionLoading,
  setDataSectionSuccess,
  setDataSectionError,
  clearDataSectionError,
  
  // Data section utilities
  dataSectionNeedsRefresh,
  dataSectionHasData,
  dataSectionHasError,
  
  // Multi-section management
  createMultiSectionState,
  setMultiSectionLoading,
  setMultiSectionSuccess,
  setMultiSectionError,
  isAnyMultiSectionLoading,
  hasAnyMultiSectionError,
  getMultiSectionErrors,
  clearAllMultiSectionErrors,
  
  // Paginated data sections
  createPaginatedDataSection,
  setPaginatedDataSectionSuccess,
  appendToPaginatedDataSection,
  resetPaginatedDataSection,
  
  // Types
  type DataSection,
  type MultiSectionState,
  type PaginatedDataSection
} from './data-sections';

// ==============================================
// COUNTERS - Streak and counter logic
// ==============================================
export {
  // Basic counter utilities
  createCounter,
  incrementCounter,
  decrementCounter,
  resetCounterCurrent,
  
  // Streak counter utilities
  createStreakCounter,
  calculateStreak,
  updateStreakCounter,
  breakStreakCounter,
  
  // Milestone and display utilities
  calculateCounterMilestones,
  formatCounterDisplay,
  calculateMilestoneProgress,
  
  // Types
  type Counter,
  type StreakCounter,
  type CounterMilestone
} from './counters';

// ==============================================
// DATES - Date and time utilities
// ==============================================
export {
  // Date formatting utilities
  getTodayString,
  getYesterdayString,
  getTomorrowString,
  formatDateToString,
  parseStringToDate,
  
  // Time block utilities
  getTimeBlockForTime,
  getCurrentTimeBlock,
  isTimeInBlock,
  
  // Date normalization
  normalizeToStartOfDay,
  normalizeToEndOfDay,
  
  // Date comparison utilities
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  daysBetween,
  
  // Date manipulation
  addDays,
  subtractDays,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  
  // Display formatting
  formatDateForDisplay,
  formatTimeForDisplay,
  format24to12Hour,
  getCurrentTimeString,
  
  // Validation
  isValidTimeString,
  isValidDateString,
  
  // Range utilities
  getDateRange,
  isDateInRange,
  getDatesBetween,
  
  // Constants and types
  TIME_BLOCK_RANGES,
  type TimeBlock
} from './dates';

// ==============================================
// FILTERS - Search and filtering patterns
// ==============================================
export {
  // Pagination utilities
  createPaginationParams,
  createPaginationMeta,
  applyPagination,
  
  // Search utilities
  searchText,
  searchMultipleFields,
  
  // Filter utilities
  filterByCategory,
  filterByTags,
  filterByTagsAny,
  filterByProperty,
  filterByDateRange,
  
  // Sorting utilities
  sortItems,
  
  // Comprehensive filtering
  filterAndSearch,
  
  // Utility functions
  getUniqueValues,
  getUniqueCategories,
  getUniqueTags,
  
  // Types
  type PaginationParams,
  type PaginationMeta,
  type SearchParams,
  type FilterParams,
  type FilterResult
} from './filters';

// ==============================================
// VALIDATION - Input validation patterns
// ==============================================
export {
  // Core validation utilities
  validateFields,
  validateObject,
  createValidResult,
  createInvalidResult,
  
  // Basic validators
  required,
  minLength,
  maxLength,
  minValue,
  maxValue,
  isNumber,
  isInteger,
  isEmail,
  isArray,
  arrayMinLength,
  arrayMaxLength,
  
  // Domain-specific validators
  isTimeFormat,
  isDateFormat,
  isValidPriority,
  isValidTimeBlock,
  isValidDomainCategory,
  isValidRecurrencePattern,
  isValidCustomRecurrenceDays,
  isValidLabel,
  isValidNutritionalValue,
  isValidWeight,
  
  // Validation utilities
  combineValidators,
  conditionalValidator,
  regexValidator,
  
  // Common validation sets
  validators,
  
  // Sanitization
  sanitizeInput,
  sanitizeArray,
  
  // Types
  type ValidationResult,
  type ValidationRule,
  type ValidatorFunction,
  type ValidationSchema
} from './validation';

// ==============================================
// COORDINATOR-FRIENDLY CONTEXT CALCULATORS
// ==============================================

/**
 * Context calculation utilities for event coordinator
 * These are the functions coordinator will use to build rich contracts
 */

import { calculateStreak } from './counters';
import { getTodayString, isSameDay } from './dates';

/**
 * Calculate nutrition context for coordinator events
 * Used when meals are logged to build rich progress contracts
 */
export function calculateNutritionContext(
  userId: string,
  date: string,
  meals: any[],
  macroGoals: { protein: number; carbs: number; fat: number; calories: number }
) {
  // Calculate daily macro progress
  const dailyTotals = meals.reduce((totals, meal) => {
    if (meal.totals) {
      totals.protein += meal.totals.protein || 0;
      totals.carbs += meal.totals.carbs || 0;
      totals.fat += meal.totals.fat || 0;
      totals.calories += meal.totals.calories || 0;
    }
    return totals;
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

  const macroProgress = {
    protein: macroGoals.protein > 0 ? Math.round((dailyTotals.protein / macroGoals.protein) * 100) : 0,
    carbs: macroGoals.carbs > 0 ? Math.round((dailyTotals.carbs / macroGoals.carbs) * 100) : 0,
    fat: macroGoals.fat > 0 ? Math.round((dailyTotals.fat / macroGoals.fat) * 100) : 0,
    calories: macroGoals.calories > 0 ? Math.round((dailyTotals.calories / macroGoals.calories) * 100) : 0
  };

  const totalProgress = Math.round((macroProgress.protein + macroProgress.carbs + macroProgress.fat + macroProgress.calories) / 4);

  return {
    dailyMacroProgress: { ...macroProgress, total: totalProgress },
    totalMeals: meals.length, // Use meal count from current session
    mealCount: meals.length,
    macroTotals: dailyTotals
  };
}

/**
 * Calculate task context for coordinator events
 * Used when tasks are completed to build rich progress contracts
 */
export function calculateTaskContext(
  task: any,
  allUserTasks: any[],
  completionHistory: Date[]
) {
  // Calculate streak using shared utility
  const streakData = calculateStreak(
    completionHistory,
    task.recurrencePattern || 'daily',
    task.customRecurrenceDays
  );

  // Get domain statistics
  const domainTasks = allUserTasks.filter(t => t.domainCategory === task.domainCategory);
  const completedDomainTasks = domainTasks.filter(t => (t.totalCompletions || 0) > 0);

  return {
    streakCount: streakData.currentStreak,
    bestStreak: streakData.bestStreak,
    totalCompletions: task.totalCompletions || 0,
    domainCategory: task.domainCategory || 'ethos',
    domainTasksTotal: domainTasks.length,
    domainTasksCompleted: completedDomainTasks.length,
    isSystemTask: task.isSystemTask || false,
    labels: task.labels || []
  };
}

/**
 * Calculate workout context for coordinator events (future soma integration)
 * Framework ready for when workout tracking is implemented
 */
export function calculateWorkoutContext(
  workout: any,
  exercises: any[],
  userProgress: any
) {
  return {
    exerciseCount: exercises.length,
    totalSets: exercises.reduce((total, ex) => total + (ex.sets || 0), 0),
    workoutDuration: workout.duration || 0,
    bodyweight: workout.bodyweight || 0,
    difficulty: workout.difficulty || 'beginner',
    categories: Array.from(new Set(exercises.map(ex => ex.category))),
    totalWorkouts: userProgress.totalWorkouts || 0
  };
}

// ==============================================
// SHARED CONSTANTS
// ==============================================

/**
 * Common milestone thresholds used across domains
 */
export const MILESTONE_THRESHOLDS = {
  BASIC: [1, 3, 7, 14, 30],
  EXTENDED: [1, 3, 7, 14, 30, 50, 100, 250, 500, 1000],
  STREAK: [3, 7, 14, 30, 50, 100],
  USAGE: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
} as const;

/**
 * Common domain categories
 */
export const DOMAIN_CATEGORIES = {
  ETHOS: 'ethos',
  TROPHE: 'trophe', 
  SOMA: 'soma'
} as const;

/**
 * Common time blocks
 */
export const TIME_BLOCKS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening'
} as const;