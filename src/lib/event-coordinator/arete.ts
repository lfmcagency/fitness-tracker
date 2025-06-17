/**
 * ARETE PROCESSOR - Weight Events
 * 
 * Handles weight logging and deletion events.
 * Part of progress tracking domain but separated for clean event handling.
 */

import { Types } from 'mongoose';
import UserProgress from '@/models/UserProgress';
import { 
  WeightEvent, 
  WeightEventContext, 
  DomainEventResult, 
  DomainProcessor 
} from './types';
import { MILESTONE_THRESHOLDS } from '@/lib/shared-utilities';

/**
 * Arete domain processor for weight events
 */
export class AreteProcessor implements DomainProcessor {
  
  /**
   * Process weight events
   */
  async processEvent(event: WeightEvent): Promise<DomainEventResult> {
    const { token, action } = event;
    
    console.log(`⚖️ [ARETE] Processing ${action} | ${token}`);
    
    try {
      switch (action) {
        case 'weight_logged':
          return await this.handleWeightLogging(event);
        case 'weight_deleted':
          return await this.handleWeightDeletion(event);
        default:
          throw new Error(`Unsupported weight action: ${action}`);
      }
    } catch (error) {
      console.error(`💥 [ARETE] Processing failed: ${token}`, error);
      return {
        success: false,
        token,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle weight logging
   */
  private async handleWeightLogging(event: WeightEvent): Promise<DomainEventResult> {
    const { token, weightData } = event;
    
    // Build weight context for Progress
    const context: WeightEventContext = {
      weightEntryId: weightData.weightEntryId,
      currentWeight: weightData.currentWeight,
      previousWeight: weightData.previousWeight,
      weightChange: weightData.weightChange,
      totalEntries: weightData.totalEntries,
      milestoneHit: this.detectWeightMilestone(
        weightData.totalEntries,
        weightData.weightChange
      )
    };
    
    console.log(`📊 [ARETE] Weight logging context: ${token}`, {
      currentWeight: context.currentWeight,
      previousWeight: context.previousWeight,
      change: context.weightChange,
      totalEntries: context.totalEntries,
      milestone: context.milestoneHit
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle weight deletion (reversal)
   */
  private async handleWeightDeletion(event: WeightEvent): Promise<DomainEventResult> {
    const { token, weightData } = event;
    
    // Context for weight deletion
    const context: WeightEventContext = {
      weightEntryId: weightData.weightEntryId,
      currentWeight: weightData.currentWeight,
      previousWeight: weightData.previousWeight,
      weightChange: weightData.weightChange,
      totalEntries: weightData.totalEntries // Already adjusted
      // No milestones on deletion
    };
    
    console.log(`🗑️ [ARETE] Weight deletion context: ${token}`, {
      entryId: context.weightEntryId,
      totalEntries: context.totalEntries
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Check if event can be reversed (same-day only)
   */
  canReverseEvent(event: WeightEvent): boolean {
    const eventDate = new Date(event.timestamp);
    const today = new Date();
    
    // Same day check
    return eventDate.toDateString() === today.toDateString();
  }

  /**
   * Reverse a weight event
   */
  async reverseEvent(
    originalEvent: WeightEvent, 
    originalContext: WeightEventContext
  ): Promise<DomainEventResult> {
    const { action } = originalEvent;
    
    console.log(`🔄 [ARETE] Reversing ${action} for weight entry: ${originalContext.weightEntryId}`);
    
    // Determine reverse action
    let reverseAction: string;
    switch (action) {
      case 'weight_logged':
        reverseAction = 'weight_deleted';
        break;
      default:
        throw new Error(`Cannot reverse action: ${action}`);
    }
    
    // Build reverse context (will be used to subtract XP)
    const reverseContext: WeightEventContext = {
      ...originalContext,
      milestoneHit: undefined // No milestones on reversal
    };
    
    return {
      success: true,
      token: originalEvent.token,
      context: reverseContext
    };
  }

  /**
   * Detect weight milestones
   */
  private detectWeightMilestone(
    totalEntries: number,
    weightChange?: number
  ): string | undefined {
    
    // Weight logging consistency milestones
    if (MILESTONE_THRESHOLDS.USAGE.includes(totalEntries as any)) {
      return `weight_entries_${totalEntries}`;
    }
    
    // Weight change milestones (if we have previous weight)
    if (weightChange !== undefined) {
      const absChange = Math.abs(weightChange);
      
      // Significant weight loss milestones
      if (weightChange < 0) {
        if (absChange >= 10) return 'weight_loss_10kg';
        if (absChange >= 5) return 'weight_loss_5kg';
        if (absChange >= 2) return 'weight_loss_2kg';
      }
      
      // Weight gain milestones (if that's the goal)
      if (weightChange > 0) {
        if (absChange >= 5) return 'weight_gain_5kg';
        if (absChange >= 2) return 'weight_gain_2kg';
      }
    }
    
    return undefined;
  }


}