/**
 * ENHANCED EVENT COORDINATOR TYPES
 * 
 * Rich contract definitions for atomic operations with complete context,
 * reversal data, and cross-domain integration.
 */

import { Types } from 'mongoose';
import { DomainCategory } from '@/types';

/**
 * Base event data that all domain events must include
 */
export interface BaseEventData {
  /** Unique token for tracking this operation across systems */
  token: string;
  
  /** User performing the action */
  userId: string;
  
  /** Domain that initiated the event */
  source: 'ethos' | 'trophe' | 'soma' | 'system';
  
  /** Specific action that occurred */
  action: string;
  
  /** When the event occurred */
  timestamp: Date;
  
  /** Optional metadata for debugging/auditing */
  metadata?: Record<string, any>;
}

/**
 * Rich context data calculated by coordinator using shared utilities
 */
export interface RichEventContext {
  /** Core metrics */
  streakCount: number;
  totalCompletions: number;
  itemName: string;
  
  /** Domain-specific context */
  domainCategory?: DomainCategory;
  labels?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  isSystemItem?: boolean;
  
  /** Milestone detection */
  milestoneHit?: string;
  milestoneValue?: number;
  
  /** Domain-specific metrics */
  nutritionContext?: {
    dailyMacroProgress: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
      total: number;
    };
    totalMeals: number;
    mealCount: number;
    macroTotals: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
  };
  
  taskContext?: {
    taskId?: string;
    taskName: string;
    bestStreak: number;
    domainTasksTotal: number;
    domainTasksCompleted: number;
    previousStreak?: number;
    previousTotalCompletions?: number;
  };
  
  workoutContext?: {
    exerciseCount: number;
    totalSets: number;
    workoutDuration: number;
    bodyweight: number;
    categories: string[];
    totalWorkouts: number;
  };
}

/**
 * Cross-domain task update request
 */
export interface TaskUpdateRequest {
  /** Task identifier or criteria */
  taskId?: string;
  domainCategory?: DomainCategory;
  labels?: string[];
  
  /** Update action */
  action: 'create' | 'update' | 'complete' | 'uncomplete';
  
  /** Task data for creation/updates */
  taskData?: {
    name?: string;
    description?: string;
    progress?: number;
    completed?: boolean;
    completionDate?: string;
    scheduledTime?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  
  /** Source for audit trail */
  source: string;
  token: string;
}

/**
 * Achievement threshold check
 */
export interface AchievementThreshold {
  /** Achievement identifier */
  achievementId: string;
  
  /** Threshold type */
  type: 'streak' | 'total' | 'milestone' | 'cross_domain';
  
  /** Threshold value */
  threshold: number;
  
  /** Current value */
  currentValue: number;
  
  /** Whether threshold was just crossed */
  justCrossed: boolean;
  
  /** Bonus XP for achievement */
  bonusXp?: number;
}

/**
 * Reversal data for atomic operations
 */
export interface ReversalData {
  /** Original operation token */
  token: string;
  
  /** What needs to be undone */
  undoInstructions: {
    /** XP to subtract */
    subtractXp?: number;
    
    /** Achievements to lock */
    lockAchievements?: string[];
    
    /** Level to revert to */
    revertLevel?: number;
    
    /** Task updates to undo */
    undoTaskUpdates?: Array<{
      taskId: string;
      revertTo: any;
    }>;
    
    /** Domain-specific reversal data */
    domainSpecific?: Record<string, any>;
  };
  
  /** User state before operation */
  previousUserState?: {
    level: number;
    totalXp: number;
    categoryProgress: Record<string, any>;
    achievements: string[];
  };
  
  /** User state after operation */
  finalUserState?: {
    level: number;
    totalXp: number;
    categoryProgress: Record<string, any>;
    achievements: string[];
  };
  
