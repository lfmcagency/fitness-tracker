import { Types } from 'mongoose';
import { ProgressCategory } from '@/lib/category-progress';
import { awardXp, XpAwardResult } from './index';

/**
 * Exercise and workout XP logic for the Soma domain
 * Handles XP awards for completing workouts, exercises, and training progressions
 */

/**
 * XP reward configuration for soma (training) activities
 */
export const SOMA_XP_REWARDS = {
  // Workout completion base rewards
  WORKOUT_COMPLETION: 50,
  WORKOUT_EASY: 0.75,     // 75% of base
  WORKOUT_MEDIUM: 1.0,    // 100% of base  
  WORKOUT_HARD: 1.5,      // 150% of base
  
  // Exercise mastery rewards
  EXERCISE_MASTERY: 100,
  EXERCISE_PROGRESSION: 25,
  
  // Category secondary XP multiplier
  SECONDARY_CATEGORY_MULTIPLIER: 0.3,
};

/**
 * Awards XP for workout completion with difficulty and category bonuses
 * @param userId User ID (string or ObjectId)
 * @param workoutName Name of the completed workout
 * @param difficulty Workout difficulty level
 * @param categories Exercise categories involved in the workout
 * @returns XP award result with level information
 */

export async function awardWorkoutCompletionXp(
  userId: string | Types.ObjectId,
  workoutName: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  categories?: ProgressCategory[]
): Promise<XpAwardResult> {
  // Calculate base XP amount based on difficulty
  let xpAmount = SOMA_XP_REWARDS.WORKOUT_COMPLETION;

  if (difficulty === 'easy') {
    xpAmount = Math.floor(xpAmount * SOMA_XP_REWARDS.WORKOUT_EASY);
  } else if (difficulty === 'hard') {
    xpAmount = Math.floor(xpAmount * SOMA_XP_REWARDS.WORKOUT_HARD);
  }

  const description = `Completed workout: ${workoutName} (${difficulty} difficulty)`;

  // Award XP to primary category if categories provided
  if (categories && categories.length > 0) {
    const primaryCategory = categories[0];
    const result = await awardXp(userId, xpAmount, 'workout_completion', primaryCategory, description);

    // Award secondary XP to additional categories
    if (categories.length > 1) {
      const secondaryXp = Math.floor(xpAmount * SOMA_XP_REWARDS.SECONDARY_CATEGORY_MULTIPLIER);
      for (let i = 1; i < categories.length; i++) {
        await awardXp(userId, secondaryXp, 'workout_completion', categories[i], `Secondary category XP for: ${workoutName}`);
      }
    }

    return result;
  }

  // Award general XP if no categories
  return await awardXp(userId, xpAmount, 'workout_completion', undefined, description);
}

/**
 * Awards XP for exercise mastery and progression
 * @param userId User ID (string or ObjectId)
 * @param exerciseName Name of the exercise
 * @param category Exercise category
 * @param masteryLevel Level of mastery achieved
 * @param bodyweight User's bodyweight for scaling
 * @param reps Number of reps achieved
 * @returns XP award result
 */
export async function awardExerciseXp(
  userId: string | Types.ObjectId,
  exerciseName: string,
  category: ProgressCategory,
  masteryLevel: number = 1,
  bodyweight?: number,
  reps?: number
): Promise<XpAwardResult> {
  // Base XP scales with mastery level
  let xpAmount = SOMA_XP_REWARDS.EXERCISE_PROGRESSION * masteryLevel;

  // Bodyweight scaling for calisthenics (higher bodyweight = more impressive)
  if (bodyweight && reps) {
    const bodyweightBonus = Math.floor((bodyweight - 70) * 0.1 * reps);
    xpAmount += Math.max(0, bodyweightBonus);
  }

  const description = `Exercise progression: ${exerciseName} (Level ${masteryLevel})${reps ? ` - ${reps} reps` : ''}${bodyweight ? ` @ ${bodyweight}kg` : ''}`;

  return await awardXp(userId, xpAmount, 'exercise_progression', category, description);
}

/**
 * Awards XP for achieving exercise mastery milestones
 * @param userId User ID (string or ObjectId)
 * @param exerciseName Name of the exercise mastered
 * @param category Exercise category
 * @param milestoneType Type of milestone achieved
 * @returns XP award result
 */
export async function awardExerciseMasteryXp(
  userId: string | Types.ObjectId,
  exerciseName: string,
  category: ProgressCategory,
  milestoneType: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze'
): Promise<XpAwardResult> {
  // XP scales with milestone level
  const milestoneMultipliers = {
    bronze: 1.0,
    silver: 1.5,
    gold: 2.0,
    platinum: 3.0
  };

  const xpAmount = Math.floor(SOMA_XP_REWARDS.EXERCISE_MASTERY * milestoneMultipliers[milestoneType]);
  const description = `Exercise mastery: ${exerciseName} (${milestoneType.charAt(0).toUpperCase() + milestoneType.slice(1)} level)`;

  return await awardXp(userId, xpAmount, 'exercise_mastery', category, description);
}

/**
 * Calculate XP for a set based on exercise difficulty and performance
 * @param exerciseDifficulty Exercise difficulty rating (1-10)
 * @param reps Number of reps performed
 * @param holdTime Hold time in seconds (for isometric exercises)
 * @param bodyweight User's bodyweight
 * @returns Calculated XP amount
 */
export function calculateSetXp(
  exerciseDifficulty: number,
  reps?: number,
  holdTime?: number,
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

  // Bodyweight scaling (heavier = more impressive for bodyweight exercises)
  if (bodyweight && bodyweight > 70) {
    const bodyweightBonus = (bodyweight - 70) * 0.05;
    baseXp += bodyweightBonus;
  }

  return Math.floor(baseXp);
}