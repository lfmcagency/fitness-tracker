/**
 * GLOBAL EVENT COORDINATOR
 * 
 * Domain-agnostic event orchestration. Routes events to appropriate domain
 * processors and handles cross-cutting concerns like progress integration,
 * achievement notifications, and event logging.
 */

import { ProgressEventContract } from '@/types/api/progressResponses';
import { 
  BaseEventData, 
  DomainEventResult, 
  MilestoneResult, 
  CrossDomainContract,
  DomainProcessor,
  DOMAIN_XP_CONFIG 
} from './types';
import { EthosProcessor } from './ethos';
import { generateToken } from './logging';

/**
 * Registry of domain processors
 */
const DOMAIN_PROCESSORS: Record<string, DomainProcessor> = {
  ethos: new EthosProcessor(),
  // trophe: new TropheProcessor(), // Future
  // soma: new SomaProcessor(),     // Future
};

/**
 * Generic milestone detection utility
 */
export function detectMilestone(
  currentValue: number,
  previousValue: number | undefined,
  thresholds: readonly number[],
  type: 'streak' | 'completion' | 'usage' | 'performance',
  achievementPrefix: string
): MilestoneResult {
  // Find the highest threshold that current value crosses
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
 * Fire progress event to Progress system
 */
export async function fireProgressEvent(contract: ProgressEventContract): Promise<any> {
  try {
    console.log('🎯 [COORDINATOR] Firing progress event:', contract);
    
    const response = await fetch('/api/progress/add-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to process progress event');
    }

    console.log('✅ [COORDINATOR] Progress event complete:', result.data);
    return result.data;
  } catch (error) {
    console.error('💥 [COORDINATOR] Failed to fire progress event:', error);
    throw error;
  }
}

/**
 * Notify achievement system (placeholder for now)
 */
export async function notifyAchievementSystem(
  userId: string,
  achievementId: string,
  currentValue: number,
  token: string
): Promise<void> {
  try {
    console.log('🏆 [COORDINATOR] Notifying achievement system:', { 
      userId, 
      achievementId, 
      currentValue,
      token 
    });
    
    // TODO: Implement achievement system API call
    // For now, just log the achievement
    console.log(`🎉 [COORDINATOR] Achievement unlocked: ${achievementId} (value: ${currentValue})`);
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Failed to notify achievement system:', error);
    // Don't throw - achievements are nice-to-have, not critical
  }
}

/**
 * Main event processing entry point
 * Routes events to appropriate domain processors
 */
export async function processEvent(eventData: BaseEventData): Promise<DomainEventResult> {
  const { source, token } = eventData;
  
  console.log(`🚀 [COORDINATOR] Processing ${source} event:`, { 
    token, 
    action: eventData.action,
    userId: eventData.userId 
  });
  
  try {
    // Get the appropriate domain processor
    const processor = DOMAIN_PROCESSORS[source];
    if (!processor) {
      throw new Error(`No processor found for domain: ${source}`);
    }
    
    // Process the event through the domain processor
    const result = await processor.processEvent(eventData);
    
    console.log('✅ [COORDINATOR] Event processing complete:', {
      token,
      success: result.success,
      milestonesHit: result.milestonesHit?.length || 0,
      achievementsUnlocked: result.achievementsUnlocked?.length || 0
    });
    
    return result;
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Error processing event:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      token
    };
  }
}

/**
 * Handle cross-domain operations
 * Allows one domain to trigger operations in another domain
 */
export async function processCrossDomainOperation(
  contract: CrossDomainContract
): Promise<any> {
  const { targetDomain, operation, token } = contract;
  
  console.log(`🔄 [COORDINATOR] Cross-domain operation:`, {
    token,
    from: contract.sourceDomain,
    to: targetDomain,
    operation
  });
  
  try {
    // Get the target domain processor
    const processor = DOMAIN_PROCESSORS[targetDomain];
    if (!processor) {
      throw new Error(`No processor found for target domain: ${targetDomain}`);
    }
    
    // Check if processor supports cross-domain operations
    if (!processor.handleCrossDomainOperation) {
      throw new Error(`Domain ${targetDomain} does not support cross-domain operations`);
    }
    
    // Execute the cross-domain operation
    const result = await processor.handleCrossDomainOperation(contract);
    
    console.log('✅ [COORDINATOR] Cross-domain operation complete:', {
      token,
      targetDomain,
      operation
    });
    
    return result;
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Cross-domain operation failed:', error);
    throw error;
  }
}

/**
 * Build a progress contract from domain event data
 * Domain processors use this to create standardized progress events
 */
export function buildProgressContract(
  eventData: BaseEventData,
  domainContext: any
): ProgressEventContract {
  const xpConfig = DOMAIN_XP_CONFIG[eventData.source] || DOMAIN_XP_CONFIG.ethos;
  
  return {
    userId: eventData.userId,
    eventId: Date.now(), // Simple deduplication
    source: `${eventData.source}_${eventData.action}`,
    
    // Core context from event
    streakCount: domainContext.streakCount || 0,
    totalCompletions: domainContext.totalCompletions || 0,
    
    // Milestone context
    milestoneHit: domainContext.milestoneHit,
    
    // Category mapping for Progress system
    category: xpConfig.progressCategory,
    
    // Metadata for XP calculation
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
 * Convenience function for domain processors to fire progress events
 */
export async function fireProgressEventWithContext(
  eventData: BaseEventData,
  domainContext: any
): Promise<any> {
  const contract = buildProgressContract(eventData, domainContext);
  return await fireProgressEvent(contract);
}

/**
 * Get XP configuration for a domain
 */
export function getDomainXpConfig(domain: string) {
  return DOMAIN_XP_CONFIG[domain] || DOMAIN_XP_CONFIG.ethos;
}

/**
 * Register a new domain processor (for future extensibility)
 */
export function registerDomainProcessor(domain: string, processor: DomainProcessor): void {
  DOMAIN_PROCESSORS[domain] = processor;
  console.log(`📝 [COORDINATOR] Registered processor for domain: ${domain}`);
}

/**
 * Get list of registered domains
 */
export function getRegisteredDomains(): string[] {
  return Object.keys(DOMAIN_PROCESSORS);
}