/**
 * ENHANCED EVENT COORDINATOR
 * 
 * Builds rich contracts with complete context using shared utilities.
 * Handles cross-domain updates, achievement thresholds, and calls XP functions directly.
 * Now includes reverse event capabilities for atomic undo operations.
 */

import { ProgressEventContract } from '@/types/api/progressResponses';
import { 
  BaseEventData, 
  DomainEventResult, 
  RichProgressContract,
  RichEventContext,
  CrossDomainContract,
  DomainProcessor,
  ENHANCED_DOMAIN_XP_CONFIG 
} from './types';
import { 
  EthosContracts,
  NutritionContracts,
  SomaContracts,
  buildRichProgressContract 
} from './contracts';
import { 
  generateToken,
  startTokenTracking,
  trackTokenStage,
  completeTokenTracking,
  logEventSuccess,
  logEventFailure 
} from './logging';
import { EthosProcessor } from './ethos';
import { 
  handleRichProgressEvent, 
  handleLegacyProgressEvent,
  EnhancedXpAwardResult 
} from '@/lib/xp/index';
import { Types } from 'mongoose';

/**
 * Registry of domain processors
 */
const DOMAIN_PROCESSORS: Record<string, DomainProcessor> = {
  ethos: new EthosProcessor(),
  // trophe: new TropheProcessor(), // Phase 6
  // soma: new SomaProcessor(),     // Future
};

/**
 * MAIN EVENT PROCESSING - Rich Contract Builder
 * This is where the magic happens - coordinator calculates complete context
 */
export async function processEvent(eventData: BaseEventData): Promise<DomainEventResult> {
  const { source, token, action, userId } = eventData;
  
  // Start tracking this operation
  startTokenTracking(token);
  trackTokenStage(token, 'coordinator_start');
  
  console.log(`🚀 [COORDINATOR] Building rich contract: ${source}_${action} | ${token}`);
  
  try {
    // Get domain processor
    const processor = DOMAIN_PROCESSORS[source];
    if (!processor) {
      throw new Error(`No processor found for domain: ${source}`);
    }
    
    trackTokenStage(token, 'processor_found');
    
    // Build rich context using domain processor
    let richContext: RichEventContext;
    if (processor.calculateRichContext) {
      richContext = await processor.calculateRichContext(eventData);
      trackTokenStage(token, 'context_calculated');
    } else {
      // Fallback to basic context
      richContext = await buildBasicContext(eventData);
      trackTokenStage(token, 'basic_context');
    }
    
    // Build rich progress contract
    const richContract = await buildDomainSpecificContract(eventData, richContext, processor);
    trackTokenStage(token, 'contract_built');
    
    // Fire rich contract to Progress system DIRECTLY
    const progressResult = await fireRichProgressEvent(richContract);
    trackTokenStage(token, 'progress_complete');
    
    // Cross-domain operations are now handled inside the XP handler
    const crossDomainResults = { tasksUpdated: progressResult.tasksUpdated || [] };
    trackTokenStage(token, 'cross_domain_complete');
    
    // Complete tracking
    const performance = completeTokenTracking(token);
    
    const result: DomainEventResult = {
      success: true,
      token,
      progressContract: richContract,
      progressResult: {
        ...progressResult,
        totalXpAwarded: progressResult.xpAwarded || 0,
        levelIncreases: progressResult.leveledUp ? [{ from: progressResult.previousLevel || 0, to: progressResult.newLevel || 0 }] : [],
        categoryUpdates: progressResult.categoryUpdates || {},
        achievementsUnlocked: progressResult.achievementsUnlocked || []
      },
      crossDomainResults,
      milestonesHit: richContract.achievementThresholds
        .filter(t => t.justCrossed)
        .map(t => ({
          type: t.type,
          threshold: t.threshold,
          achievementId: t.achievementId,
          currentValue: t.currentValue
        })),
      achievementsUnlocked: progressResult.achievementsUnlocked || []
    };
    
    // Log success with complete context
    logEventSuccess(token, 'coordinator', eventData, result, richContext, richContract);
    
    console.log('✅ [COORDINATOR] Rich contract complete:', {
      token,
      xpCalculated: richContract.xpMetadata.baseXp,
      xpAwarded: progressResult.xpAwarded,
      milestonesHit: result.milestonesHit?.length || 0,
      taskUpdates: progressResult.tasksUpdated?.length || 0,
      duration: performance?.totalDuration || 0
    });
    
    return result;
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Rich contract failed:', error);
    
    // Log failure
    logEventFailure(token, 'coordinator', eventData, error instanceof Error ? error : String(error));
    
    // Complete tracking even on failure
    completeTokenTracking(token);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      token
    };
  }
}