  /** Snapshot data for validation */
  snapshotData?: {
    userStateBeforeEvent: any;
    eventContext: RichEventContext;
    crossDomainUpdates: TaskUpdateRequest[];
  };
}
/**
 * Rich progress contract for atomic operations
 */
export interface RichProgressContract {
  /** Tracking and identification */
  token: string;
  eventId: number;
  source: string;
  action: string;
  userId: string;
  
  /** Rich context from coordinator calculations */
  context: RichEventContext;
  
  /** Cross-domain task updates */
  taskUpdates: TaskUpdateRequest[];
  
  /** Achievement thresholds to check */
  achievementThresholds: AchievementThreshold[];
  
  /** Metadata for XP calculation */
  xpMetadata: {
    taskId: any;
    baseXp: number;
    streakMultiplier: number;
    milestoneBonus: number;
    difficultyMultiplier: number;
    categoryBonus: number;
  };
  
  /** Reversal preparation data */
  reversalData: ReversalData;
  
  /** Snapshot data for validation */
  snapshotData?: {
    userStateBeforeEvent: any;
    eventContext: RichEventContext;
    crossDomainUpdates: TaskUpdateRequest[];
  };
}

/**
 * Enhanced domain event result
 */
export interface DomainEventResult {
  /** Whether the event was processed successfully */
  success: boolean;
  
  /** Token for tracking */
  token: string;
  
  /** Rich progress contract that was built */
  progressContract?: RichProgressContract;
  
  /** Progress system response */
  progressResult?: {
    totalXpAwarded: number;
    levelIncreases: Array<{ from: number; to: number }>;
    achievementsUnlocked: string[];
    categoryUpdates: Record<string, any>;
  };
  
  /** Cross-domain operation results */
  crossDomainResults?: {
    tasksUpdated: Array<{ taskId: string; action: string; success: boolean }>;
    ethosMetrics?: any;
  };
  
  /** Milestone detection results */
  milestonesHit?: Array<{
    type: string;
    threshold: number;
    achievementId: string;
    currentValue: number;
  }>;
  
  /** Achievements unlocked */
  achievementsUnlocked?: string[];
  
  /** Error information if failed */
  error?: string;
  
  /** Complete reversal package */
  reversalData?: ReversalData;
}

/**
 * Enhanced milestone configuration
 */
export interface MilestoneConfig {
  /** Milestone type identifier */
  type: 'streak' | 'completion' | 'usage' | 'performance' | 'cross_domain';
  
  /** Threshold values that trigger milestones */
  thresholds: readonly number[];
  
  /** Prefix for achievement IDs */
  achievementPrefix: string;
  
  /** Bonus XP for hitting milestones */
  bonusXp?: number;
  
  /** Custom milestone detection logic */
  customDetection?: (current: number, previous: number, context: RichEventContext) => boolean;
}

/**
 * Enhanced XP configuration for domains
 */
export interface DomainXpConfig {
  /** Base XP award for actions in this domain */
  baseXp: number;
  
  /** Multiplier for streak bonuses */
  streakMultiplier: number;
  
  /** Bonus XP for hitting milestones */
  milestoneBonus: number;
  
  /** Category mapping for progress system */
  progressCategory: 'core' | 'push' | 'pull' | 'legs';
  
  /** Difficulty multipliers */
  difficultyMultipliers: {
    easy: number;
    medium: number;
    hard: number;
  };
  
  /** System item bonuses */
  systemItemBonus: number;
}

/**
 * Enhanced global XP mapping
 */
export const ENHANCED_DOMAIN_XP_CONFIG: Record<string, DomainXpConfig> = {
  ethos: {
    baseXp: 50,
    streakMultiplier: 1.0,
    milestoneBonus: 25,
    progressCategory: 'core',
    difficultyMultipliers: { easy: 0.8, medium: 1.0, hard: 1.3 },
    systemItemBonus: 10
  },
  trophe: {
    baseXp: 30,
    streakMultiplier: 1.2,
    milestoneBonus: 20,
    progressCategory: 'push',
    difficultyMultipliers: { easy: 0.7, medium: 1.0, hard: 1.5 },
    systemItemBonus: 5
  },
  soma: {
    baseXp: 40,
    streakMultiplier: 1.1,
    milestoneBonus: 30,
    progressCategory: 'legs',
    difficultyMultipliers: { easy: 0.9, medium: 1.0, hard: 1.4 },
    systemItemBonus: 15
  }
} as const;

/**
 * Enhanced milestone result with rich context
 */
export interface MilestoneResult {
  /** Type of milestone detected */
  type: 'streak' | 'completion' | 'usage' | 'performance' | 'cross_domain' | null;
  
