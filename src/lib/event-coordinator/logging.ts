/**
 * EVENT COORDINATOR LOGGING & TOKEN TRACKING
 * 
 * Token generation, event logging, and debugging utilities for
 * tracking operations across the entire event chain.
 */

import { 
  BaseEventData, 
  EventLogEntry, 
  RichEventContext, 
  RichProgressContract, 
  TokenTracker,
  ReversalData 
} from './types';

/**
 * In-memory event log for debugging (production would use database)
 */
const EVENT_LOG: Map<string, EventLogEntry[]> = new Map();

/**
 * Active token tracking for performance monitoring
 */
const ACTIVE_TOKENS: Map<string, { startTime: number; stages: string[] }> = new Map();

/**
 * Generate unique token for operation tracking
 */
export function generateToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `evt_${timestamp}_${random}`;
}

/**
 * Start tracking a token through the event chain
 */
export function startTokenTracking(token: string): void {
  ACTIVE_TOKENS.set(token, {
    startTime: Date.now(),
    stages: []
  });
  
  console.log(`🎯 [TOKEN] Started tracking: ${token}`);
}

/**
 * Track token through a specific stage
 */
export function trackTokenStage(token: string, stage: string, data?: any): void {
  const tracking = ACTIVE_TOKENS.get(token);
  if (tracking) {
    tracking.stages.push(stage);
    console.log(`📍 [TOKEN] ${token} → ${stage}`);
  }
}

/**
 * Complete token tracking and calculate performance
 */
export function completeTokenTracking(token: string): {
  totalDuration: number;
  stages: string[];
} | null {
  const tracking = ACTIVE_TOKENS.get(token);
  if (!tracking) return null;
  
  const totalDuration = Date.now() - tracking.startTime;
  ACTIVE_TOKENS.delete(token);
  
  console.log(`✅ [TOKEN] Completed: ${token} (${totalDuration}ms)`);
  return {
    totalDuration,
    stages: tracking.stages
  };
}

/**
 * Log an event entry for debugging and recovery
 */
export function logEventEntry(entry: Omit<EventLogEntry, 'timestamp'>): void {
  const fullEntry: EventLogEntry = {
    ...entry,
    timestamp: new Date()
  };
  
  // Add to in-memory log
  const tokenEntries = EVENT_LOG.get(entry.token) || [];
  tokenEntries.push(fullEntry);
  EVENT_LOG.set(entry.token, tokenEntries);
  
  // Log to console for debugging
  const status = entry.success ? '✅' : '❌';
  console.log(`${status} [LOG] ${entry.stage.toUpperCase()} | ${entry.token} | ${entry.eventData.action}`);
  
  if (entry.error) {
    console.error(`💥 [ERROR] ${entry.token}: ${entry.error}`);
  }
}

/**
 * Log successful event processing
 */
export function logEventSuccess(
  token: string,
  stage: string,
  eventData: BaseEventData,
  result?: any,
  richContext?: RichEventContext,
  progressContract?: RichProgressContract,
  reversalData?: ReversalData
): void {
  logEventEntry({
    token,
    stage: stage as any,
    success: true,
    eventData,
    richContext,
    progressContract,
    result,
    reversalData
  });
}

/**
 * Log failed event processing
 */
export function logEventFailure(
  token: string,
  stage: string,
  eventData: BaseEventData,
  error: string | Error
): void {
  logEventEntry({
    token,
    stage: stage as any,
    success: false,
    eventData,
    error: error instanceof Error ? error.message : error
  });
}

/**
 * Get complete token history for debugging
 */
export function getTokenHistory(token: string): EventLogEntry[] {
  return EVENT_LOG.get(token) || [];
}

/**
 * Get all log entries for a user (debugging utility)
 */
