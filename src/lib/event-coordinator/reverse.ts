/**
 * SIMPLIFIED REVERSE PROCESSOR
 * 
 * Same-day event reversal only. No complex cascade logic.
 * Token = event identifier, simple lookups.
 */

import SimpleEventLog from './SimpleEventLog';
import { DomainEvent, EventContext } from './types';

/**
 * Find event by token
 */
export async function findEventByToken(token: string): Promise<{
  eventData: DomainEvent;
  context: EventContext;
  userId: string;
  source: string;
  action: string;
  timestamp: Date;
  xpAwarded: number;
} | null> {
  
  try {
    console.log(`🔍 [REVERSE] Looking up event: ${token}`);
    
    const event = await SimpleEventLog.findByToken(token);
    if (!event) {
      console.log(`❌ [REVERSE] Event not found: ${token}`);
      return null;
    }
    
    console.log(`✅ [REVERSE] Found event: ${token}`, {
      source: event.source,
      action: event.action,
      timestamp: event.timestamp
    });
    
    return {
      eventData: event.eventData,
      context: event.context,
      userId: event.userId.toString(),
      source: event.source,
      action: event.action,
      timestamp: event.timestamp,
      xpAwarded: event.xpAwarded || 0
    };
    
  } catch (error) {
    console.error(`💥 [REVERSE] Error finding event: ${token}`, error);
    return null;
  }
}

/**
 * Validate same-day restriction
 */
export function validateSameDay(eventTimestamp: Date): void {
  const eventDate = new Date(eventTimestamp);
  const today = new Date();
  
  // Reset time parts for date comparison
  eventDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  if (eventDate.getTime() !== today.getTime()) {
    const eventDateStr = eventDate.toDateString();
    const todayStr = today.toDateString();
    
    throw new Error(
      `Cannot modify historical data. Event was on ${eventDateStr}, today is ${todayStr}.`
    );
  }
  
  console.log(`✅ [REVERSE] Same-day validation passed for ${eventTimestamp.toISOString()}`);
}

/**
 * Check if event can be reversed
 */
export async function canReverseEvent(token: string, userId: string): Promise<{
  canReverse: boolean;
  reason?: string;
}> {
  
  try {
    const event = await SimpleEventLog.findByToken(token);
    
    if (!event) {
      return { canReverse: false, reason: 'Event not found' };
    }
    
    if (event.userId.toString() !== userId) {
      return { canReverse: false, reason: 'Not authorized to reverse this event' };
    }
    
    if (event.status === 'reversed') {
      return { canReverse: false, reason: 'Event already reversed' };
    }
    
    if (event.status === 'failed') {
      return { canReverse: false, reason: 'Cannot reverse failed event' };
    }
    
    // Same-day check
    try {
      validateSameDay(event.timestamp);
    } catch (error) {
      return { canReverse: false, reason: 'Can only reverse same-day events' };
    }
    
    return { canReverse: true };
    
  } catch (error) {
    return { canReverse: false, reason: 'Error checking reversal status' };
  }
}

/**
 * Mark event as reversed
 */
export async function markEventAsReversed(
  originalToken: string,
  reverseToken: string
): Promise<void> {
  
  try {
    console.log(`🔄 [REVERSE] Marking event as reversed: ${originalToken} → ${reverseToken}`);
    
    await SimpleEventLog.updateOne(
      { token: originalToken },
      {
        status: 'reversed',
        reversedAt: new Date(),
        reversedByToken: reverseToken
      }
    );
    
    console.log(`✅ [REVERSE] Event marked as reversed: ${originalToken}`);
    
  } catch (error) {
    console.error(`💥 [REVERSE] Error marking event as reversed: ${originalToken}`, error);
    throw error;
  }
}

/**
 * Find recent events for debugging
 */
export async function findRecentEvents(
  userId: string,
  limit: number = 20
): Promise<Array<{
  token: string;
  source: string;
  action: string;
  timestamp: Date;
  status: string;
  canReverse: boolean;
}>> {
  
  try {
    const events = await SimpleEventLog.findUserEvents(userId, limit);
    
    const enrichedEvents = events.map(event => ({
      token: event.token,
      source: event.source,
      action: event.action,
      timestamp: event.timestamp,
      status: event.status,
      canReverse: event.status === 'completed' && !event.reversedAt && 
                  event.timestamp.toDateString() === new Date().toDateString()
    }));
    
    console.log(`📋 [REVERSE] Found ${enrichedEvents.length} recent events for user ${userId}`);
    
    return enrichedEvents;
    
  } catch (error) {
    console.error(`💥 [REVERSE] Error finding recent events for user ${userId}`, error);
    return [];
  }
}

/**
 * Get reversal statistics for debugging
 */
export async function getReversalStats(userId: string): Promise<{
  totalEvents: number;
  reversedEvents: number;
  todayEvents: number;
  reversibleEvents: number;
}> {
  
  try {
    const allEvents = await SimpleEventLog.findUserEvents(userId, 1000);
    const today = new Date().toDateString();
    
    const stats = {
      totalEvents: allEvents.length,
      reversedEvents: allEvents.filter(e => e.status === 'reversed').length,
      todayEvents: allEvents.filter(e => e.timestamp.toDateString() === today).length,
      reversibleEvents: allEvents.filter(e => 
        e.status === 'completed' && 
        !e.reversedAt && 
        e.timestamp.toDateString() === today
      ).length
    };
    
    console.log(`📊 [REVERSE] Reversal stats for user ${userId}:`, stats);
    
    return stats;
    
  } catch (error) {
    console.error(`💥 [REVERSE] Error getting reversal stats for user ${userId}`, error);
    return { totalEvents: 0, reversedEvents: 0, todayEvents: 0, reversibleEvents: 0 };
  }
}

/**
 * Clean up old events (development utility)
 */
export async function cleanupOldEvents(olderThanDays: number = 30): Promise<number> {
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    console.log(`🧹 [REVERSE] Cleaning up events older than ${cutoffDate.toDateString()}`);
    
    const result = await SimpleEventLog.deleteMany({
      timestamp: { $lt: cutoffDate },
      status: { $ne: 'completed' } // Keep completed events for analytics
    });
    
    console.log(`✅ [REVERSE] Cleaned up ${result.deletedCount} old events`);
    
    return result.deletedCount || 0;
    
  } catch (error) {
    console.error(`💥 [REVERSE] Error cleaning up old events`, error);
    return 0;
  }
}