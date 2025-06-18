// src/lib/xp/index.ts
import { Types } from 'mongoose';
import { getUserProgress } from './calculations';
import { XpAwardResult } from '@/types/api/progressResponses';
import { ProgressContract, TaskEventContext, MealEventContext, WeightEventContext, FoodEventContext } from '@/lib/event-coordinator/types';
import { calculateTaskCompletionXp } from './ethos';
import { calculateMealLoggingXp, calculateMacroGoalXp } from './trophe';
import UserProgress from '@/models/UserProgress';

/**
 * SIMPLIFIED PROGRESS EVENT HANDLER
 * 
 * Receives simple domain contexts from coordinator and awards/subtracts XP
 * Handles achievement threshold detection and level change monitoring
 * 
 * Replaces the old complex rich contract system with clean, simple processing
 */

/**
 * Main progress event handler - the only function coordinator needs to call
 */
export async function handleProgressEvent(contract: ProgressContract): Promise<XpAwardResult> {
  const { token, userId, source, action, context, timestamp } = contract;
  
  console.log(`🎯 [PROGRESS] Processing ${source}_${action} | ${token}`);
  
  try {
    const userObjectId = new Types.ObjectId(userId);
    
    // Get user progress document
    const userProgress = await getUserProgress(userObjectId);
    
    // Store previous state for level change detection and achievement thresholds
    const previousState = {
      level: userProgress.level,
      totalXp: userProgress.totalXp,
      achievements: [...userProgress.achievements],
      pendingAchievements: [...userProgress.pendingAchievements]
    };
    
    // Calculate XP amount based on domain and action
    const isReverse = action.startsWith('reverse_');
    let xpAmount = calculateXpFromContext(source, action, context);
    
    console.log(`💰 [PROGRESS] Calculated XP: ${isReverse ? '-' : '+'}${Math.abs(xpAmount)} for ${source}_${action}`);
    
    // Award or subtract XP based on action type
    const category = mapSourceToCategory(source);
    const description = buildDescription(source, action, context);
    let leveledUp: boolean;
    
    if (isReverse) {
      // Use subtractXp method for clean reversal (prevents XP farming)
      leveledUp = await userProgress.subtractXp(
        Math.abs(xpAmount), // Always positive amount for subtraction
        action.replace('reverse_', ''), // Remove reverse prefix for source
        category,
        description
      );
      xpAmount = -Math.abs(xpAmount); // Make sure result shows negative
    } else {
      // Use existing addXp method for forward actions
      leveledUp = await userProgress.addXp(
        xpAmount,
        `${source}_${action}`,
        category,
        description
      );
    }
    
    console.log(`💾 [PROGRESS] XP ${isReverse ? 'subtracted' : 'awarded'}: ${Math.abs(xpAmount)} | Level ${userProgress.level} | ${token}`);
    
    // Build basic result
    const result: XpAwardResult = {
      xpAwarded: xpAmount,
      totalXp: userProgress.totalXp,
      currentLevel: userProgress.level,
      leveledUp,
      xpToNextLevel: userProgress.getXpToNextLevel()
    };
    
    // Add category progress if applicable
    if (category) {
      result.categoryProgress = {
        category,
        xp: userProgress.categoryXp[category],
        level: userProgress.categoryProgress[category].level,
        leveledUp: leveledUp && !isReverse // Only show category level up for forward actions
      };
    }
    
    // For forward actions only: Check achievement thresholds
    if (!isReverse) {
      const achievementsUnlocked = await checkAchievementThresholds(
        previousState,
        userProgress,
        context,
        token
      );
      
      if (achievementsUnlocked.length > 0) {
        result.achievementsUnlocked = achievementsUnlocked;
        console.log(`🏆 [PROGRESS] Achievements unlocked: ${achievementsUnlocked.join(', ')} | ${token}`);
      }
    }
    
    // TODO: Store simple event log for reversal capability
    // await storeProgressEvent(contract, result);
    
    console.log(`✅ [PROGRESS] Event complete: ${token} (${isReverse ? 'reversed' : 'awarded'} ${Math.abs(xpAmount)} XP, Level ${userProgress.level})`);
    
    return result;
    
  } catch (error) {
    console.error(`💥 [PROGRESS] Event failed: ${token}`, error);
    throw new Error(`Progress event failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate XP amount from domain context using existing calculation files
 */
function calculateXpFromContext(
  source: string,
  action: string,
  context: TaskEventContext | MealEventContext | WeightEventContext | FoodEventContext
): number {
  
  switch (source) {
    case 'ethos':
      return calculateEthosXp(action, context as TaskEventContext);
    
    case 'trophe':
      return calculateTropheXp(action, context as MealEventContext);
    
    case 'arete':
      return calculateAreteXp(action, context as WeightEventContext);
    
    default:
      console.warn(`Unknown source: ${source}, using default XP`);
      return 10; // Default base XP
  }
}

/**
 * Calculate XP for Ethos (task) events using existing ethos.ts calculations
 */
function calculateEthosXp(action: string, context: TaskEventContext): number {
  if (action === 'task_completed') {
    return calculateTaskCompletionXp(
      'task_completion',
      context.streakCount || 0,
      context.milestoneHit
    );
  }
  
  if (action === 'task_created') {
    return 5; // Small reward for creating tasks
  }
  
  if (action === 'task_deleted') {
    return -5; //  XP reversal for deletion
  }
  
  return 10; // Default task XP
}

/**
 * Calculate XP for Trophe (nutrition) events using existing trophe.ts calculations
 */
function calculateTropheXp(action: string, context: MealEventContext): number {
  if (action === 'meal_created') {
    let xp = calculateMealLoggingXp(); // Base meal logging XP from trophe.ts
    
    // Add macro goal bonus if goals were met
    if (context.macroGoalsMet) {
      const macroXp = calculateMacroGoalXp('macro_80_percent');
      xp += macroXp.baseXp;
    }
    
    // Add milestone bonus
    if (context.milestoneHit) {
      xp += 25; // Milestone bonus
    }
    
    return xp;
  }
  
  if (action === 'meal_deleted') {
    return -5; //  reverse base meal logging XP
  }
  
  if (action === 'food_created') {
    return 10; // Reward for contributing to food database
  }
  
  if (action === 'food_deleted') {
    return -10; //  reverse base food creation XP
  }
  
  return 5; // Default nutrition XP
}

/**
 * Calculate XP for Arete (weight/progress) events
 */
function calculateAreteXp(action: string, context: WeightEventContext): number {
  if (action === 'weight_logged') {
    let xp = 5; // Base weight logging XP
    
    // Add milestone bonus
    if (context.milestoneHit) {
      xp += 15; // Weight tracking milestone
    }
    
    return xp;
  }
  
  if (action === 'weight_deleted') {
    return -5; // reverse base weight logging XP
  }
  
  return 5; // Default weight XP
}

/**
 * Map source to category for category XP tracking
 */
function mapSourceToCategory(source: string): 'core' | 'push' | 'pull' | 'legs' | undefined {
  const mapping: Record<string, 'core' | 'push' | 'pull' | 'legs'> = {
    'ethos': 'core',    // Discipline/habits = core strength
    'trophe': 'push',   // Nutrition = building strength  
    'arete': 'legs'     // Progress tracking = foundation
  };
  
  return mapping[source];
}

/**
 * Build description for XP transaction history
 */
function buildDescription(
  source: string,
  action: string,
  context: TaskEventContext | MealEventContext | WeightEventContext | FoodEventContext
): string {
  let desc = `${source} ${action}`.replace('_', ' ');
  
  // Add context-specific details
  if ('taskName' in context) {
    desc += ` (${context.taskName})`;
    if (context.streakCount && context.streakCount > 0) {
      desc += ` - ${context.streakCount} day streak`;
    }
  } else if ('mealName' in context) {
    desc += ` (${context.mealName})`;
    if (context.macroGoalsMet) {
      desc += ` - macro goals met`;
    }
  } else if ('currentWeight' in context) {
    desc += ` (${context.currentWeight}kg)`;
  }
  
  if ('milestoneHit' in context && context.milestoneHit) {
    desc += ` - ${context.milestoneHit.replace('_', ' ')} milestone!`;
  }
  
  return desc;
}

/**
 * Check if XP/level changes crossed achievement thresholds
 * Adds achievements to pendingAchievements for manual claiming later
 */
async function checkAchievementThresholds(
  previousState: any,
  userProgress: any,
  context: any,
  token: string
): Promise<string[]> {
  const achievementsUnlocked: string[] = [];
  
  // XP threshold achievements
  const XP_THRESHOLDS = [1000, 2500, 5000, 10000, 25000, 50000, 100000];
  for (const threshold of XP_THRESHOLDS) {
    if (previousState.totalXp < threshold && userProgress.totalXp >= threshold) {
      const achievementId = `xp_milestone_${threshold}`;
      await userProgress.addPendingAchievement(achievementId);
      achievementsUnlocked.push(achievementId);
      console.log(`🎯 [PROGRESS] XP milestone reached: ${threshold} XP | ${token}`);
    }
  }
  
  // Level threshold achievements
  const LEVEL_THRESHOLDS = [5, 10, 20, 30, 50, 75, 100];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (previousState.level < threshold && userProgress.level >= threshold) {
      const achievementId = `level_milestone_${threshold}`;
      await userProgress.addPendingAchievement(achievementId);
      achievementsUnlocked.push(achievementId);
      console.log(`📈 [PROGRESS] Level milestone reached: Level ${threshold} | ${token}`);
    }
  }
  
  // Domain-specific milestone achievements from context
  if ('milestoneHit' in context && context.milestoneHit) {
    const achievementId = `milestone_${context.milestoneHit}`;
    if (!userProgress.pendingAchievements.includes(achievementId)) {
      await userProgress.addPendingAchievement(achievementId);
      achievementsUnlocked.push(achievementId);
      console.log(`🏅 [PROGRESS] Domain milestone reached: ${context.milestoneHit} | ${token}`);
    }
  }
  
  // TODO: Fire achievement notification events (commented out until achievement system ready)
  if (achievementsUnlocked.length > 0) {
    for (const achievementId of achievementsUnlocked) {
      // await fireAchievementNotification({
      //   userId: userProgress.userId.toString(),
      //   achievementId,
      //   triggeredBy: achievementId.includes('xp_') ? 'xp_threshold' : 
      //               achievementId.includes('level_') ? 'level_threshold' : 'milestone',
      //   currentValue: achievementId.includes('xp_') ? userProgress.totalXp : 
      //                achievementId.includes('level_') ? userProgress.level : 1,
      //   token
      // });
      
      console.log(`🔔 [PROGRESS] Achievement notification ready: ${achievementId} | ${token}`);
    }
  }
  
  return achievementsUnlocked;
}

/**
 * Fire achievement notification to achievement system (future implementation)
 */
// async function fireAchievementNotification(event: {
//   userId: string;
//   achievementId: string;
//   triggeredBy: string;
//   currentValue: number;
//   token: string;
// }): Promise<void> {
//   try {
//     console.log(`🚀 [PROGRESS] Firing achievement notification:`, event);
//     
//     // Call achievement system API when ready
//     // await fetch('/api/achievements/unlock', {
//     //   method: 'POST',
//     //   headers: { 'Content-Type': 'application/json' },
//     //   body: JSON.stringify(event)
//     // });
//     
//   } catch (error) {
//     console.error(`💥 [PROGRESS] Failed to fire achievement notification:`, error);
//     // Don't throw - achievement failures shouldn't break XP awarding
//   }
// }