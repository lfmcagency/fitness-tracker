/**
 * SIMPLIFIED EVENT COORDINATOR
 * 
 * Simple domain router - no more rich contracts, no more orchestration.
 * Just routes events to processors and sends context to Progress.
 * 
 * 🆕 FIXED: Now actually saves events to database for reversal!
 */

import { 
  DomainEvent, 
  DomainEventResult, 
  ProgressContract,
  DomainProcessor,
  EventContext
} from './types';
import { EthosProcessor } from './ethos';
import { TropheProcessor } from './trophe';
import { AreteProcessor } from './arete';
import { 
  generateToken,
  startTokenTracking,
  trackTokenStage,
  completeTokenTracking,
  logEventSuccess,
  logEventFailure 
} from './logging';
import { handleProgressEvent } from '@/lib/xp/index';
import { dbConnect } from '@/lib/db';
import SimpleEventLog from './SimpleEventLog'; // 🆕 Added for database persistence

/**
 * Domain processor registry
 */
const PROCESSORS: Record<string, DomainProcessor> = {
  ethos: new EthosProcessor(),
  trophe: new TropheProcessor(),
  arete: new AreteProcessor()
};

/**
 * MAIN EVENT PROCESSOR - Simple domain router with database persistence
 */
export async function processEvent(event: DomainEvent): Promise<DomainEventResult> {
  const { token, source } = event;
  
  // Start tracking
  startTokenTracking(token);
  trackTokenStage(token, 'coordinator_start');
  
  console.log(`🎯 [COORDINATOR] Processing ${source}_${event.action} | ${token}`);
  
  try {
    // Ensure database connection
    await dbConnect();
    
    // Get domain processor
    const processor = PROCESSORS[source];
    if (!processor) {
      throw new Error(`No processor found for domain: ${source}`);
    }
    
    trackTokenStage(token, 'processor_found');
    
    // Process event in domain
    const domainResult = await processor.processEvent(event);
    trackTokenStage(token, 'domain_complete');
    
    if (!domainResult.success) {
      throw new Error(domainResult.error || 'Domain processing failed');
    }
    
    // 🆕 SAVE EVENT TO DATABASE (this was missing!)
    try {
      await SimpleEventLog.createEventLog(
        event,
        domainResult.context || {} as EventContext,
        0 // XP will be updated after progress processing
      );
      console.log(`💾 [COORDINATOR] Event saved to database: ${token}`);
      trackTokenStage(token, 'event_saved');
    } catch (dbError) {
      console.error(`💥 [COORDINATOR] Failed to save event: ${token}`, dbError);
      // Continue processing - don't fail the whole operation for logging issues
    }
    
    // Send to Progress if we have context
    let progressResult;
    if (domainResult.context) {
      progressResult = await sendToProgress({
        token,
        userId: event.userId,
        source: event.source,
        action: event.action,
        context: domainResult.context,
        timestamp: event.timestamp
      });
      trackTokenStage(token, 'progress_complete');
      
      // 🆕 UPDATE EVENT LOG WITH ACTUAL XP AWARDED
      if (progressResult?.xpAwarded) {
        try {
          await SimpleEventLog.updateOne(
            { token },
            { 
              xpAwarded: progressResult.xpAwarded,
              status: 'completed' // Ensure status is set
            }
          );
          console.log(`💰 [COORDINATOR] XP updated in event log: ${token} (+${progressResult.xpAwarded})`);
        } catch (updateError) {
          console.error(`💥 [COORDINATOR] Failed to update XP: ${token}`, updateError);
          // Non-critical - continue
        }
      }
    }
    
    // Complete tracking
    const performance = completeTokenTracking(token);
    
    const result: DomainEventResult = {
      success: true,
      token,
      context: domainResult.context,
      xpAwarded: progressResult?.xpAwarded || 0,
      achievementsUnlocked: progressResult?.achievementsUnlocked || []
    };
    
    logEventSuccess(token, 'coordinator', event, result);
    
    console.log(`✅ [COORDINATOR] Event complete: ${token} (${performance?.totalDuration}ms)`);
    return result;
    
  } catch (error) {
    console.error(`💥 [COORDINATOR] Event failed: ${token}`, error);
    
    // 🆕 MARK EVENT AS FAILED IN DATABASE
    try {
      await SimpleEventLog.updateOne(
        { token },
        { 
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      );
    } catch (dbError) {
      console.error(`💥 [COORDINATOR] Failed to mark event as failed: ${token}`, dbError);
    }
    
    logEventFailure(token, 'coordinator', event, error instanceof Error ? error.message : String(error));
    completeTokenTracking(token);
    
    return {
      success: false,
      token,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send simple context to Progress system - FIXED: Direct function call
 */
async function sendToProgress(contract: ProgressContract): Promise<{
  xpAwarded: number;
  achievementsUnlocked: string[];
}> {
  try {
    console.log(`📈 [PROGRESS] Sending context: ${contract.token}`, {
      source: contract.source,
      action: contract.action
    });
    
    // Ensure DB connection for progress processing
    await dbConnect();
    
    // Call progress handler directly (no HTTP calls)
    const result = await handleProgressEvent(contract);
    
    return {
      xpAwarded: result.xpAwarded || 0,
      achievementsUnlocked: result.achievementsUnlocked || []
    };
    
  } catch (error) {
    console.error(`💥 [PROGRESS] Progress call failed: ${contract.token}`, error);
    throw error;
  }
}

/**
 * REVERSAL FUNCTIONS
 */

/**
 * Reverse a same-day event
 */
export async function reverseEvent(
  originalToken: string, 
  userId: string
): Promise<DomainEventResult> {
  const reverseToken = generateToken();
  startTokenTracking(reverseToken);
  
  console.log(`🔄 [REVERSE] Starting reversal: ${originalToken} → ${reverseToken}`);
  
  try {
    // Import here to avoid circular dependency
    const { findEventByToken, validateSameDay, markEventAsReversed } = await import('./reverse');
    
    trackTokenStage(reverseToken, 'lookup_original');
    
    // Find original event in database
    const originalEvent = await findEventByToken(originalToken);
    if (!originalEvent) {
      throw new Error(`Original event not found: ${originalToken}`);
    }
    
    // Validate same-day and ownership
    validateSameDay(originalEvent.timestamp);
    if (originalEvent.userId !== userId) {
      throw new Error('Not authorized to reverse this event');
    }
    
    trackTokenStage(reverseToken, 'validation_complete');
    
    // Get domain processor and reverse
    const processor = PROCESSORS[originalEvent.source];
    if (!processor) {
      throw new Error(`No processor for domain: ${originalEvent.source}`);
    }
    
    if (!processor.canReverseEvent(originalEvent.eventData)) {
      throw new Error('Event cannot be reversed');
    }
    
    const reverseResult = await processor.reverseEvent(
      originalEvent.eventData,
      originalEvent.context
    );
    
    trackTokenStage(reverseToken, 'reverse_complete');
    
    // Send reversal to Progress (subtract XP) - direct call
    if (reverseResult.context && originalEvent.xpAwarded > 0) {
      await sendToProgress({
        token: reverseToken,
        userId,
        source: originalEvent.source,
        action: `reverse_${originalEvent.action}`,
        context: reverseResult.context,
        timestamp: new Date()
      });
      trackTokenStage(reverseToken, 'progress_reversed');
    }
    
    // 🆕 MARK ORIGINAL EVENT AS REVERSED
    await markEventAsReversed(originalToken, reverseToken);
    
    const performance = completeTokenTracking(reverseToken);
    
    console.log(`✅ [REVERSE] Reversal complete: ${originalToken} → ${reverseToken} (${performance?.totalDuration}ms)`);
    
    return {
      success: true,
      token: reverseToken,
      xpAwarded: -originalEvent.xpAwarded,
      achievementsUnlocked: []
    };
    
  } catch (error) {
    console.error(`💥 [REVERSE] Reversal failed: ${originalToken} → ${reverseToken}`, error);
    completeTokenTracking(reverseToken);
    
    return {
      success: false,
      token: reverseToken,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Utility exports
 */
export { generateToken } from './logging';
export * from './types';