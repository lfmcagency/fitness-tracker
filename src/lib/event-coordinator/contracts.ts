/**
 * RICH EVENT CONTRACT BUILDERS
 * 
 * Uses shared utilities to build comprehensive contracts with complete context,
 * cross-domain updates, achievement thresholds, and reversal data.
 */

import { 
  BaseEventData, 
  RichProgressContract, 
  RichEventContext, 
  TaskUpdateRequest,
  AchievementThreshold,
  ReversalData,
  ENHANCED_DOMAIN_XP_CONFIG 
} from './types';
import { 
  calculateNutritionContext,
  calculateTaskContext,
  calculateWorkoutContext,
  MILESTONE_THRESHOLDS 
} from '@/lib/shared-utilities';

/**
 * Build comprehensive progress contract from event data
 * This is the main function coordinator uses to create rich contracts
 */
export function buildRichProgressContract(
  eventData: BaseEventData,
  richContext: RichEventContext,
  taskUpdates: TaskUpdateRequest[] = [],
  achievementThresholds: AchievementThreshold[] = []
): RichProgressContract {
  
  const xpConfig = ENHANCED_DOMAIN_XP_CONFIG[eventData.source] || ENHANCED_DOMAIN_XP_CONFIG.ethos;
  
  // Calculate XP metadata based on context
  const xpMetadata = {
    taskId: (eventData as any).taskId ?? (richContext as any).taskId ?? null,
    baseXp: xpConfig.baseXp,
    streakMultiplier: xpConfig.streakMultiplier,
    milestoneBonus: xpConfig.milestoneBonus,
    difficultyMultiplier: xpConfig.difficultyMultipliers[richContext.difficulty || 'medium'],
    categoryBonus: richContext.isSystemItem ? xpConfig.systemItemBonus : 0
  };
  
  // Prepare reversal data structure
  const reversalData = {
    token: eventData.token,
    undoInstructions: {
      subtractXp: calculateTotalXp(xpMetadata, richContext),
      lockAchievements: achievementThresholds.filter(t => t.justCrossed).map(t => t.achievementId),
      undoTaskUpdates: taskUpdates.map(update => ({
        taskId: update.taskId || 'unknown',
        revertTo: { action: 'undo', originalUpdate: update }
      }))
    },
    snapshotData: {
      userStateBeforeEvent: null, // Will be populated by Progress system
      eventContext: richContext,
      crossDomainUpdates: taskUpdates
    }
  };
  
  return {
    token: eventData.token,
    eventId: Date.now(),
    source: eventData.source,
    action: eventData.action,
    userId: eventData.userId,
    
    context: richContext,
    taskUpdates,
    achievementThresholds,
    xpMetadata,
    reversalData
  };
}

/**
 * Calculate total XP from metadata and context
 */
function calculateTotalXp(xpMetadata: any, context: RichEventContext): number {
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
  
  return Math.floor(totalXp);
}

/**
 * ETHOS CONTRACT BUILDERS
 */
