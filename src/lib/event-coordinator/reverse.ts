// src/lib/event-coordinator/reverse.ts
import { generateToken, startTokenTracking, trackTokenStage, completeTokenTracking, logEventSuccess, logEventFailure } from './logging';
import { BaseEventData, DomainEventResult } from './types';
import EventLog, { EventLogStatus } from '@/models/EventLog';

/**
 * REVERSE EVENT PROCESSOR
 * 
 * Finds original contract and reverses atomic operations
 */

/**
 * Reverse an event by finding original contract and applying undo instructions
 */
export async function reverseEvent(
  originalToken: string,
  userId: string,
  reason: string = 'User requested reversal'
): Promise<DomainEventResult> {
  
  const reverseToken = generateToken();
  startTokenTracking(reverseToken);
  trackTokenStage(reverseToken, 'reverse_start');
  
  console.log(`🔄 [REVERSE] Starting reversal: ${originalToken} → ${reverseToken}`);
  
  try {
    // 1. Find original contract in EventLog
    trackTokenStage(reverseToken, 'lookup_original');
    const originalEvent = await EventLog.findByToken(originalToken);
    
    if (!originalEvent) {
      throw new Error(`Original event not found: ${originalToken}`);
    }
    
    if (!originalEvent.isReversible()) {
      throw new Error(`Event is not reversible: ${originalToken} (status: ${originalEvent.status})`);
    }
    
    // Verify user owns this event
    if (originalEvent.userId.toString() !== userId) {
      throw new Error(`User ${userId} does not own event ${originalToken}`);
    }
    
    console.log(`📋 [REVERSE] Found original contract: ${originalToken}`);
    trackTokenStage(reverseToken, 'original_found');
    
    // 2. Apply reversal using XP system (placeholder for now)
    trackTokenStage(reverseToken, 'apply_reversal');
    
    // TODO: Create actual reversal handler
    const reversalResult = {
      xpSubtracted: originalEvent.reversalData.undoInstructions.subtractXp || 0,
      levelReverted: originalEvent.reversalData.undoInstructions.revertLevel !== undefined,
      previousUserState: originalEvent.reversalData.previousUserState || { level: 0 },
      finalUserState: originalEvent.reversalData.finalUserState || { level: 0 },
      categoryUpdates: {}
    };
    
    trackTokenStage(reverseToken, 'reversal_complete');
    
    // 3. Mark original event as reversed
    await originalEvent.markAsReversed(reverseToken);
    
    // 4. Store reversal operation in EventLog
    await EventLog.create({
      token: reverseToken,
      userId: originalEvent.userId,
      contractData: {
        ...originalEvent.contractData,
        token: reverseToken,
        action: `reverse_${originalEvent.contractData.action}`
      },
      reversalData: {
        token: reverseToken,
        undoInstructions: {}, // Reversal doesn't need further reversal
        previousUserState: reversalResult.finalUserState,
        finalUserState: reversalResult.previousUserState
      },
      status: EventLogStatus.COMPLETED,
      timestamp: new Date()
    });
    
    const performance = completeTokenTracking(reverseToken);
    
    const result: DomainEventResult = {
      success: true,
      token: reverseToken,
      progressResult: {
        totalXpAwarded: -reversalResult.xpSubtracted,
        levelIncreases: reversalResult.levelReverted ? [{ 
          from: reversalResult.finalUserState.level, 
          to: reversalResult.previousUserState.level 
        }] : [],
        achievementsUnlocked: [], // Achievements get locked, not unlocked
        categoryUpdates: reversalResult.categoryUpdates || {}
      },
      milestonesHit: [], // No milestones on reversal
      achievementsUnlocked: []
    };
    
    logEventSuccess(reverseToken, 'reverse_coordinator', {
      token: reverseToken,
      userId,
      source: 'system',
      action: 'reverse_event',
      timestamp: new Date(),
      metadata: { originalToken, reason }
    }, result);
    
    console.log(`✅ [REVERSE] Reversal complete: ${originalToken} → ${reverseToken} (${performance?.totalDuration}ms)`);
    return result;
    
  } catch (error) {
    console.error(`💥 [REVERSE] Reversal failed: ${originalToken} → ${reverseToken}`, error);
    
    logEventFailure(reverseToken, 'reverse_coordinator', {
      token: reverseToken,
      userId,
      source: 'system', 
      action: 'reverse_event',
      timestamp: new Date(),
      metadata: { originalToken, reason }
    }, error instanceof Error ? error : String(error));
    
    completeTokenTracking(reverseToken);
    
    return {
      success: false,
      token: reverseToken,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Find original completion event for a task
 */
export async function findTaskCompletionEvent(
  userId: string,
  taskId: string,
  completionDate: Date,
  maxLookbackDays: number = 7
): Promise<string | null> {
  
  try {
    console.log(`🔍 [REVERSE] Searching for completion event: taskId=${taskId}, userId=${userId}`);
    
    // Calculate date range for search
    const searchStartDate = new Date(completionDate);
    searchStartDate.setDate(searchStartDate.getDate() - maxLookbackDays);
    
    // Get recent events for this user within the date range
    const userEvents = await EventLog.findUserEvents(userId, 200); // Increase limit to be safe
    
    console.log(`📋 [REVERSE] Found ${userEvents.length} recent events for user`);
    
    // Look for task completion events with exact taskId match
    const taskCompletions = userEvents.filter(event => {
      const contract = event.contractData;
      
      // Must be a task completion action
      if (contract.action !== 'task_completed') return false;
      
      // Must be within lookback period
      const eventDate = new Date(event.timestamp);
      if (eventDate < searchStartDate) return false;
      
      // Must be reversible
      if (!event.isReversible()) return false;
      
      // 🎯 BULLETPROOF: Match by exact taskId
      const eventTaskId = contract.context?.taskContext?.taskId;
      if (!eventTaskId) {
        console.log(`⚠️ [REVERSE] Event ${event.token} missing taskId in metadata`);
        return false;
      }
      
      const isMatch = eventTaskId === taskId;
      if (isMatch) {
        console.log(`✅ [REVERSE] Found matching completion: ${event.token} for task ${taskId}`);
      }
      
      return isMatch;
    });
    
    if (taskCompletions.length === 0) {
      console.log(`❌ [REVERSE] No completion events found for task ${taskId} in last ${maxLookbackDays} days`);
      return null;
    }
    
    if (taskCompletions.length > 1) {
      console.log(`⚠️ [REVERSE] Multiple completion events found for task ${taskId}, using most recent`);
    }
    
    // Return most recent matching completion
    const mostRecent = taskCompletions[0];
    console.log(`🎯 [REVERSE] Returning completion token: ${mostRecent.token}`);
    return mostRecent.token;
    
  } catch (error) {
    console.error(`💥 [REVERSE] Error finding task completion event:`, error);
    return null;
  }
}

/**
 * Check if a specific event can be reversed
 */
export async function canReverseEvent(token: string, userId: string): Promise<{
  canReverse: boolean;
  reason?: string;
}> {
  
  try {
    const event = await EventLog.findByToken(token);
    
    if (!event) {
      return { canReverse: false, reason: 'Event not found' };
    }
    
    if (event.userId.toString() !== userId) {
      return { canReverse: false, reason: 'Not authorized to reverse this event' };
    }
    
    if (!event.isReversible()) {
      return { canReverse: false, reason: `Event cannot be reversed (status: ${event.status})` };
    }
    
    return { canReverse: true };
    
  } catch (error) {
    return { canReverse: false, reason: 'Error checking reversal status' };
  }
}