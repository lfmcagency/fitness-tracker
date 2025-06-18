/**
 * Nutrition XP calculation rules for the Trophe domain
 * NOW WITH DAILY MEAL CAPPING - only first 5 meals per day get base XP
 */

import { MealEventContext, FoodEventContext } from '@/lib/event-coordinator/types';

/**
 * XP reward configuration for nutrition activities
 */
export const TROPHE_XP_RULES = {
  // Base nutrition actions
  MEAL_LOGGED: 5,        // Only for first 5 meals per day
  FOOD_ADDED_TO_DB: 10,  // Community contribution
  
  // Macro achievement bonuses (ALWAYS work regardless of meal count)
  MACRO_BONUSES: {
    'macro_target_hit': 15,      // 80%+ macros
    'perfect_macro_day': 25,     // 100% macros
  },
  
  // Usage milestones (ALWAYS work)
  USAGE_MILESTONES: {
    'meals_logged_100': 50,
    'meals_logged_500': 150,
    'meals_logged_1000': 300,
  },
} as const;

/**
 * Calculate XP for meal logging with daily cap
 */
export function calculateMealLoggingXp(context: MealEventContext): number {
  let totalXp = 0;
  
  // 🚫 BASE MEAL XP - Only for first 5 meals per day
  if (!context.exceedsDailyMealLimit) {
    totalXp += TROPHE_XP_RULES.MEAL_LOGGED;
    console.log(`🍽️ [MEAL-XP] Base meal XP: +${TROPHE_XP_RULES.MEAL_LOGGED} (meal ${context.dailyMealCount}/5)`);
  } else {
    console.log(`🚫 [MEAL-XP] No base XP: meal ${context.dailyMealCount} exceeds daily limit (5)`);
  }
  
  // ✅ MACRO BONUSES - Always work regardless of meal count
  if (context.dailyMacroProgress >= 100) {
    const bonus = TROPHE_XP_RULES.MACRO_BONUSES.perfect_macro_day;
    totalXp += bonus;
    console.log(`🎯 [MEAL-XP] Perfect macro bonus: +${bonus} (${context.dailyMacroProgress}%)`);
  } else if (context.dailyMacroProgress >= 80) {
    const bonus = TROPHE_XP_RULES.MACRO_BONUSES.macro_target_hit;
    totalXp += bonus;
    console.log(`🎯 [MEAL-XP] Macro target bonus: +${bonus} (${context.dailyMacroProgress}%)`);
  }
  
  // ✅ MILESTONE BONUSES - Always work
  if (context.milestoneHit) {
    const milestoneXp = getMilestoneXp(context.milestoneHit);
    if (milestoneXp > 0) {
      totalXp += milestoneXp;
      console.log(`🏆 [MEAL-XP] Milestone bonus: +${milestoneXp} (${context.milestoneHit})`);
    }
  }
  
  console.log(`📊 [MEAL-XP] Total XP for meal: ${totalXp}`);
  return totalXp;
}

/**
 * Calculate XP for food database contributions
 */
export function calculateFoodContributionXp(context: FoodEventContext): number {
  // Food creation always gives XP (no daily limit)
  return TROPHE_XP_RULES.FOOD_ADDED_TO_DB;
}

/**
 * Get milestone XP value
 */
function getMilestoneXp(milestone: string): number {
  // Extract milestone type and check XP rules
  if (milestone.includes('meals_logged_')) {
    const number = milestone.split('_')[2];
    const key = `meals_logged_${number}` as keyof typeof TROPHE_XP_RULES.USAGE_MILESTONES;
    return TROPHE_XP_RULES.USAGE_MILESTONES[key] || 0;
  }
  
  // Other milestone types can be added here
  return 0;
}

/**
 * Calculate XP for meal deletion (reversal)
 * This should ALWAYS subtract the XP that was originally awarded
 */
export function calculateMealDeletionXp(context: MealEventContext): number {
  // For reversal, we want to subtract whatever XP was originally given
  // Since we don't track original XP in context, calculate what WOULD have been awarded
  // and return negative value
  
  let originalXp = 0;
  
  // Base meal XP - assume it was awarded originally (deletion always reverses)
  originalXp += TROPHE_XP_RULES.MEAL_LOGGED;
  
  // Macro bonuses - check current macro state
  if (context.dailyMacroProgress >= 100) {
    originalXp += TROPHE_XP_RULES.MACRO_BONUSES.perfect_macro_day;
  } else if (context.dailyMacroProgress >= 80) {
    originalXp += TROPHE_XP_RULES.MACRO_BONUSES.macro_target_hit;
  }
  
  // Milestone bonuses - if any milestone was hit
  if (context.milestoneHit) {
    originalXp += getMilestoneXp(context.milestoneHit);
  }
  
  console.log(`🗑️ [MEAL-XP] Reversing ${originalXp} XP for meal deletion`);
  return -originalXp; // Return negative to subtract
}

/**
 * Calculate XP for food deletion (reversal)
 */
export function calculateFoodDeletionXp(context: FoodEventContext): number {
  // Simply reverse the food contribution XP
  const originalXp = TROPHE_XP_RULES.FOOD_ADDED_TO_DB;
  console.log(`🗑️ [FOOD-XP] Reversing ${originalXp} XP for food deletion`);
  return -originalXp;
}

/**
 * Main nutrition XP calculation function
 * This is called by the progress system
 */
export function calculateNutritionXp(
  action: string,
  context: MealEventContext | FoodEventContext
): number {
  switch (action) {
    case 'meal_created':
      return calculateMealLoggingXp(context as MealEventContext);
    
    case 'meal_deleted':
      return calculateMealDeletionXp(context as MealEventContext);
    
    case 'food_created':
      return calculateFoodContributionXp(context as FoodEventContext);
    
    case 'food_deleted':
      return calculateFoodDeletionXp(context as FoodEventContext);
    
    default:
      console.warn(`🤷 [NUTRITION-XP] Unknown action: ${action}`);
      return 0;
  }
}