  /** Threshold value that was crossed */
  threshold: number | null;
  
  /** Achievement ID for this milestone */
  achievementId: string | null;
  
  /** Whether this is a new milestone (vs already achieved) */
  isNewMilestone: boolean;
  
  /** Current value that triggered the check */
  currentValue: number;
  
  /** Previous value for comparison */
  previousValue?: number;
  
  /** Bonus XP for this milestone */
  bonusXp?: number;
  
  /** Additional context for milestone */
  context?: Record<string, any>;
}

/**
 * Cross-domain contract for operations between domains
 */
export interface CrossDomainContract {
  /** Token for tracking */
  token: string;
  
  /** Target domain to operate on */
  targetDomain: 'ethos' | 'trophe' | 'soma';
  
  /** Operation to perform */
  operation: 'create_task' | 'update_task' | 'complete_task' | 'check_metrics' | 'get_context';
  
  /** Data for the operation */
  operationData: any;
  
  /** Source domain making the request */
  sourceDomain: string;
  
  /** User context */
  userId: string;
  
  /** Timestamp */
  timestamp: Date;
}

/**
 * Event logging entry for debugging and recovery
 */
export interface EventLogEntry {
  /** Unique token for this operation */
  token: string;
  
  /** Stage where this log was created */
  stage: 'domain' | 'coordinator' | 'progress' | 'achievement' | 'cross_domain';
  
  /** Whether this was a success or failure */
  success: boolean;
  
  /** Original event data */
  eventData: BaseEventData;
  
  /** Rich context calculated by coordinator */
  richContext?: RichEventContext;
  
  /** Progress contract built */
  progressContract?: RichProgressContract;
  
  /** Result or error from processing */
  result?: any;
  error?: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Reversal data for atomic undo operations */
  reversalData?: ReversalData;
  
  /** Performance metrics */
  performance?: {
    duration: number;
    contextCalculationTime: number;
    contractBuildingTime: number;
    crossDomainTime: number;
  };
}

/**
 * Enhanced domain processor interface
 */
export interface DomainProcessor {
  /** Process an event specific to this domain */
  processEvent(eventData: BaseEventData): Promise<DomainEventResult>;
  
  /** Get milestone configuration for this domain */
  getMilestoneConfig(): Record<string, MilestoneConfig>;
  
  /** Get XP configuration for this domain */
  getXpConfig(): DomainXpConfig;
  
  /** Handle cross-domain operations targeting this domain */
  handleCrossDomainOperation?(contract: CrossDomainContract): Promise<any>;
  
  /** Calculate rich context using shared utilities */
  calculateRichContext?(eventData: BaseEventData): Promise<RichEventContext>;
  
  /** Prepare reversal data for atomic operations */
  prepareReversalData?(eventData: BaseEventData, context: RichEventContext): Promise<ReversalData>;
}

/**
 * Context calculation function signature
 */
export type ContextCalculator = (
  eventData: BaseEventData,
  additionalData?: any
) => Promise<RichEventContext>;

/**
 * Token generation and tracking utilities
 */
export interface TokenTracker {
  /** Generate a new unique token */
  generateToken(): string;
  
  /** Track token through event chain */
  trackToken(token: string, stage: string, data: any): void;
  
  /** Get complete token history */
  getTokenHistory(token: string): EventLogEntry[];
  
  /** Check if token is still active */
  isTokenActive(token: string): boolean;
}