/**
 * Build domain-specific rich contracts
 */
async function buildDomainSpecificContract(
  eventData: BaseEventData,
  richContext: RichEventContext,
  processor: DomainProcessor
): Promise<RichProgressContract> {
  
  const { source, action } = eventData;
  
  // Route to domain-specific contract builders
  switch (source) {
    case 'ethos':
      if (action === 'task_completed' && eventData.metadata?.taskEventData) {
        // Use ethos contract builder for task completion
        const taskData = eventData.metadata.taskEventData;
        return await EthosContracts.buildTaskCompletionContract(
          eventData,
          taskData,
          [], // allUserTasks - would be fetched in real implementation
          taskData.completionHistory || []
        );
      } else if (action === 'task_created') {
        return EthosContracts.buildTaskCreationContract(eventData, eventData.metadata);
      }
      break;
      
    case 'trophe':
      if (action === 'meal_logged') {
        // Use nutrition contract builder
        return NutritionContracts.buildMealLoggingContract(
          eventData,
          eventData.metadata?.mealData,
          eventData.metadata?.allMealsToday || [],
          eventData.metadata?.macroGoals || { protein: 140, carbs: 200, fat: 70, calories: 2200 },
          richContext.streakCount,
          richContext.totalCompletions
        );
      } else if (action === 'macro_target_hit') {
        return NutritionContracts.buildMacroTargetContract(
          eventData,
          eventData.metadata?.macroProgress,
          richContext.streakCount
        );
      }
      break;
      
    case 'soma':
      if (action === 'workout_completed') {
        // Use soma contract builder
        return SomaContracts.buildWorkoutCompletionContract(
          eventData,
          eventData.metadata?.workoutData,
          eventData.metadata?.exercises || [],
          eventData.metadata?.userProgress || {}
        );
      }
      break;
  }
  
  // Fallback to generic contract
  return buildRichProgressContract(eventData, richContext);
}

/**
 * Build basic context when domain processor doesn't have rich context calculation
 */
async function buildBasicContext(eventData: BaseEventData): Promise<RichEventContext> {
  return {
    streakCount: 0,
    totalCompletions: 0,
    itemName: 'Unknown Item',
    domainCategory: eventData.source as any,
    difficulty: 'medium',
    isSystemItem: false
  };
}

/**
 * Fire rich progress event DIRECTLY (no HTTP calls)
 */
async function fireRichProgressEvent(richContract: RichProgressContract): Promise<EnhancedXpAwardResult> {
  try {
    console.log('🎯 [COORDINATOR] Processing rich contract directly:', {
      token: richContract.token,
      source: richContract.source,
      streakCount: richContract.context.streakCount,
      totalCompletions: richContract.context.totalCompletions
    });
    
    // Validate userId
    if (!richContract.userId || !Types.ObjectId.isValid(richContract.userId)) {
      throw new Error('Invalid user ID in rich contract');
    }
    
    // Call XP handler directly - no HTTP nonsense
    const result = await handleRichProgressEvent(richContract);
    
    console.log('✅ [COORDINATOR] Rich progress event complete:', {
      token: richContract.token,
      xpAwarded: result.xpAwarded,
      leveledUp: result.leveledUp,
      achievementsUnlocked: result.achievementsUnlocked?.length || 0,
      tasksUpdated: result.tasksUpdated?.length || 0
    });
    
    return result;
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Failed to process rich progress event:', error);
    throw error;
  }
}

/**
 * LEGACY COMPATIBILITY FUNCTIONS
 * These maintain compatibility with current API routes during transition
 */

