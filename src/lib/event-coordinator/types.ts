/**
 * GLOBAL EVENT COORDINATOR TYPES
 * 
 * Domain-agnostic type definitions for the event system.
 * Each domain can extend these base types with their specific needs.
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
 * Event result returned by domain processors
 */
export interface DomainEventResult {
  /** Whether the event was processed successfully */
  success: boolean;
  
  /** Progress system response (if progress event was fired) */
  progressResult?: any;
  
  /** Milestones that were hit during processing */
  milestonesHit?: string[];
  
  /** Achievements that were unlocked */
  achievementsUnlocked?: string[];
  
  /** Error message if processing failed */
  error?: string;
  
  /** Token for tracking */
  token: string;
}

/**
 * Configuration for milestone detection
 */
export interface MilestoneConfig {
  /** Milestone type identifier */
  type: 'streak' | 'completion' | 'usage' | 'performance';
  
  /** Threshold values that trigger milestones */
  thresholds: readonly number[];
  
  /** Prefix for achievement IDs */
  achievementPrefix: string;
}

/**
 * XP mapping configuration for domains
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
}

/**
 * Global XP mapping - configurable per domain
 */
export const DOMAIN_XP_CONFIG: Record<string, DomainXpConfig> = {
  ethos: {
    baseXp: 50,
    streakMultiplier: 1.0,
    milestoneBonus: 25,
    progressCategory: 'core'
  },
  trophe: {
    baseXp: 30,
    streakMultiplier: 1.2,
    milestoneBonus: 20,
    progressCategory: 'push'
  },
  soma: {
    baseXp: 40,
    streakMultiplier: 1.1,
    milestoneBonus: 30,
    progressCategory: 'legs'
  }
} as const;

/**
 * Milestone detection result
 */
export interface MilestoneResult {
  /** Type of milestone detected */
  type: 'streak' | 'completion' | 'usage' | 'performance' | null;
  
  /** Threshold value that was crossed */
  threshold: number | null;
  
  /** Achievement ID for this milestone */
  achievementId: string | null;
  
  /** Whether this is a new milestone (vs already achieved) */
  isNewMilestone: boolean;
  
  /** Current value that triggered the check */
  currentValue: number;
}

/**
 * Contract for cross-domain operations
 */
export interface CrossDomainContract {
  /** Token for tracking */
  token: string;
  
  /** Target domain to operate on */
  targetDomain: 'ethos' | 'trophe' | 'soma';
  
  /** Operation to perform */
  operation: 'create_task' | 'update_task' | 'complete_task' | 'check_metrics';
  
  /** Data for the operation */
  operationData: any;
  
  /** Source domain making the request */
  sourceDomain: string;
  
  /** User context */
  userId: string;
}

/**
 * Event logging entry for debugging and recovery
 */
export interface EventLogEntry {
  /** Unique token for this operation */
  token: string;
  
  /** Stage where this log was created */
  stage: 'domain' | 'coordinator' | 'progress' | 'achievement';
  
  /** Whether this was a success or failure */
  success: boolean;
  
  /** Original event data */
  eventData: BaseEventData;
  
  /** Result or error from processing */
  result?: any;
  error?: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Reversal data for atomic undo operations */
  reversalData?: any;
}

/**
 * Domain processor interface - each domain implements this
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
}

/**
 * Token generation utility type
 */
export type TokenGenerator = () => string;