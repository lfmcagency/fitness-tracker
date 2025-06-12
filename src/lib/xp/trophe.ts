/**
 * Nutrition XP calculation rules for the Trophe domain
 * Handles XP calculations for meal logging, macro tracking, and nutrition goals
 */

/**
 * XP reward configuration for nutrition activities
 */
export const TROPHE_XP_RULES = {
  // Base nutrition actions
  MEAL_LOGGED: 5,
  FOOD_ADDED_TO_DB: 10, // Community contribution
  
  // Macro achievement bonuses
  MACRO_GOALS: {
    'macro_80_percent': 15,
    'macro_100_percent': 25,
  },
  
  // Consistency bonuses (streak-based, handled by Ethos)
  CONSISTENCY: {
    DAILY_LOGGING_BONUS: 2, // Per day streak
    MAX_CONSISTENCY_BONUS: 30,
  },
  
  // Usage milestones
  USAGE_MILESTONES: {
    '100_meals_logged': 50,
    '500_meals_logged': 150,
    '1000_meals_logged': 300,
    '25_foods_added': 75,
    '50_foods_added': 150,
    '100_unique_foods': 100,
  },
} as const;

/**
 * Calculate XP for meal logging
 */
export function calculateMealLoggingXp(
  streakCount: number = 0
): number {
  let xp = TROPHE_XP_RULES.MEAL_LOGGED;
  
  // Consistency bonus for daily logging streaks
  const consistencyBonus = Math.min(
    streakCount * TROPHE_XP_RULES.CONSISTENCY.DAILY_LOGGING_BONUS,
    TROPHE_XP_RULES.CONSISTENCY.MAX_CONSISTENCY_BONUS
  );
  
  return xp + consistencyBonus;
}

/**
 * Calculate XP for macro goal achievement
 */
export function calculateMacroGoalXp(
  goalType: 'macro_80_percent' | 'macro_100_percent',
  previousGoal?: 'macro_80_percent'
): { baseXp: number; adjustment: number } {
  const currentXp = TROPHE_XP_RULES.MACRO_GOALS[goalType];
  
  // Handle same-day progression (80% → 100%)
  if (previousGoal && goalType === 'macro_100_percent') {
    const previousXp = TROPHE_XP_RULES.MACRO_GOALS[previousGoal];
    return {
      baseXp: currentXp,
      adjustment: currentXp - previousXp, // Only award the difference
    };
  }
  
  return {
    baseXp: currentXp,
    adjustment: 0,
  };
}

/**
 * Calculate XP for adding foods to database
 */
export function calculateFoodContributionXp(): number {
  return TROPHE_XP_RULES.FOOD_ADDED_TO_DB;
}

/**
 * Check if meal count hits a usage milestone
 */
export function checkMealCountMilestone(totalMeals: number): string | null {
  const milestones = [100, 500, 1000];
  
  for (const milestone of milestones) {
    if (totalMeals === milestone) {
      return `${milestone}_meals_logged`;
    }
  }
  
  return null;
}

/**
 * Check if food database contributions hit a milestone
 */
export function checkFoodContributionMilestone(totalFoodsAdded: number): string | null {
  const milestones = [25, 50];
  
  for (const milestone of milestones) {
    if (totalFoodsAdded === milestone) {
      return `${milestone}_foods_added`;
    }
  }
  
  return null;
}

/**
 * Check if unique foods tried hits a milestone
 */
export function checkUniqueFoodsMilestone(uniqueFoodCount: number): string | null {
  if (uniqueFoodCount === 100) {
    return '100_unique_foods';
  }
  
  return null;
}

/**
 * Calculate macro goal completion percentage
 */
export function calculateMacroCompletion(
  currentMacros: { protein: number; carbs: number; fat: number },
  targetMacros: { protein: number; carbs: number; fat: number }
): number {
  const proteinPercent = Math.min(100, (currentMacros.protein / targetMacros.protein) * 100);
  const carbsPercent = Math.min(100, (currentMacros.carbs / targetMacros.carbs) * 100);
  const fatPercent = Math.min(100, (currentMacros.fat / targetMacros.fat) * 100);
  
  // Average of all macro percentages
  const averageCompletion = (proteinPercent + carbsPercent + fatPercent) / 3;
  
  return Math.floor(averageCompletion);
}

/**
 * Determine which macro goal level was achieved
 */
export function determineMacroGoalLevel(completionPercent: number): 'macro_80_percent' | 'macro_100_percent' | null {
  if (completionPercent >= 100) {
    return 'macro_100_percent';
  } else if (completionPercent >= 80) {
    return 'macro_80_percent';
  }
  
  return null;
}