export function getUserEventHistory(userId: string, limit: number = 50): EventLogEntry[] {
  const allEntries: EventLogEntry[] = [];
  
  for (const tokenEntries of EVENT_LOG.values()) {
    for (const entry of tokenEntries) {
      if (entry.eventData.userId === userId) {
        allEntries.push(entry);
      }
    }
  }
  
  return allEntries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Check if token is still active in the system
 */
export function isTokenActive(token: string): boolean {
  return ACTIVE_TOKENS.has(token);
}

/**
 * Get performance metrics for a completed token
 */
export function getTokenPerformance(token: string): {
  totalDuration?: number;
  stageCount: number;
  errorCount: number;
  lastStage: string | null;
} {
  const entries = getTokenHistory(token);
  
  if (entries.length === 0) {
    return { stageCount: 0, errorCount: 0, lastStage: null };
  }
  
  const errorCount = entries.filter(e => !e.success).length;
  const lastEntry = entries[entries.length - 1];
  const firstEntry = entries[0];
  
  const totalDuration = lastEntry && firstEntry 
    ? lastEntry.timestamp.getTime() - firstEntry.timestamp.getTime()
    : undefined;
  
  return {
    totalDuration,
    stageCount: entries.length,
    errorCount,
    lastStage: lastEntry?.stage || null
  };
}

/**
 * Find failed tokens for debugging
 */
export function findFailedTokens(timeRange: { start: Date; end: Date }): string[] {
  const failedTokens: Set<string> = new Set();
  
  for (const [token, entries] of EVENT_LOG.entries()) {
    const hasFailure = entries.some(entry => 
      !entry.success && 
      entry.timestamp >= timeRange.start && 
      entry.timestamp <= timeRange.end
    );
    
    if (hasFailure) {
      failedTokens.add(token);
    }
  }
  
  return Array.from(failedTokens);
}

/**
 * Get event statistics for monitoring
 */
export function getEventStatistics(timeRange?: { start: Date; end: Date }): {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageDuration: number;
  domainBreakdown: Record<string, number>;
  stageBreakdown: Record<string, number>;
} {
  let totalEvents = 0;
  let successfulEvents = 0;
  let failedEvents = 0;
  let totalDuration = 0;
  const domainBreakdown: Record<string, number> = {};
  const stageBreakdown: Record<string, number> = {};
  
  for (const entries of EVENT_LOG.values()) {
    for (const entry of entries) {
      // Apply time filter if specified
      if (timeRange && (entry.timestamp < timeRange.start || entry.timestamp > timeRange.end)) {
        continue;
      }
      
      totalEvents++;
      
      if (entry.success) {
        successfulEvents++;
      } else {
        failedEvents++;
      }
      
      // Domain breakdown
      const domain = entry.eventData.source;
      domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1;
      
      // Stage breakdown
      stageBreakdown[entry.stage] = (stageBreakdown[entry.stage] || 0) + 1;
      
      // Duration calculation (if performance data available)
      if (entry.performance?.duration) {
        totalDuration += entry.performance.duration;
      }
    }
  }
  
  return {
    totalEvents,
    successfulEvents,
    failedEvents,
    averageDuration: totalEvents > 0 ? totalDuration / totalEvents : 0,
    domainBreakdown,
    stageBreakdown
  };
}

/**
 * Clear old log entries to prevent memory bloat
 * In production, this would archive to database
 */
export function clearOldLogEntries(olderThan: Date): number {
  let clearedCount = 0;
  
  for (const [token, entries] of EVENT_LOG.entries()) {
    const filteredEntries = entries.filter(entry => entry.timestamp >= olderThan);
    
    if (filteredEntries.length === 0) {
      EVENT_LOG.delete(token);
      clearedCount += entries.length;
    } else if (filteredEntries.length !== entries.length) {
      EVENT_LOG.set(token, filteredEntries);
      clearedCount += entries.length - filteredEntries.length;
    }
  }
  
  console.log(`🧹 [LOG] Cleared ${clearedCount} old log entries`);
  return clearedCount;
}

/**
 * Export event logs for analysis (development utility)
 */
export function exportEventLogs(format: 'json' | 'csv' = 'json'): string {
  const allEntries: EventLogEntry[] = [];
  
  for (const entries of EVENT_LOG.values()) {
    allEntries.push(...entries);
  }
  
  if (format === 'json') {
    return JSON.stringify(allEntries, null, 2);
  }
  
  // CSV format
  const headers = ['token', 'stage', 'success', 'source', 'action', 'userId', 'timestamp', 'error'];
  const rows = allEntries.map(entry => [
    entry.token,
    entry.stage,
    entry.success.toString(),
    entry.eventData.source,
    entry.eventData.action,
    entry.eventData.userId,
    entry.timestamp.toISOString(),
    entry.error || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Token tracker implementation
 */
export const tokenTracker: TokenTracker = {
  generateToken,
  trackToken: trackTokenStage,
  getTokenHistory,
  isTokenActive
};

/**
 * Initialize logging system (cleanup old entries on startup)
 */
export function initializeLogging(): void {
  // Clear entries older than 24 hours on startup
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  clearOldLogEntries(oneDayAgo);
  
  console.log('🔧 [LOG] Event logging system initialized');
}

/**
 * Emergency log dump for debugging critical failures
 */
export function emergencyLogDump(): void {
  console.log('🚨 [EMERGENCY] Complete event log dump:');
  console.log(exportEventLogs('json'));
}