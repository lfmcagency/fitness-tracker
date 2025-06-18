/**
 * SIMPLIFIED EVENT COORDINATOR TYPES
 * 
 * Clean, simple event types for same-day reversible operations.
 * No more rich contracts, no more cross-domain complexity.
 */

/**
 * Base event data - every event has this
 */
export interface BaseEventData {
  token: string;
  userId: string;
  source: 'ethos' | 'trophe' | 'arete';
  action: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * TASK EVENTS (Ethos Domain)
 */
export interface TaskEvent extends BaseEventData {
  source: 'ethos';
  action: 'task_completed' | 'task_uncompleted' | 'task_created' | 'task_deleted';
  taskData: {
    taskId: string;
    taskName: string;
    streakCount: number;
    totalCompletions: number;
    completionDate?: string;
    previousState?: {
      streak: number;
      totalCompletions: number;
      completed: boolean;
    };
  };
}

export interface TaskEventContext {
  taskId: string;
  taskName: string;
  streakCount: number;
  totalCompletions: number;
  isSystemTask: boolean;
  milestoneHit?: string;
}

/**
 * MEAL EVENTS (Trophe Domain)
 */
export interface MealEvent extends BaseEventData {
  source: 'trophe';
  action: 'meal_created' | 'meal_deleted';
  mealData: {
    mealId: string;
    mealName: string;
    mealDate: string;
    totalMeals: number;
    dailyMacroProgress: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
      total: number;
    };
    macroTotals: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
  };
}

export interface MealEventContext {
  mealId: string;
  mealName: string;
  totalMeals: number;
  dailyMacroProgress: number; // Total percentage
  macroGoalsMet: boolean;
  dailyMealCount: number;        // 🆕 How many meals logged today (including this one)
  exceedsDailyMealLimit: boolean; // 🆕 True if this is meal #6+
  milestoneHit?: string;
}

/**
 * FOOD EVENTS (Trophe Domain)
 */
export interface FoodEvent extends BaseEventData {
  source: 'trophe';
  action: 'food_created' | 'food_deleted';
  foodData: {
    foodId: string;
    foodName: string;
    totalFoods: number;
    isSystemFood: boolean;
  };
}

export interface FoodEventContext {
  foodId: string;
  foodName: string;
  totalFoods: number;
  isSystemFood: boolean;
}

/**
 * WEIGHT EVENTS (Arete Domain)
 */
export interface WeightEvent extends BaseEventData {
  source: 'arete';
  action: 'weight_logged' | 'weight_deleted';
  weightData: {
    weightEntryId: string;
    currentWeight: number;
    previousWeight?: number;
    weightChange?: number;
    totalEntries: number;
    logDate: string;
  };
}

export interface WeightEventContext {
  weightEntryId: string;
  currentWeight: number;
  previousWeight?: number;
  weightChange?: number;
  totalEntries: number;
  milestoneHit?: string;
}

/**
 * Union of all domain events
 */
export type DomainEvent = TaskEvent | MealEvent | FoodEvent | WeightEvent;

/**
 * Union of all event contexts
 */
export type EventContext = TaskEventContext | MealEventContext | FoodEventContext | WeightEventContext;

/**
 * Simple event result
 */
export interface DomainEventResult {
  success: boolean;
  token: string;
  context?: EventContext;
  xpAwarded?: number;
  achievementsUnlocked?: string[];
  error?: string;
}

/**
 * Simple reversal data - just what we need to undo
 */
export interface SimpleReversalData {
  token: string;
  originalContext: EventContext;
  entityId: string;
  entityType: 'task' | 'meal' | 'food' | 'weight_entry';
  originalState: any;
  xpToSubtract: number;
}

/**
 * Domain processor interface - much simpler
 */
export interface DomainProcessor {
  processEvent(event: DomainEvent): Promise<DomainEventResult>;
  canReverseEvent(event: DomainEvent): boolean;
  reverseEvent(event: DomainEvent, originalContext: EventContext): Promise<DomainEventResult>;
}

/**
 * Progress system contract - what we send to XP handler
 */
export interface ProgressContract {
  token: string;
  userId: string;
  source: string;
  action: string;
  context: EventContext;
  timestamp: Date;
}