export const EthosContracts = {
  /**
   * Build task completion contract with rich context
   */
  async buildTaskCompletionContract(
    eventData: BaseEventData,
    taskData: any,
    allUserTasks: any[],
    completionHistory: Date[]
  ): Promise<RichProgressContract> {
    
    // Calculate rich context using shared utilities
    const taskContext = calculateTaskContext(taskData, allUserTasks, completionHistory);
    
    // Add the required taskName property to match expected type
    const enhancedTaskContext = {
      ...taskContext,
      taskName: taskData.name || 'Task'
    };
    
    const richContext: RichEventContext = {
      streakCount: taskContext.streakCount,
      totalCompletions: taskContext.totalCompletions,
      itemName: taskData.name || 'Task', // Use taskData.name instead of non-existent taskContext.taskName
      domainCategory: taskContext.domainCategory,
      labels: taskContext.labels,
      difficulty: 'medium', // Could be enhanced based on task properties
      isSystemItem: taskContext.isSystemTask,
      taskContext: enhancedTaskContext
    };
    
    // Detect milestones
    const milestoneHit = detectTaskMilestones(taskContext);
    if (milestoneHit) {
      richContext.milestoneHit = milestoneHit.achievementId;
      richContext.milestoneValue = milestoneHit.currentValue;
    }
    
    // Check achievement thresholds
    const achievementThresholds = checkTaskAchievementThresholds(taskContext);
    
    // No cross-domain task updates for ethos (ethos IS the task domain)
    const taskUpdates: TaskUpdateRequest[] = [];
    
    return buildRichProgressContract(eventData, richContext, taskUpdates, achievementThresholds);
  },

  /**
   * Build task creation contract
   */
  buildTaskCreationContract(
    eventData: BaseEventData,
    taskData: any
  ): RichProgressContract {
    
    const richContext: RichEventContext = {
      streakCount: 0,
      totalCompletions: 0,
      itemName: taskData.name,
      domainCategory: taskData.domainCategory,
      labels: taskData.labels,
      difficulty: 'easy', // Task creation is easier than completion
      isSystemItem: taskData.isSystemTask || false,
      taskContext: {
        taskName: taskData.name,
        bestStreak: 0,
        domainTasksTotal: 1, // This is a new task
        domainTasksCompleted: 0
      }
    };
    
    // Task creation typically doesn't trigger major achievements
    const achievementThresholds: AchievementThreshold[] = [];
    
    return buildRichProgressContract(eventData, richContext, [], achievementThresholds);
  }
};

/**
 * NUTRITION CONTRACT BUILDERS (TROPHE)
 */
export const NutritionContracts = {
  /**
   * Build meal logging contract with rich nutrition context
   */
  buildMealLoggingContract(
    eventData: BaseEventData,
    mealData: any,
    allMealsToday: any[],
    macroGoals: any,
    nutritionStreak: number,
    totalMeals: number
  ): RichProgressContract {
    
    // Calculate nutrition context using shared utilities
    const nutritionContext = calculateNutritionContext(
      eventData.userId,
      new Date().toISOString().split('T')[0],
      allMealsToday,
      macroGoals
    );
    
    const richContext: RichEventContext = {
      streakCount: nutritionStreak,
      totalCompletions: totalMeals,
      itemName: mealData.name || 'Meal',
      domainCategory: 'trophe',
      labels: ['nutrition', 'meal_tracking'],
      difficulty: 'medium',
      isSystemItem: false,
      nutritionContext
    };
    
    // Detect nutrition milestones
    const milestoneHit = detectNutritionMilestones(nutritionContext, nutritionStreak, totalMeals);
    if (milestoneHit) {
      richContext.milestoneHit = milestoneHit.achievementId;
      richContext.milestoneValue = milestoneHit.currentValue;
    }
    
    // Check achievement thresholds
    const achievementThresholds = checkNutritionAchievementThresholds(
      nutritionContext,
      nutritionStreak,
      totalMeals
    );
    
    // Cross-domain: Update nutrition tracking task in ethos
    const taskUpdates: TaskUpdateRequest[] = [];
    
    // If macro progress is good, complete daily nutrition task
    if (nutritionContext.dailyMacroProgress.total >= 80) {
      taskUpdates.push({
        domainCategory: 'trophe',
        labels: ['daily_nutrition_tracking'],
        action: 'complete',
        taskData: {
          progress: nutritionContext.dailyMacroProgress.total,
          completed: true,
          completionDate: new Date().toISOString(),
          description: `Hit ${nutritionContext.dailyMacroProgress.total}% macro targets`
        },
        source: 'trophe',
        token: eventData.token
      });
    }
    
    return buildRichProgressContract(eventData, richContext, taskUpdates, achievementThresholds);
  },

  /**
   * Build macro target achievement contract
   */
  buildMacroTargetContract(
    eventData: BaseEventData,
    macroProgress: any,
    nutritionStreak: number
  ): RichProgressContract {
    
    const richContext: RichEventContext = {
      streakCount: nutritionStreak,
      totalCompletions: 0, // This is about daily achievement, not total count
      itemName: 'Macro Target Achievement',
      domainCategory: 'trophe',
      labels: ['nutrition', 'macro_targets'],
      difficulty: macroProgress.total >= 100 ? 'hard' : 'medium',
      isSystemItem: false,
      milestoneHit: macroProgress.total >= 100 ? 'perfect_macros' : 'macro_80',
      milestoneValue: macroProgress.total
    };
    
    // Perfect macro achievement
    const achievementThresholds: AchievementThreshold[] = [];
    if (macroProgress.total >= 100) {
      achievementThresholds.push({
        achievementId: 'perfect_macro_day',
        type: 'milestone',
        threshold: 100,
        currentValue: macroProgress.total,
        justCrossed: true,
        bonusXp: 50
      });
    }
    
    return buildRichProgressContract(eventData, richContext, [], achievementThresholds);
  }
};

