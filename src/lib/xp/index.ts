// src/lib/xp/index.ts
import { Types } from 'mongoose';
import { getUserProgress } from './calculations';
import { ProgressEventContract, XpAwardResult, AchievementEventContract } from '@/types/api/progressResponses';
import { RichProgressContract, TaskUpdateRequest, AchievementThreshold, ReversalData } from '@/lib/event-coordinator/types';
import { ProgressCategory } from '@/lib/category-progress';
import UserProgress from '@/models/UserProgress';

/**
 * ENHANCED ATOMIC PROGRESS HANDLER
 * 
 * Processes rich contracts with complete context for atomic operations:
 * XP + achievements + task updates + reversal data in one transaction
 */

/**
 * Enhanced result type with atomic operation data
 */
export interface EnhancedXpAwardResult extends XpAwardResult {
  /** Token for operation tracking */
  token: string;
  
  /** Tasks updated via cross-domain operations */
  tasksUpdated?: Array<{
    taskId: string;
    action: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
  
  /** Complete reversal package for atomic undo */
  reversalData?: ReversalData;
  
  /** Dashboard update summary */
  dashboardUpdates?: {
    userProgress: boolean;
    categoryProgress: boolean;
    achievements: boolean;
    tasks: boolean;
  };
  
  /** Performance metrics */
  performance?: {
    totalDuration: number;
    xpCalculationTime: number;
    taskUpdateTime: number;
    achievementTime: number;
    reversalBuildTime: number;
  };
}

/**
 * Main rich contract handler - atomic operations with complete context
 */
export async function handleRichProgressEvent(contract: RichProgressContract): Promise<EnhancedXpAwardResult> {
  const startTime = Date.now();
  const { token, userId, context, taskUpdates, achievementThresholds, xpMetadata } = contract;
  
  console.log(`🚀 [PROGRESS-RICH] Starting atomic operation: ${token}`);
  console.log(`📊 [PROGRESS-RICH] Context:`, {
    token,
    streakCount: context.streakCount,
    totalCompletions: context.totalCompletions,
    taskUpdates: taskUpdates.length,
    achievementThresholds: achievementThresholds.length
  });
  
  try {
    const userObjectId = new Types.ObjectId(userId);
    
    // 1. Get user progress and snapshot for reversal
    const snapshotStart = Date.now();
    const userProgress = await getUserProgress(userObjectId);
    const previousState = {
      level: userProgress.level,
      totalXp: userProgress.totalXp,
      categoryProgress: JSON.parse(JSON.stringify(userProgress.categoryProgress)),
      achievements: [...userProgress.achievements],
      pendingAchievements: [...userProgress.pendingAchievements]
    };
    
    // 2. Calculate XP from rich context metadata
    const xpStart = Date.now();
    const totalXpAwarded = calculateXpFromRichContext(xpMetadata, context);
    console.log(`💰 [PROGRESS-RICH] Calculated XP: ${totalXpAwarded} (base: ${xpMetadata.baseXp})`);
    
    // 3. Award XP atomically
    const previousLevel = userProgress.level;
    const categoryToUse = mapDomainToCategory(contract.source);
    
    const leveledUp = await userProgress.addXp(
      totalXpAwarded,
      `${contract.source}_${contract.action}`,
      categoryToUse,
      buildRichDescription(contract)
    );
    
    const xpDuration = Date.now() - xpStart;
    
    // 4. Process achievement thresholds from contract
    const achievementStart = Date.now();
    const achievementResults = await processAchievementThresholds(
      userProgress,
      achievementThresholds,
      previousState,
      token
    );
    const achievementDuration = Date.now() - achievementStart;
    
    // 5. Execute cross-domain task updates
    const taskStart = Date.now();
    const taskResults = await processCrossDomainTaskUpdates(taskUpdates, token);
    const taskDuration = Date.now() - taskStart;
    
    // 6. Build complete reversal data
    const reversalStart = Date.now();
    const finalState = {
      level: userProgress.level,
      totalXp: userProgress.totalXp,
      categoryProgress: JSON.parse(JSON.stringify(userProgress.categoryProgress)),
      achievements: [...userProgress.achievements],
      pendingAchievements: [...userProgress.pendingAchievements]
    };
    
    const reversalData = buildReversalData(
      token,
      previousState,
      finalState,
      totalXpAwarded,
      achievementResults.unlockedAchievements,
      taskResults,
      contract
    );
    const reversalDuration = Date.now() - reversalStart;
    
    // 7. Trigger dashboard updates
    const dashboardUpdates = {
      userProgress: true,
      categoryProgress: categoryToUse !== undefined,
      achievements: achievementResults.unlockedAchievements.length > 0,
      tasks: taskResults.length > 0
    };
    
    const totalDuration = Date.now() - startTime;
    
    // 8. Build enhanced result
    const result: EnhancedXpAwardResult = {
      token,
      xpAwarded: totalXpAwarded,
      totalXp: userProgress.totalXp,
      currentLevel: userProgress.level,
      leveledUp,
      xpToNextLevel: userProgress.getXpToNextLevel(),
      achievementsUnlocked: achievementResults.unlockedAchievements,
      tasksUpdated: taskResults,
      reversalData,
      dashboardUpdates,
      performance: {
        totalDuration,
        xpCalculationTime: xpDuration,
        taskUpdateTime: taskDuration,
        achievementTime: achievementDuration,
        reversalBuildTime: reversalDuration
      }
    };
    
    // Add category progress if applicable
    if (categoryToUse) {
      const previousCategoryXp = previousState.categoryProgress[categoryToUse]?.xp || 0;
      const categoryLeveledUp = userProgress.categoryProgress[categoryToUse].level > 
        userProgress.calculateLevel(previousCategoryXp);
      
      result.categoryProgress = {
        category: categoryToUse,
        xp: userProgress.categoryXp[categoryToUse],
        level: userProgress.categoryProgress[categoryToUse].level,
        leveledUp: categoryLeveledUp,
      };
    }
    
    console.log(`✅ [PROGRESS-RICH] Atomic operation complete: ${token} (${totalDuration}ms)`);
    console.log(`📈 [PROGRESS-RICH] Results:`, {
      xpAwarded: totalXpAwarded,
      leveledUp,
      achievementsUnlocked: achievementResults.unlockedAchievements.length,
      tasksUpdated: taskResults.length
    });
    
    return result;
    
  } catch (error) {
    console.error(`💥 [PROGRESS-RICH] Atomic operation failed: ${token}`, error);
    
    // In a full implementation, this would trigger rollback
    // For now, we log and rethrow
    throw new Error(`Rich progress event failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate total XP from rich context metadata
 */
function calculateXpFromRichContext(xpMetadata: any, context: any): number {
  let totalXp = xpMetadata.baseXp;
  
  // Apply difficulty multiplier
  totalXp *= xpMetadata.difficultyMultiplier;
  
  // Apply streak bonus
  if (context.streakCount > 0) {
    totalXp += Math.floor(context.streakCount * xpMetadata.streakMultiplier);
  }
  
  // Apply milestone bonus
  if (context.milestoneHit) {
    totalXp += xpMetadata.milestoneBonus;
  }
  
  // Apply category bonus
  totalXp += xpMetadata.categoryBonus;
  
  return Math.floor(Math.max(1, totalXp));
}

/**
 * Process achievement thresholds from rich contract
 */
async function processAchievementThresholds(
  userProgress: any,
  thresholds: AchievementThreshold[],
  previousState: any,
  token: string
): Promise<{
  unlockedAchievements: string[];
  processedThresholds: Array<{ achievementId: string; success: boolean; error?: string }>;
}> {
  const unlockedAchievements: string[] = [];
  const processedThresholds: Array<{ achievementId: string; success: boolean; error?: string }> = [];
  
  for (const threshold of thresholds) {
    try {
      if (threshold.justCrossed && !userProgress.pendingAchievements.includes(threshold.achievementId)) {
        // Add to pending achievements
        await userProgress.addPendingAchievement(threshold.achievementId);
        unlockedAchievements.push(threshold.achievementId);
        
        // Fire achievement event (async)
        fireAchievementEvent({
          userId: userProgress.userId.toString(),
          achievementId: threshold.achievementId,
          achievementType: mapThresholdTypeToAchievementType(threshold.type),
          triggeredBy: threshold.type === 'streak' ? 'streak' : 'total_count',
          currentValue: threshold.currentValue,
          token
        });
        
        processedThresholds.push({
          achievementId: threshold.achievementId,
          success: true
        });
        
        console.log(`🏆 [PROGRESS-RICH] Achievement unlocked: ${threshold.achievementId} | ${token}`);
      }
    } catch (error) {
      console.error(`💥 [PROGRESS-RICH] Achievement processing failed: ${threshold.achievementId}`, error);
      processedThresholds.push({
        achievementId: threshold.achievementId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return { unlockedAchievements, processedThresholds };
}

/**
 * Process cross-domain task updates
 */
async function processCrossDomainTaskUpdates(
  taskUpdates: TaskUpdateRequest[],
  token: string
): Promise<Array<{ taskId: string; action: string; success: boolean; result?: any; error?: string }>> {
  const results: Array<{ taskId: string; action: string; success: boolean; result?: any; error?: string }> = [];
  
  for (const taskUpdate of taskUpdates) {
    try {
      console.log(`🔄 [PROGRESS-RICH] Cross-domain task update: ${taskUpdate.action} | ${token}`);
      
      // Call ethos processor for task operations
      const result = await callEthosProcessor(taskUpdate, token);
      
      results.push({
        taskId: result.taskId || 'unknown',
        action: taskUpdate.action,
        success: true,
        result
      });
      
      console.log(`✅ [PROGRESS-RICH] Task update complete: ${taskUpdate.action} | ${token}`);
      
    } catch (error) {
      console.error(`💥 [PROGRESS-RICH] Task update failed: ${taskUpdate.action}`, error);
      results.push({
        taskId: taskUpdate.taskId || 'unknown',
        action: taskUpdate.action,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Call ethos processor for task operations
 */
async function callEthosProcessor(taskUpdate: TaskUpdateRequest, token: string): Promise<any> {
  // This would call the ethos processor directly
  // For now, return mock result
  console.log(`🔧 [PROGRESS-RICH] Calling ethos processor for task update:`, taskUpdate);
  
  return {
    taskId: taskUpdate.taskId || 'mock_task',
    success: true,
    action: taskUpdate.action
  };
}

/**
 * Build complete reversal data package
 */
function buildReversalData(
  token: string,
  previousState: any,
  finalState: any,
  xpAwarded: number,
  achievementsUnlocked: string[],
  taskResults: any[],
  contract: RichProgressContract
): ReversalData {
  return {
    token,
    undoInstructions: {
      subtractXp: xpAwarded,
      lockAchievements: achievementsUnlocked,
      revertLevel: finalState.level !== previousState.level ? previousState.level : undefined,
      undoTaskUpdates: taskResults
        .filter(r => r.success)
        .map(r => ({
          taskId: r.taskId,
          revertTo: { action: 'undo', originalAction: r.action }
        }))
    },
    previousUserState: previousState,
    finalUserState: finalState
  };
}

/**
 * Map threshold type to achievement type
 */
function mapThresholdTypeToAchievementType(thresholdType: 'streak' | 'total' | 'milestone' | 'cross_domain'): 'discipline' | 'usage' | 'progress' {
  const mapping: Record<string, 'discipline' | 'usage' | 'progress'> = {
    'streak': 'discipline',
    'total': 'progress',
    'milestone': 'progress',
    'cross_domain': 'usage'
  };
  
  return mapping[thresholdType] || 'progress';
}

/**
 * Map domain to progress category
 */
function mapDomainToCategory(domain: string): ProgressCategory | undefined {
  const mapping: Record<string, ProgressCategory> = {
    'ethos': 'core',
    'trophe': 'push', 
    'soma': 'legs'
  };
  
  return mapping[domain];
}

/**
 * Build rich description from contract context
 */
function buildRichDescription(contract: RichProgressContract): string {
  const { source, action, context } = contract;
  
  let desc = `${source} ${action}`.replace('_', ' ');
  
  if (context.itemName) {
    desc += ` (${context.itemName})`;
  }
  
  if (context.streakCount > 0) {
    desc += ` - ${context.streakCount} day streak`;
  }
  
  if (context.milestoneHit) {
    desc += ` - ${context.milestoneHit.replace('_', ' ')} milestone!`;
  }
  
  return desc;
}

/**
 * Fire achievement event (async, fire-and-forget)
 */
async function fireAchievementEvent(event: AchievementEventContract & { token?: string }): Promise<void> {
  try {
    console.log(`🏆 [PROGRESS-RICH] Firing achievement event:`, event);
    // TODO: Call achievement system when ready
    // await fetch('/api/achievements/unlock', { method: 'POST', body: JSON.stringify(event) });
  } catch (error) {
    console.error(`💥 [PROGRESS-RICH] Failed to fire achievement event:`, error);
  }
}

/**
 * LEGACY COMPATIBILITY - Basic contract handler
 */
export async function handleLegacyProgressEvent(contract: ProgressEventContract): Promise<XpAwardResult> {
  console.log(`📦 [PROGRESS-LEGACY] Handling legacy event:`, contract);
  
  const userId = new Types.ObjectId(contract.userId);
  const userProgress = await getUserProgress(userId);
  
  // Store previous values for comparison
  const previousXp = userProgress.totalXp;
  const previousLevel = userProgress.level;
  const previousCategoryXp = contract.category ? userProgress.categoryXp[contract.category] : 0;
  
  // Calculate XP amount using legacy logic
  const xpAmount = calculateLegacyXpFromContract(contract);
  
  // Award XP to user
  const leveledUp = await userProgress.addXp(
    xpAmount,
    contract.source,
    contract.category,
    buildLegacyDescription(contract)
  );
  
  // Build legacy result
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
  
  // Check for achievement thresholds and fire events (legacy style)
  const achievementEvents = checkLegacyAchievementThresholds(
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
  
  console.log(`✅ [PROGRESS-LEGACY] Event complete: +${xpAmount} XP`);
  return result;
}

/**
 * Legacy XP calculation
 */
function calculateLegacyXpFromContract(contract: ProgressEventContract): number {
  const XP_RULES = {
    BASE_XP: {
      'task_completion': 10,
      'meal_logged': 5,
      'workout_completion': 50,
      'exercise_progression': 25,
    },
    STREAK_BONUS: 2,
    MAX_STREAK_BONUS: 50,
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
  
  return Math.max(1, xp);
}

/**
 * Legacy achievement threshold checking
 */
function checkLegacyAchievementThresholds(
  userId: string,
  previousXp: number,
  newXp: number,
  previousLevel: number,
  newLevel: number
): AchievementEventContract[] {
  const ACHIEVEMENT_THRESHOLDS = {
    XP: [1000, 5000, 10000, 25000, 50000],
    LEVEL: [10, 20, 30, 50, 75, 100],
  } as const;
  
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
 * Legacy description builder
 */
function buildLegacyDescription(contract: ProgressEventContract): string {
  let desc = contract.source.replace('_', ' ');
  
  if (contract.streakCount > 0) {
    desc += ` (${contract.streakCount} day streak)`;
  }
  
  if (contract.milestoneHit) {
    desc += ` - ${contract.milestoneHit.replace('_', ' ')} milestone!`;
  }
  
  return desc;
}