import { ProgressCategory } from '@/lib/category-progress';

/**
 * Exercise and workout XP calculation rules for the Soma domain
 * NO MORE DIRECT XP AWARDING - just calculation logic
 */

/**
 * XP reward configuration for soma (training) activities
 */
export const SOMA_XP_RULES = {
  // Workout completion base rewards
  WORKOUT_COMPLETION: 50,
  
  // Difficulty multipliers
  DIFFICULTY_MULTIPLIERS: {
    'easy': 0.75,     // 75% of base
    'medium': 1.0,    // 100% of base  
    'hard': 1.5,      // 150% of base
  },
  
  // Exercise progression rewards
  EXERCISE_BASE: 25,
  EXERCISE_MASTERY: 100,
  
  // Category secondary XP multiplier
  SECONDARY_CATEGORY_MULTIPLIER: 0.3,
  
  // Mastery level multipliers
  MASTERY_MULTIPLIERS: {
    'bronze': 1.0,
    'silver': 1.5,
    'gold': 2.0,
    'platinum': 3.0,
  },
} as const;

/**
 * Calculate XP for workout completion
 */
export function calculateWorkoutXp(
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  categories?: ProgressCategory[]
): { primaryXp: number; secondaryXp: number; totalCategories: number } {
  const baseXp = SOMA_XP_RULES.WORKOUT_COMPLETION;
  const multiplier = SOMA_XP_RULES.DIFFICULTY_MULTIPLIERS[difficulty];
  const primaryXp = Math.floor(baseXp * multiplier);
  
  // Secondary categories get reduced XP
  const secondaryXp = Math.floor(primaryXp * SOMA_XP_RULES.SECONDARY_CATEGORY_MULTIPLIER);
  const totalCategories = categories?.length || 1;
  
  return {
    primaryXp,
    secondaryXp,
    totalCategories,
  };
}

/**
 * Calculate XP for exercise progression
 */
export function calculateExerciseXp(
  masteryLevel: number = 1,
  bodyweight?: number,
  reps?: number,
  exerciseDifficulty: number = 5 // 1-10 scale
): number {
  // Base XP scales with mastery level and exercise difficulty
  let xpAmount = SOMA_XP_RULES.EXERCISE_BASE * masteryLevel * (exerciseDifficulty / 5);
  
  // Bodyweight scaling for calisthenics (higher bodyweight = more impressive)
  if (bodyweight && reps && bodyweight > 70) {
    const bodyweightBonus = Math.floor((bodyweight - 70) * 0.1 * reps);
    xpAmount += Math.max(0, bodyweightBonus);
  }
  
  return Math.floor(xpAmount);
}

/**
 * Calculate XP for exercise mastery milestones
 */
export function calculateMasteryXp(
  milestoneType: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze'
): number {
  const multiplier = SOMA_XP_RULES.MASTERY_MULTIPLIERS[milestoneType];
  return Math.floor(SOMA_XP_RULES.EXERCISE_MASTERY * multiplier);
}

/**
 * Calculate XP for individual sets based on performance
 */
export function calculateSetXp(
  exerciseDifficulty: number, // 1-10 scale
  reps?: number,
  holdTime?: number, // seconds
  bodyweight?: number
): number {
  let baseXp = exerciseDifficulty * 2; // 2-20 XP base range

  // Rep-based XP
  if (reps) {
    baseXp += reps * 0.5;
  }

  // Hold time XP (for planks, L-sits, etc.)
  if (holdTime) {
    baseXp += holdTime * 0.1;
  }

  // Bodyweight scaling
  if (bodyweight && bodyweight > 70) {
    const bodyweightBonus = (bodyweight - 70) * 0.05;
    baseXp += bodyweightBonus;
  }

  return Math.floor(Math.max(1, baseXp));
}

/**
 * Check if exercise progression hits category milestones
 */
export function checkCategoryMilestone(
  category: ProgressCategory,
  previousCategoryXp: number,
  newCategoryXp: number
): string | null {
  const milestones = [500, 1500, 3000, 6000, 10000]; // Category XP thresholds
  const milestoneNames = ['beginner', 'intermediate', 'advanced', 'expert', 'master'];
  
  for (let i = 0; i < milestones.length; i++) {
    const threshold = milestones[i];
    if (previousCategoryXp < threshold && newCategoryXp >= threshold) {
      return `${category}_${milestoneNames[i]}`;
    }
  }
  
  return null;
}

/**
 * Calculate total workout XP distribution across categories
 */
export function calculateWorkoutDistribution(
  baseXp: number,
  categories: ProgressCategory[]
): Array<{ category: ProgressCategory; xp: number; isPrimary: boolean }> {
  if (categories.length === 0) {
    return [];
  }
  
  const distribution: Array<{ category: ProgressCategory; xp: number; isPrimary: boolean }> = [];
  
  // First category gets full XP
  distribution.push({
    category: categories[0],
    xp: baseXp,
    isPrimary: true,
  });
  
  // Additional categories get secondary XP
  const secondaryXp = Math.floor(baseXp * SOMA_XP_RULES.SECONDARY_CATEGORY_MULTIPLIER);
  for (let i = 1; i < categories.length; i++) {
    distribution.push({
      category: categories[i],
      xp: secondaryXp,
      isPrimary: false,
    });
  }
  
  return distribution;
}