/**
 * WORKOUT CONTRACT BUILDERS (SOMA) - Future
 */
export const SomaContracts = {
  /**
   * Build workout completion contract
   */
  buildWorkoutCompletionContract(
    eventData: BaseEventData,
    workoutData: any,
    exercises: any[],
    userProgress: any
  ): RichProgressContract {
    
    // Calculate workout context using shared utilities
    const workoutContext = calculateWorkoutContext(workoutData, exercises, userProgress);
    
    const richContext: RichEventContext = {
      streakCount: userProgress.workoutStreak || 0,
      totalCompletions: workoutContext.totalWorkouts,
      itemName: `Workout (${workoutContext.exerciseCount} exercises)`,
      domainCategory: 'soma',
      labels: ['workout', ...workoutContext.categories],
      difficulty: workoutContext.difficulty,
      isSystemItem: false,
      workoutContext
    };
    
    // Detect workout milestones
    const milestoneHit = detectWorkoutMilestones(workoutContext);
    if (milestoneHit) {
      richContext.milestoneHit = milestoneHit.achievementId;
      richContext.milestoneValue = milestoneHit.currentValue;
    }
    
    // Check achievement thresholds
    const achievementThresholds = checkWorkoutAchievementThresholds(workoutContext);
    
    // Cross-domain: Update workout tracking task in ethos
    const taskUpdates: TaskUpdateRequest[] = [{
      domainCategory: 'soma',
      labels: ['daily_workout'],
      action: 'complete',
      taskData: {
        completed: true,
        completionDate: new Date().toISOString(),
        description: `Completed ${workoutContext.exerciseCount}-exercise workout`
      },
      source: 'soma',
      token: eventData.token
    }];
    
    return buildRichProgressContract(eventData, richContext, taskUpdates, achievementThresholds);
  }
};

/**
 * MILESTONE DETECTION UTILITIES
 */

function detectTaskMilestones(taskContext: any): { achievementId: string; currentValue: number } | null {
  const { streakCount, totalCompletions } = taskContext;
  
  // Check streak milestones
  if (MILESTONE_THRESHOLDS.STREAK.includes(streakCount)) {
    return {
      achievementId: `task_streak_${streakCount}`,
      currentValue: streakCount
    };
  }
  
  // Check completion milestones
  if (MILESTONE_THRESHOLDS.USAGE.includes(totalCompletions)) {
    return {
      achievementId: `task_completion_${totalCompletions}`,
      currentValue: totalCompletions
    };
  }
  
  return null;
}

function detectNutritionMilestones(
  nutritionContext: any,
  streak: number,
  totalMeals: number
): { achievementId: string; currentValue: number } | null {
  
  // Perfect macro day
  if (nutritionContext.dailyMacroProgress.total >= 100) {
    return {
      achievementId: 'perfect_macro_day',
      currentValue: nutritionContext.dailyMacroProgress.total
    };
  }
  
  // Nutrition streak milestones
  if (MILESTONE_THRESHOLDS.STREAK.includes(streak as 3 | 7 | 14 | 30 | 50 | 100)) {
    return {
      achievementId: `nutrition_streak_${streak}`,
      currentValue: streak
    };
  }
  
  // Meal count milestones
  if (MILESTONE_THRESHOLDS.USAGE.includes(totalMeals as 10 | 25 | 50 | 100 | 250 | 500 | 1000 | 2500 | 5000)) {
    return {
      achievementId: `meals_logged_${totalMeals}`,
      currentValue: totalMeals
    };
  }
  
  return null;
}

