/**
 * TROPHE PROCESSOR - Nutrition Events
 * 
 * Handles meal and food creation/deletion/update events.
 * Calculates macro progress and meal counts for XP system.
 */

import { Types } from 'mongoose';
import Meal from '@/models/Meal';
import Food from '@/models/Food';
import { 
  MealEvent, 
  FoodEvent, 
  MealEventContext, 
  FoodEventContext, 
  DomainEventResult, 
  DomainProcessor 
} from './types';
import { MILESTONE_THRESHOLDS } from '@/lib/shared-utilities';

/**
 * Trophe domain processor
 */
export class TropheProcessor implements DomainProcessor {
  
  /**
   * Process nutrition events
   */
  async processEvent(event: MealEvent | FoodEvent): Promise<DomainEventResult> {
    const { token, action } = event;
    
    console.log(`🥗 [TROPHE] Processing ${action} | ${token}`);
    
    try {
      if (action.startsWith('meal_')) {
        return await this.processMealEvent(event as MealEvent);
      } else if (action.startsWith('food_')) {
        return await this.processFoodEvent(event as FoodEvent);
      } else {
        throw new Error(`Unsupported nutrition action: ${action}`);
      }
    } catch (error) {
      console.error(`💥 [TROPHE] Processing failed: ${token}`, error);
      return {
        success: false,
        token,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process meal events
   */
  private async processMealEvent(event: MealEvent): Promise<DomainEventResult> {
    const { token, action, mealData } = event;
    
    switch (action) {
      case 'meal_created':
        return await this.handleMealCreation(event);
      case 'meal_deleted':
        return await this.handleMealDeletion(event);
      case 'meal_updated':
        return await this.handleMealUpdate(event);
      default:
        throw new Error(`Unsupported meal action: ${action}`);
    }
  }

  /**
   * Process food events
   */
  private async processFoodEvent(event: FoodEvent): Promise<DomainEventResult> {
    const { token, action, foodData } = event;
    
    switch (action) {
      case 'food_created':
        return await this.handleFoodCreation(event);
      case 'food_deleted':
        return await this.handleFoodDeletion(event);
      default:
        throw new Error(`Unsupported food action: ${action}`);
    }
  }

  /**
   * Handle meal creation
   */
  private async handleMealCreation(event: MealEvent): Promise<DomainEventResult> {
    const { token, mealData } = event;
    
    // Build nutrition context for Progress
    const context: MealEventContext = {
      mealId: mealData.mealId,
      mealName: mealData.mealName,
      totalMeals: mealData.totalMeals,
      dailyMacroProgress: mealData.dailyMacroProgress.total,
      macroGoalsMet: mealData.dailyMacroProgress.total >= 80,
      milestoneHit: this.detectNutritionMilestone(
        mealData.totalMeals,
        mealData.dailyMacroProgress.total
      )
    };
    
    console.log(`🍽️ [TROPHE] Meal creation context: ${token}`, {
      totalMeals: context.totalMeals,
      macroProgress: context.dailyMacroProgress,
      milestone: context.milestoneHit
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle meal deletion (reversal)
   */
  private async handleMealDeletion(event: MealEvent): Promise<DomainEventResult> {
    const { token, mealData } = event;
    
    // Context for meal deletion
    const context: MealEventContext = {
      mealId: mealData.mealId,
      mealName: mealData.mealName,
      totalMeals: mealData.totalMeals, // Already adjusted
      dailyMacroProgress: mealData.dailyMacroProgress.total,
      macroGoalsMet: mealData.dailyMacroProgress.total >= 80
      // No milestones on deletion
    };
    
    console.log(`🗑️ [TROPHE] Meal deletion context: ${token}`, {
      totalMeals: context.totalMeals,
      macroProgress: context.dailyMacroProgress
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle meal update (threshold changes)
   */
  private async handleMealUpdate(event: MealEvent): Promise<DomainEventResult> {
    const { token, mealData, metadata } = event;
    
    // Extract threshold change info from metadata
    const thresholdChange = metadata?.thresholdChange;
    
    if (!thresholdChange) {
      console.log(`🔄 [TROPHE] Meal update with no threshold changes: ${token}`);
      return { success: true, token };
    }
    
    // Build context for threshold-based XP calculation
    const context: MealEventContext = {
      mealId: mealData.mealId,
      mealName: mealData.mealName,
      totalMeals: mealData.totalMeals,
      dailyMacroProgress: mealData.dailyMacroProgress.total,
      macroGoalsMet: mealData.dailyMacroProgress.total >= 80,
      // Special milestone for threshold changes
      milestoneHit: this.detectThresholdMilestone(
        thresholdChange.from,
        thresholdChange.to
      )
    };
    
    console.log(`🔄 [TROPHE] Meal update context: ${token}`, {
      macroProgress: context.dailyMacroProgress,
      thresholdChange: `${thresholdChange.from} → ${thresholdChange.to}`,
      milestone: context.milestoneHit
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle food creation
   */
  private async handleFoodCreation(event: FoodEvent): Promise<DomainEventResult> {
    const { token, foodData } = event;
    
    // Simple context for food creation
    const context: FoodEventContext = {
      foodId: foodData.foodId,
      foodName: foodData.foodName,
      totalFoods: foodData.totalFoods,
      isSystemFood: foodData.isSystemFood
    };
    
    console.log(`🥕 [TROPHE] Food creation context: ${token}`, {
      foodName: context.foodName,
      totalFoods: context.totalFoods,
      isSystem: context.isSystemFood
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle food deletion
   */
  private async handleFoodDeletion(event: FoodEvent): Promise<DomainEventResult> {
    const { token, foodData } = event;
    
    // Context for food deletion
    const context: FoodEventContext = {
      foodId: foodData.foodId,
      foodName: foodData.foodName,
      totalFoods: foodData.totalFoods,
      isSystemFood: foodData.isSystemFood
    };
    
    console.log(`🗑️ [TROPHE] Food deletion context: ${token}`, {
      foodName: context.foodName,
      totalFoods: context.totalFoods
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
  canReverseEvent(event: MealEvent | FoodEvent): boolean {
    const eventDate = new Date(event.timestamp);
    const today = new Date();
    
    // Same day check
    return eventDate.toDateString() === today.toDateString();
  }

  /**
   * Reverse a nutrition event
   */
  async reverseEvent(
    originalEvent: MealEvent | FoodEvent, 
    originalContext: MealEventContext | FoodEventContext
  ): Promise<DomainEventResult> {
    const { action } = originalEvent;
    
    console.log(`🔄 [TROPHE] Reversing ${action}`);
    
    // Determine reverse action
    let reverseAction: string;
    switch (action) {
      case 'meal_created':
        reverseAction = 'meal_deleted';
        break;
      case 'food_created':
        reverseAction = 'food_deleted';
        break;
      default:
        throw new Error(`Cannot reverse action: ${action}`);
    }
    
    // Build reverse context (will be used to subtract XP)
    const reverseContext = {
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
   * Detect nutrition milestones
   */
  private detectNutritionMilestone(
    totalMeals: number, 
    macroProgress: number
  ): string | undefined {
    
    // Perfect macro day
    if (macroProgress >= 100) {
      return 'perfect_macro_day';
    }
    
    // Good macro day (80%+)
    if (macroProgress >= 80) {
      return 'macro_target_hit';
    }
    
    // Meal count milestones
    if (MILESTONE_THRESHOLDS.USAGE.includes(totalMeals as any)) {
      return `meals_logged_${totalMeals}`;
    }
    
    return undefined;
  }

  /**
   * Detect threshold change milestones (for meal updates)
   */
  private detectThresholdMilestone(
    fromThresholds: number[],
    toThresholds: number[]
  ): string | undefined {
    
    // Check for newly crossed thresholds
    const newThresholds = toThresholds.filter(t => !fromThresholds.includes(t));
    const lostThresholds = fromThresholds.filter(t => !toThresholds.includes(t));
    
    if (newThresholds.includes(100)) {
      return 'perfect_macro_threshold_crossed';
    }
    
    if (newThresholds.includes(80)) {
      return 'macro_target_threshold_crossed';
    }
    
    // Could also handle threshold loss if needed
    if (lostThresholds.includes(100)) {
      return 'perfect_macro_threshold_lost';
    }
    
    if (lostThresholds.includes(80)) {
      return 'macro_target_threshold_lost';
    }
    
    return undefined;
  }
}