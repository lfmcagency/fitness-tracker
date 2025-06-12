/**
 * Task completion XP calculation rules for the Ethos domain
 * NO MORE DIRECT XP AWARDING - just calculation logic
 */

/**
 * XP reward configuration for tasks
 */
export const TASK_XP_RULES = {
  BASE_COMPLETION: 10,
  STREAK_BONUS_PER_DAY: 2,
  MAX_STREAK_BONUS: 50,
  
  // Milestone bonuses
  MILESTONES: {
    '7_day_streak': 25,
    '30_day_streak': 100,
    '100_day_streak': 500,
    '50_completions': 75,
    '100_completions': 200,
    '250_completions': 300,
    '500_completions': 500,
  },
  
  // Nutrition-specific bonuses
  NUTRITION: {
    'meal_logged': 5,
    'macro_80_percent': 15,
    'macro_100_percent': 25,
  },
} as const;

/**
 * Calculate XP amount for task completion
 * Used by the main XP coordinator when processing events
 */
export function calculateTaskCompletionXp(
  baseSource: string,
  streakCount: number = 0,
  milestoneHit?: string,
  currentMetric?: string
): number {
  // Get base XP
  let xpAmount: number = TASK_XP_RULES.BASE_COMPLETION;
  
  // Check for nutrition-specific base amounts
  if (baseSource in TASK_XP_RULES.NUTRITION) {
    xpAmount = TASK_XP_RULES.NUTRITION[baseSource as keyof typeof TASK_XP_RULES.NUTRITION];
  }
  
  // Streak bonus: +2 XP per day in streak, max 50 bonus
  const streakBonus = Math.min(
    streakCount * TASK_XP_RULES.STREAK_BONUS_PER_DAY, 
    TASK_XP_RULES.MAX_STREAK_BONUS
  );
  xpAmount += streakBonus;
  
  // Milestone bonus
  if (milestoneHit && milestoneHit in TASK_XP_RULES.MILESTONES) {
    xpAmount += TASK_XP_RULES.MILESTONES[milestoneHit as keyof typeof TASK_XP_RULES.MILESTONES];
  }
  
  // Current metric bonus (nutrition goals)
  if (currentMetric && currentMetric in TASK_XP_RULES.NUTRITION) {
    xpAmount += TASK_XP_RULES.NUTRITION[currentMetric as keyof typeof TASK_XP_RULES.NUTRITION];
  }
  
  return Math.max(1, xpAmount);
}

/**
 * Check if a streak count hits a milestone threshold
 */
export function checkStreakMilestone(streakCount: number): string | null {
  const milestones = [7, 30, 100];
  
  for (const milestone of milestones) {
    if (streakCount === milestone) {
      return `${milestone}_day_streak`;
    }
  }
  
  return null;
}

/**
 * Check if total completions hit a milestone threshold
 */
export function checkCompletionMilestone(totalCompletions: number): string | null {
  const milestones = [50, 100, 250, 500];
  
  for (const milestone of milestones) {
    if (totalCompletions === milestone) {
      return `${milestone}_completions`;
    }
  }
  
  return null;
}

/**
 * Determine XP adjustments for same-day metric changes (80% → 100% macros)
 */
export function calculateMetricAdjustment(
  previousMetric: string | undefined,
  currentMetric: string
): { baseXp: number; adjustment: number } {
  const currentXp = TASK_XP_RULES.NUTRITION[currentMetric as keyof typeof TASK_XP_RULES.NUTRITION] || 0;
  
  if (!previousMetric) {
    return { baseXp: currentXp, adjustment: 0 };
  }
  
  const previousXp = TASK_XP_RULES.NUTRITION[previousMetric as keyof typeof TASK_XP_RULES.NUTRITION] || 0;
  
  // Return the difference (could be positive or negative)
  return { 
    baseXp: currentXp, 
    adjustment: currentXp - previousXp 
  };
}