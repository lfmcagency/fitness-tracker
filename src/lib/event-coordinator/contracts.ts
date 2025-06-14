/**
 * EVENT CONTRACT BUILDERS
 * 
 * Standardized contract builders for consistent event formatting.
 * Domains use these to create properly formatted events without
 * dealing with the messy details.
 */

import { ProgressEventContract } from '@/types/api/progressResponses';
import { BaseEventData, DOMAIN_XP_CONFIG } from './types';

/**
 * Build a progress contract from domain event data
 * The main utility domains use to fire progress events
 */
export function buildProgressContract(
  eventData: BaseEventData,
  domainContext: {
    streakCount?: number;
    totalCompletions?: number;
    itemName?: string;
    milestoneHit?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    isSystemItem?: boolean;
    [key: string]: any;
  }
): ProgressEventContract {
  const xpConfig = DOMAIN_XP_CONFIG[eventData.source] || DOMAIN_XP_CONFIG.ethos;
  
  return {
    userId: eventData.userId,
    eventId: Date.now(), // Simple deduplication - timestamp should be unique enough
    source: `${eventData.source}_${eventData.action}`,
    token: eventData.token,

    // Core context from domain
    streakCount: domainContext.streakCount || 0,
    totalCompletions: domainContext.totalCompletions || 0,
    
    // Milestone context
    milestoneHit: domainContext.milestoneHit,
    
    // Category mapping for Progress system
    category: xpConfig.progressCategory,
    
    // Metadata for XP calculation
    metadata: {
      difficulty: domainContext.difficulty || 'medium',
      exerciseName: domainContext.itemName || 'Unknown Item',
      isSystemTask: domainContext.isSystemItem || false, // Map isSystemItem to isSystemTask
      isSystemItem: domainContext.isSystemItem || false, // Also include isSystemItem for compatibility
      baseXp: xpConfig.baseXp,
      streakMultiplier: xpConfig.streakMultiplier,
      milestoneBonus: xpConfig.milestoneBonus,
      ...eventData.metadata
    }
  };
}

/**
 * Create a standardized base event for domains
 * Ensures all events have required fields and consistent format
 */
export function createBaseEvent(
  token: string,
  userId: string,
  source: 'ethos' | 'trophe' | 'soma' | 'system',
  action: string,
  metadata?: Record<string, any>
): BaseEventData {
  return {
    token,
    userId,
    source,
    action,
    timestamp: new Date(),
    metadata: metadata || {}
  };
}

/**
 * Ethos-specific contract builders
 */
export const EthosContracts = {
  /**
   * Create task completion event
   */
  taskCompletion(
    token: string,
    userId: string,
    taskEventData: any
  ): BaseEventData {
    return createBaseEvent(token, userId, 'ethos', 'task_completed', {
      taskEventData
    });
  },

  /**
   * Create task creation event
   */
  taskCreation(
    token: string,
    userId: string,
    taskData: any
  ): BaseEventData {
    return createBaseEvent(token, userId, 'ethos', 'task_created', {
      taskData
    });
  }
};

/**
 * Nutrition-specific contract builders (placeholders)
 */
export const NutritionContracts = {
  /**
   * Create meal logging event
   */
  mealLogged(
    token: string,
    userId: string,
    mealData: any,
    nutritionContext: any
  ): BaseEventData {
    return createBaseEvent(token, userId, 'trophe', 'meal_logged', {
      mealData,
      nutritionContext
    });
  },

  /**
   * Create macro target achievement event
   */
  macroTargetHit(
    token: string,
    userId: string,
    macroProgress: any
  ): BaseEventData {
    return createBaseEvent(token, userId, 'trophe', 'macro_target_hit', {
      macroProgress
    });
  }
};

/**
 * Exercise/workout contract builders (placeholders)
 */
export const SomaContracts = {
  /**
   * Create workout completion event
   */
  workoutCompleted(
    token: string,
    userId: string,
    workoutData: any,
    performanceContext: any
  ): BaseEventData {
    return createBaseEvent(token, userId, 'soma', 'workout_completed', {
      workoutData,
      performanceContext
    });
  },

  /**
   * Create exercise mastery event
   */
  exerciseMastery(
    token: string,
    userId: string,
    exerciseData: any
  ): BaseEventData {
    return createBaseEvent(token, userId, 'soma', 'exercise_mastered', {
      exerciseData
    });
  }
};

/**
 * Cross-domain contract builder
 * For when one domain needs to trigger actions in another
 */
export function buildCrossDomainContract(
  token: string,
  sourceDomain: string,
  targetDomain: 'ethos' | 'trophe' | 'soma',
  operation: string,
  operationData: any,
  userId: string
) {
  return {
    token,
    targetDomain,
    operation,
    operationData,
    sourceDomain,
    userId,
    timestamp: new Date()
  };
}

/**
 * Quick builders for common cross-domain operations
 */
export const CrossDomainContracts = {
  /**
   * Create or update a system task in ethos
   */
  ethosTaskOperation(
    token: string,
    sourceDomain: string,
    userId: string,
    operation: 'create_task' | 'update_task' | 'complete_task',
    taskData: any
  ) {
    return buildCrossDomainContract(
      token,
      sourceDomain,
      'ethos',
      operation,
      taskData,
      userId
    );
  },

  /**
   * Check metrics from ethos
   */
  checkEthosMetrics(
    token: string,
    sourceDomain: string,
    userId: string,
    labels: string[],
    domainCategory?: string
  ) {
    return buildCrossDomainContract(
      token,
      sourceDomain,
      'ethos',
      'check_metrics',
      { userId, labels, domainCategory },
      userId
    );
  }
};

/**
 * Contract validation utilities
 */
export const ContractValidation = {
  /**
   * Validate base event structure
   */
  validateBaseEvent(event: BaseEventData): string[] {
    const errors: string[] = [];
    
    if (!event.token || typeof event.token !== 'string') {
      errors.push('Token is required and must be a string');
    }
    
    if (!event.userId || typeof event.userId !== 'string') {
      errors.push('UserId is required and must be a string');
    }
    
    if (!['ethos', 'trophe', 'soma', 'system'].includes(event.source)) {
      errors.push('Source must be ethos, trophe, soma, or system');
    }
    
    if (!event.action || typeof event.action !== 'string') {
      errors.push('Action is required and must be a string');
    }
    
    if (!event.timestamp || !(event.timestamp instanceof Date)) {
      errors.push('Timestamp is required and must be a Date');
    }
    
    return errors;
  },

  /**
   * Validate progress contract structure
   */
  validateProgressContract(contract: ProgressEventContract): string[] {
    const errors: string[] = [];
    
    if (!contract.userId || typeof contract.userId !== 'string') {
      errors.push('UserId is required and must be a string');
    }
    
    if (typeof contract.eventId !== 'number') {
      errors.push('EventId is required and must be a number');
    }
    
    if (!contract.source || typeof contract.source !== 'string') {
      errors.push('Source is required and must be a string');
    }
    
    if (!['core', 'push', 'pull', 'legs'].includes(contract.category || '')) {
      errors.push('Category must be core, push, pull, or legs');
    }
    
    return errors;
  }
};