/**
 * Legacy milestone detection for current Progress system
 */
export function detectMilestone(
  currentValue: number,
  previousValue: number | undefined,
  thresholds: readonly number[],
  type: 'streak' | 'completion' | 'usage' | 'performance',
  achievementPrefix: string
): any {
  for (const threshold of thresholds) {
    if (currentValue >= threshold && (previousValue === undefined || previousValue < threshold)) {
      return {
        type,
        threshold,
        achievementId: `${achievementPrefix}_${threshold}`,
        isNewMilestone: true,
        currentValue
      };
    }
  }
  
  return {
    type: null,
    threshold: null,
    achievementId: null,
    isNewMilestone: false,
    currentValue
  };
}

/**
 * Legacy progress event firing for compatibility (still uses HTTP for external calls)
 */
export async function fireProgressEvent(contract: ProgressEventContract): Promise<any> {
  try {
    // This is for external calls from stores - they still use HTTP
    const response = await fetch('/api/progress/add-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract)
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to process progress event');
    }

    return result.data;
  } catch (error) {
    console.error('💥 [COORDINATOR] Legacy progress event failed:', error);
    throw error;
  }
}

/**
 * Legacy achievement notification (placeholder)
 */
export async function notifyAchievementSystem(
  userId: string,
  achievementId: string,
  currentValue: number,
  token: string
): Promise<void> {
  console.log('🏆 [COORDINATOR] Achievement notification:', { 
    userId, 
    achievementId, 
    currentValue,
    token 
  });
}

/**
 * Legacy contract builder for existing code
 */
export function buildProgressContract(
  eventData: BaseEventData,
  domainContext: any
): ProgressEventContract {
  const xpConfig = ENHANCED_DOMAIN_XP_CONFIG[eventData.source] || ENHANCED_DOMAIN_XP_CONFIG.ethos;
  
  return {
    userId: eventData.userId,
    eventId: Date.now(),
    source: `${eventData.source}_${eventData.action}`,
    streakCount: domainContext.streakCount || 0,
    totalCompletions: domainContext.totalCompletions || 0,
    milestoneHit: domainContext.milestoneHit,
    category: xpConfig.progressCategory,
    metadata: {
      difficulty: domainContext.difficulty || 'medium',
      exerciseName: domainContext.itemName || domainContext.taskName || 'Unknown',
      isSystemItem: domainContext.isSystemItem || false,
      source: eventData.source,
      ...eventData.metadata
    }
  };
}

/**
 * Legacy wrapper for domain processors
 */
export async function fireProgressEventWithContext(
  eventData: BaseEventData,
  domainContext: any
): Promise<any> {
  const contract = buildProgressContract(eventData, domainContext);
  return await fireProgressEvent(contract);
}

/**
 * Legacy cross-domain operation handler
 */
export async function processCrossDomainOperation(
  contract: CrossDomainContract
): Promise<any> {
  const { targetDomain } = contract;
  const processor = DOMAIN_PROCESSORS[targetDomain];
  
  if (!processor || !processor.handleCrossDomainOperation) {
    throw new Error(`Domain ${targetDomain} does not support cross-domain operations`);
  }
  
  return await processor.handleCrossDomainOperation(contract);
}

/**
 * Utility exports for domain processors
 */
export function getDomainXpConfig(domain: string) {
  return ENHANCED_DOMAIN_XP_CONFIG[domain] || ENHANCED_DOMAIN_XP_CONFIG.ethos;
}

export function registerDomainProcessor(domain: string, processor: DomainProcessor): void {
  DOMAIN_PROCESSORS[domain] = processor;
  console.log(`📝 [COORDINATOR] Registered processor for domain: ${domain}`);
}

export function getRegisteredDomains(): string[] {
  return Object.keys(DOMAIN_PROCESSORS);
}

/**
 * REVERSE EVENT HANDLING
 * Export reverse event capabilities for atomic undo operations
 */
export { reverseEvent, findTaskCompletionEvent, canReverseEvent } from './reverse';

/**
 * Token utilities export
 */
export { generateToken, startTokenTracking, trackTokenStage };