function detectWorkoutMilestones(workoutContext: any): { achievementId: string; currentValue: number } | null {
  const { totalWorkouts } = workoutContext;
  
  // Workout count milestones
  if (MILESTONE_THRESHOLDS.USAGE.includes(totalWorkouts)) {
    return {
      achievementId: `workouts_completed_${totalWorkouts}`,
      currentValue: totalWorkouts
    };
  }
  
  return null;
}

/**
 * ACHIEVEMENT THRESHOLD CHECKERS
 */

function checkTaskAchievementThresholds(taskContext: any): AchievementThreshold[] {
  const thresholds: AchievementThreshold[] = [];
  const { streakCount, totalCompletions } = taskContext;
  
  // Check if we just hit a streak milestone
  if (MILESTONE_THRESHOLDS.STREAK.includes(streakCount)) {
    thresholds.push({
      achievementId: `discipline_streak_${streakCount}`,
      type: 'streak',
      threshold: streakCount,
      currentValue: streakCount,
      justCrossed: true,
      bonusXp: 25
    });
  }
  
  // Check if we just hit a completion milestone
  if (MILESTONE_THRESHOLDS.USAGE.includes(totalCompletions)) {
    thresholds.push({
      achievementId: `discipline_completion_${totalCompletions}`,
      type: 'total',
      threshold: totalCompletions,
      currentValue: totalCompletions,
      justCrossed: true,
      bonusXp: 50
    });
  }
  
  return thresholds;
}

function checkNutritionAchievementThresholds(
  nutritionContext: any,
  streak: number,
  totalMeals: number
): AchievementThreshold[] {
  const thresholds: AchievementThreshold[] = [];
  
  // Perfect macro achievement
  if (nutritionContext.dailyMacroProgress.total >= 100) {
    thresholds.push({
      achievementId: 'perfectionist_nutrition',
      type: 'milestone',
      threshold: 100,
      currentValue: nutritionContext.dailyMacroProgress.total,
      justCrossed: true,
      bonusXp: 50
    });
  }
  
  // Meal logging milestones
  if (MILESTONE_THRESHOLDS.USAGE.includes(totalMeals as 10 | 25 | 50 | 100 | 250 | 500 | 1000 | 2500 | 5000)) {
    thresholds.push({
      achievementId: `nutrition_tracker_${totalMeals}`,
      type: 'total',
      threshold: totalMeals,
      currentValue: totalMeals,
      justCrossed: true,
      bonusXp: 30
    });
  }
  
  return thresholds;
}

function checkWorkoutAchievementThresholds(workoutContext: any): AchievementThreshold[] {
  const thresholds: AchievementThreshold[] = [];
  const { totalWorkouts } = workoutContext;
  
  // Workout completion milestones
  if (MILESTONE_THRESHOLDS.USAGE.includes(totalWorkouts)) {
    thresholds.push({
      achievementId: `warrior_training_${totalWorkouts}`,
      type: 'total',
      threshold: totalWorkouts,
      currentValue: totalWorkouts,
      justCrossed: true,
      bonusXp: 75
    });
  }
  
  return thresholds;
}

/**
 * CROSS-DOMAIN TASK BUILDERS
 */
export const CrossDomainTasks = {
  /**
   * Create daily nutrition tracking task update
   */
  createNutritionTaskUpdate(
    token: string,
    progress: number,
    completed: boolean = false
  ): TaskUpdateRequest {
    return {
      domainCategory: 'trophe',
      labels: ['daily_nutrition_tracking'],
      action: completed ? 'complete' : 'update',
      taskData: {
        progress,
        completed,
        completionDate: completed ? new Date().toISOString() : undefined,
        description: `Nutrition progress: ${progress}%`
      },
      source: 'trophe',
      token
    };
  },

  /**
   * Create daily workout tracking task update
   */
  createWorkoutTaskUpdate(
    token: string,
    exerciseCount: number,
    duration: number
  ): TaskUpdateRequest {
    return {
      domainCategory: 'soma',
      labels: ['daily_workout'],
      action: 'complete',
      taskData: {
        completed: true,
        completionDate: new Date().toISOString(),
        description: `Workout: ${exerciseCount} exercises, ${duration} minutes`
      },
      source: 'soma',
      token
    };
  }
};