/**
 * SIMPLIFIED EVENT LOGGING & TOKEN TRACKING
 * 
 * Keeps the token tracking that works great, removes complex event log entries.
 * Token = event identifier, simple performance monitoring.
 */

import { DomainEvent, DomainEventResult, EventContext } from './types';

/**
 * In-memory token tracking for performance monitoring
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
export function trackTokenStage(token: string, stage: string): void {
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
 * Check if token is still active in the system
 */
export function isTokenActive(token: string): boolean {
  return ACTIVE_TOKENS.has(token);
}

/**
 * Get performance metrics for active tokens
 */
export function getActiveTokens(): Array<{
  token: string;
  duration: number;
  stages: string[];
}> {
  const activeTokens = [];
  const now = Date.now();
  
  for (const [token, tracking] of ACTIVE_TOKENS.entries()) {
    activeTokens.push({
      token,
      duration: now - tracking.startTime,
      stages: tracking.stages
    });
  }
  
  return activeTokens;
}

/**
 * Simple event logging to console (keep it light)
 */
export function logEventSuccess(
  token: string,
  stage: string,
  event: DomainEvent,
  result: DomainEventResult
): void {
  console.log(`✅ [LOG] ${stage.toUpperCase()} | ${token} | ${event.source}_${event.action}`, {
    xpAwarded: result.xpAwarded || 0,
    achievements: result.achievementsUnlocked?.length || 0
  });
}

/**
 * Log event failures
 */
export function logEventFailure(
  token: string,
  stage: string,
  event: DomainEvent,
  error: string
): void {
  console.error(`❌ [LOG] ${stage.toUpperCase()} | ${token} | ${event.source}_${event.action}`, {
    error: error.substring(0, 100) // Truncate long errors
  });
}

/**
 * Simple performance statistics
 */
export function getPerformanceStats(): {
  activeTokens: number;
  averageDuration: number;
  slowestTokens: Array<{ token: string; duration: number }>;
} {
  const activeTokens = getActiveTokens();
  const totalDuration = activeTokens.reduce((sum, t) => sum + t.duration, 0);
  const averageDuration = activeTokens.length > 0 ? totalDuration / activeTokens.length : 0;
  
  const slowestTokens = activeTokens
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map(t => ({ token: t.token, duration: t.duration }));
  
  return {
    activeTokens: activeTokens.length,
    averageDuration: Math.round(averageDuration),
    slowestTokens
  };
}

/**
 * Clear old tracking data to prevent memory bloat
 */
export function clearOldTracking(): number {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  let cleared = 0;
  
  for (const [token, tracking] of ACTIVE_TOKENS.entries()) {
    if (now - tracking.startTime > maxAge) {
      console.log(`🧹 [TOKEN] Clearing stale token: ${token}`);
      ACTIVE_TOKENS.delete(token);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`🧹 [LOG] Cleared ${cleared} stale tokens`);
  }
  
  return cleared;
}

/**
 * Debug utility - dump all active tokens
 */
export function dumpActiveTokens(): void {
  console.log('🚨 [DEBUG] Active tokens dump:');
  for (const [token, tracking] of ACTIVE_TOKENS.entries()) {
    const duration = Date.now() - tracking.startTime;
    console.log(`  ${token}: ${duration}ms | stages: ${tracking.stages.join(' → ')}`);
  }
}

/**
 * Initialize logging system (cleanup on startup)
 */
export function initializeLogging(): void {
  // Clear any stale tokens on startup
  clearOldTracking();
  
  // Set up periodic cleanup
  setInterval(() => {
    clearOldTracking();
  }, 60000); // Every minute
  
  console.log('🔧 [LOG] Simple logging system initialized');
}