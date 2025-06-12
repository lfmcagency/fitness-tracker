// src/lib/xp/index.ts
import { Types } from 'mongoose';
import { getUserProgress } from './calculations';
import { ProgressEventContract, XpAwardResult, AchievementEventContract } from '@/types/api/progressResponses';
import { ProgressCategory } from '@/lib/category-progress';

/**
 * Main Progress domain event handler
 * Receives events from Ethos, awards XP, checks thresholds, fires Achievement events
 */

// XP calculation rules based on task context
const XP_RULES = {
  // Base amounts by source
  BASE_XP: {
    'task_completion': 10 as number,
    'meal_logged': 5 as number,
    'workout_completion': 50 as number,
    'exercise_progression': 25 as number,
  },
  
  // Streak multipliers
  STREAK_BONUS: 2, // +2 XP per day in streak
  MAX_STREAK_BONUS: 50,
  
  // Milestone bonuses
  MILESTONES: {
    '7_day_streak': 25,
    '30_day_streak': 100,
    '100_day_streak': 500,
    '50_completions': 75,
    '100_completions': 200,
    'macro_80_percent': 15,
    'macro_100_percent': 25,
  },
} as const;

// Achievement thresholds Progress monitors
const ACHIEVEMENT_THRESHOLDS = {
  XP: [1000, 5000, 10000, 25000, 50000],
  LEVEL: [10, 20, 30, 50, 75, 100],
} as const;

/**
 * Main event handler - receives contract from Ethos
 */
export async function handleProgressEvent(contract: ProgressEventContract): Promise<XpAwardResult> {
  console.log(`[Progress] Handling event ${contract.eventId}:`, contract);
  
  const userId = new Types.ObjectId(contract.userId);
  const userProgress = await getUserProgress(userId);
  
  // Store previous values for comparison
  const previousXp = userProgress.totalXp;
  const previousLevel = userProgress.level;
  const previousCategoryXp = contract.category ? userProgress.categoryXp[contract.category] : 0;
  
  // Calculate XP amount based on contract
  const xpAmount = calculateXpFromContract(contract);
  
  // Award XP to user
  const leveledUp = await userProgress.addXp(
    xpAmount,
    contract.source,
    contract.category,
    buildDescription(contract)
  );
  
  // Build result
  const result: XpAwardResult = {
    xpAwarded: xpAmount,
    totalXp: userProgress.totalXp,
    currentLevel: userProgress.level,
    leveledUp,
    xpToNextLevel: userProgress.getXpToNextLevel(),
  };
  
  // Add category progress if applicable
  if (contract.category) {
    const categoryLeveledUp = userProgress.categoryProgress[contract.category].level > 
      userProgress.calculateLevel(previousCategoryXp);
    
    result.categoryProgress = {
      category: contract.category,
      xp: userProgress.categoryXp[contract.category],
      level: userProgress.categoryProgress[contract.category].level,
      leveledUp: categoryLeveledUp,
    };
  }
  
  // Check for achievement thresholds and fire events
  const achievementEvents = checkAchievementThresholds(
    userId.toString(),
    previousXp,
    userProgress.totalXp,
    previousLevel,
    userProgress.level
  );
  
  if (achievementEvents.length > 0) {
    result.achievementsUnlocked = achievementEvents.map(e => e.achievementId);
    // Fire achievement events (async, don't wait)
    achievementEvents.forEach(event => fireAchievementEvent(event));
  }
  
  console.log(`[Progress] Event ${contract.eventId} complete: +${xpAmount} XP`);
  return result;
}

/**
 * Calculate XP amount from contract context
 */
function calculateXpFromContract(contract: ProgressEventContract): number {
  let xp = XP_RULES.BASE_XP[contract.source as keyof typeof XP_RULES.BASE_XP] || 10;
  
  // Streak bonus
  if (contract.streakCount > 0) {
    const streakBonus = Math.min(
      contract.streakCount * XP_RULES.STREAK_BONUS,
      XP_RULES.MAX_STREAK_BONUS
    );
    xp += streakBonus;
  }
  
  // Milestone bonus
  if (contract.milestoneHit) {
    const milestoneBonus = XP_RULES.MILESTONES[contract.milestoneHit as keyof typeof XP_RULES.MILESTONES];
    if (milestoneBonus) xp += milestoneBonus;
  }
  
  // Current metric bonus (80% vs 100% macros)
  if (contract.currentMetric) {
    const metricBonus = XP_RULES.MILESTONES[contract.currentMetric as keyof typeof XP_RULES.MILESTONES];
    if (metricBonus) xp += metricBonus;
  }
  
  // Previous metric adjustment (80% → 100% same day)
  if (contract.previousMetric && contract.currentMetric) {
    const prevBonus = XP_RULES.MILESTONES[contract.previousMetric as keyof typeof XP_RULES.MILESTONES] || 0;
    xp -= prevBonus; // Remove previous bonus, current metric bonus already added
  }
  
  // Soma-specific bonuses
  if (contract.metadata?.difficulty) {
    const difficultyMultiplier = {
      'easy': 0.75,
      'medium': 1.0,
      'hard': 1.5,
    }[contract.metadata.difficulty];
    xp = Math.floor(xp * difficultyMultiplier);
  }
  
  return Math.max(1, xp); // Minimum 1 XP
}

/**
 * Check if XP/level thresholds were crossed and create achievement events
 */
function checkAchievementThresholds(
  userId: string,
  previousXp: number,
  newXp: number,
  previousLevel: number,
  newLevel: number
): AchievementEventContract[] {
  const events: AchievementEventContract[] = [];
  
  // Check XP thresholds
  for (const threshold of ACHIEVEMENT_THRESHOLDS.XP) {
    if (previousXp < threshold && newXp >= threshold) {
      events.push({
        userId,
        achievementId: `xp_milestone_${threshold}`,
        achievementType: 'progress',
        triggeredBy: 'xp_threshold',
        currentValue: newXp,
      });
    }
  }
  
  // Check level thresholds
  for (const threshold of ACHIEVEMENT_THRESHOLDS.LEVEL) {
    if (previousLevel < threshold && newLevel >= threshold) {
      events.push({
        userId,
        achievementId: `level_milestone_${threshold}`,
        achievementType: 'progress',
        triggeredBy: 'level_threshold',
        currentValue: newLevel,
      });
    }
  }
  
  return events;
}

/**
 * Fire achievement event (async, fire-and-forget)
 */
async function fireAchievementEvent(event: AchievementEventContract): Promise<void> {
  try {
    console.log(`[Progress] Firing achievement event:`, event);
    // TODO: Call achievement system when it's built
    // await fetch('/api/achievements/unlock', { method: 'POST', body: JSON.stringify(event) });
  } catch (error) {
    console.error(`[Progress] Failed to fire achievement event:`, error);
    // Log for reconstruction later
  }
}

/**
 * Build description for XP transaction
 */
function buildDescription(contract: ProgressEventContract): string {
  let desc = contract.source.replace('_', ' ');
  
  if (contract.streakCount > 0) {
    desc += ` (${contract.streakCount} day streak)`;
  }
  
  if (contract.milestoneHit) {
    desc += ` - ${contract.milestoneHit.replace('_', ' ')} milestone!`;
  }
  
  if (contract.currentMetric) {
    desc += ` - ${contract.currentMetric.replace('_', ' ')}`;
  }
  
  return desc;
}