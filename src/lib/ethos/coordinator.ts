// src/lib/ethos/coordinator.ts
import { Types } from 'mongoose';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { 
  TaskEventData, 
  DomainCategory, 
  SystemTaskRequest,
  CreateSystemTaskRequest 
} from '@/types';
import { 
  convertToTaskEventData, 
  convertTaskToTaskData,
  createSystemTaskData 
} from '@/types/converters/taskConverters';
import { ProgressEventContract } from '@/types/api/progressResponses';

/**
 * ETHOS COORDINATOR
 * 
 * The orchestration layer between task domain and rest of the app.
 * Responsibilities:
 * 1. Receive basic events from API layer
 * 2. Handle system task operations from other domains
 * 3. Enrich events with milestone context
 * 4. Fire enriched events to Progress system
 * 5. Detect and notify achievement thresholds
 * 6. Coordinate cross-domain task operations
 */

// ==========================================
// MILESTONE THRESHOLDS (Hardcoded for now)
// ==========================================

const DISCIPLINE_MILESTONES = {
  STREAK: [3, 7, 14, 30, 50, 100, 365], // Days
  COMPLETIONS: [10, 25, 50, 100, 250, 500, 1000] // Total completions
} as const;

const CATEGORY_XP_MAPPING = {
  // Ethos tasks (general productivity)
  ethos: {
    baseXp: 50,
    streakMultiplier: 1.0,
    milestoneBonus: 25
  },
  // Trophe tasks (nutrition)
  trophe: {
    baseXp: 30,
    streakMultiplier: 1.2,
    milestoneBonus: 20
  },
  // Soma tasks (exercise)
  soma: {
    baseXp: 40,
    streakMultiplier: 1.1,
    milestoneBonus: 30
  }
} as const;

// ==========================================
// MILESTONE DETECTION
// ==========================================

interface MilestoneResult {
  type: 'streak' | 'completion' | null;
  threshold: number | null;
  achievementId: string | null;
  isNewMilestone: boolean;
}

function detectMilestone(
  currentValue: number,
  previousValue: number | undefined,
  thresholds: readonly number[],
  type: 'streak' | 'completion'
): MilestoneResult {
  // Find the highest threshold that current value crosses
  for (const threshold of thresholds) {
    if (currentValue >= threshold && (previousValue === undefined || previousValue < threshold)) {
      return {
        type,
        threshold,
        achievementId: `${type}_${threshold}`,
        isNewMilestone: true
      };
    }
  }
  
  return {
    type: null,
    threshold: null,
    achievementId: null,
    isNewMilestone: false
  };
}

// ==========================================
// PROGRESS EVENT FIRING
// ==========================================

async function fireProgressEvent(contract: ProgressEventContract): Promise<any> {
  try {
    console.log('🎯 [COORDINATOR] Firing progress event:', contract);
    
    const response = await fetch('/api/progress/add-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to process progress event');
    }

    console.log('✅ [COORDINATOR] Progress event complete:', result.data);
    return result.data;
  } catch (error) {
    console.error('💥 [COORDINATOR] Failed to fire progress event:', error);
    throw error;
  }
}

// ==========================================
// ACHIEVEMENT NOTIFICATION (Placeholder)
// ==========================================

async function notifyAchievementSystem(
  userId: string,
  achievementId: string,
  currentValue: number
): Promise<void> {
  try {
    console.log('🏆 [COORDINATOR] Notifying achievement system:', { userId, achievementId, currentValue });
    
    // TODO: Implement achievement system API call
    // For now, just log the achievement
    console.log(`🎉 [COORDINATOR] Achievement unlocked: ${achievementId} (value: ${currentValue})`);
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Failed to notify achievement system:', error);
    // Don't throw - achievements are nice-to-have, not critical
  }
}

// ==========================================
// MAIN COORDINATOR FUNCTIONS
// ==========================================

/**
 * Process a task completion event from API layer
 * Enriches the event and fires to Progress system
 */
export async function processTaskEvent(eventData: TaskEventData): Promise<{
  progressResult: any;
  milestonesHit: string[];
  achievementsNotified: string[];
}> {
  console.log('🚀 [COORDINATOR] Processing task event:', eventData);
  
  const milestonesHit: string[] = [];
  const achievementsNotified: string[] = [];
  
  try {
    // 1. Detect milestones
    const streakMilestone = detectMilestone(
      eventData.newStreak,
      eventData.previousStreak,
      DISCIPLINE_MILESTONES.STREAK,
      'streak'
    );
    
    const completionMilestone = detectMilestone(
      eventData.totalCompletions,
      eventData.previousTotalCompletions,
      DISCIPLINE_MILESTONES.COMPLETIONS,
      'completion'
    );
    
    // 2. Build enriched progress contract
    const xpMapping = CATEGORY_XP_MAPPING[eventData.domainCategory] || CATEGORY_XP_MAPPING.ethos;
    
    const progressContract: ProgressEventContract = {
      userId: eventData.userId,
      eventId: Date.now(), // Simple deduplication
      source: `task_${eventData.action}`,
      
      // Task context
      taskId: eventData.taskId,
      taskType: eventData.labels.join(',') || 'general',
      streakCount: eventData.newStreak,
      totalCompletions: eventData.totalCompletions,
      
      // Milestone context
      milestoneHit: streakMilestone.isNewMilestone 
        ? streakMilestone.achievementId! 
        : (completionMilestone.isNewMilestone ? completionMilestone.achievementId! : undefined),
      
      // Category for Progress system
      category: eventData.domainCategory === 'ethos' ? 'core' : 
                eventData.domainCategory === 'trophe' ? 'push' :
                eventData.domainCategory === 'soma' ? 'legs' : 'core',
      
      // Additional context for XP calculation
      metadata: {
        difficulty: 'medium', // Could be derived from task properties
        exerciseName: eventData.taskName,
        isSystemTask: eventData.isSystemTask
      }
    };
    
    // 3. Fire to Progress system
    const progressResult = await fireProgressEvent(progressContract);
    
    // 4. Handle milestone achievements
    if (streakMilestone.isNewMilestone) {
      milestonesHit.push(streakMilestone.achievementId!);
      await notifyAchievementSystem(eventData.userId, streakMilestone.achievementId!, eventData.newStreak);
      achievementsNotified.push(streakMilestone.achievementId!);
    }
    
    if (completionMilestone.isNewMilestone) {
      milestonesHit.push(completionMilestone.achievementId!);
      await notifyAchievementSystem(eventData.userId, completionMilestone.achievementId!, eventData.totalCompletions);
      achievementsNotified.push(completionMilestone.achievementId!);
    }
    
    console.log('✅ [COORDINATOR] Event processing complete:', {
      progressResult,
      milestonesHit,
      achievementsNotified
    });
    
    return {
      progressResult,
      milestonesHit,
      achievementsNotified
    };
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Error processing task event:', error);
    throw error;
  }
}

/**
 * Handle system task operations from other domains
 * Trophe/Soma call this to update their tasks
 */
export async function updateSystemTask(request: SystemTaskRequest): Promise<{
  task: any;
  eventFired: boolean;
  achievements?: any;
}> {
  console.log('🔧 [COORDINATOR] System task operation:', request);
  
  try {
    // 1. Find existing system task or create if needed
    let task = await Task.findOne({
      user: new Types.ObjectId(request.userId),
      domainCategory: request.domainCategory,
      labels: { $all: request.labels },
      isSystemTask: true
    }) as ITask | null;
    
    if (!task) {
      // Create system task if it doesn't exist
      const defaultName = `${request.domainCategory.charAt(0).toUpperCase() + request.domainCategory.slice(1)} Task`;
      const taskData = createSystemTaskData(
        request.userId,
        defaultName,
        request.domainCategory,
        request.labels
      );
      
      task = await Task.create(taskData) as ITask;
      console.log('📝 [COORDINATOR] Created new system task:', task._id);
    }
    
    // 2. Store previous state for milestone detection
    const previousState = {
      streak: task.currentStreak,
      totalCompletions: task.totalCompletions
    };
    
    // 3. Perform the requested action
    let eventFired = false;
    
    if (request.action === 'complete') {
      const completionDate = request.completionDate ? new Date(request.completionDate) : new Date();
      
      if (!task.isCompletedOnDate(completionDate)) {
        task.completeTask(completionDate);
        await task.save();
        
        // Log the completion
        await TaskLog.logCompletion(
          task._id,
          new Types.ObjectId(request.userId),
          'completed',
          completionDate,
          task,
          'system'
        );
        
        // Fire event to coordinator (recursive, but that's OK)
        const eventData = convertToTaskEventData(task, 'completed', completionDate, previousState);
        const coordinatorResult = await processTaskEvent(eventData);
        eventFired = true;
        
        console.log('✅ [COORDINATOR] System task completed:', task._id);
        return {
          task: convertTaskToTaskData(task),
          eventFired,
          achievements: coordinatorResult.achievementsNotified.length > 0 ? {
            unlockedCount: coordinatorResult.achievementsNotified.length,
            achievements: coordinatorResult.achievementsNotified
          } : undefined
        };
      }
    } else if (request.action === 'uncomplete') {
      const completionDate = request.completionDate ? new Date(request.completionDate) : new Date();
      
      if (task.isCompletedOnDate(completionDate)) {
        task.uncompleteTask(completionDate);
        await task.save();
        
        // Log the uncompletion
        await TaskLog.logCompletion(
          task._id,
          new Types.ObjectId(request.userId),
          'uncompleted',
          completionDate,
          task,
          'system'
        );
        
        console.log('❌ [COORDINATOR] System task uncompleted:', task._id);
      }
    } else if (request.action === 'update' && request.updates) {
      // Update task properties
      Object.assign(task, request.updates);
      await task.save();
      
      console.log('📝 [COORDINATOR] System task updated:', task._id);
    }
    
    return {
      task: convertTaskToTaskData(task),
      eventFired
    };
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Error updating system task:', error);
    throw error;
  }
}

/**
 * Create a new system task (called by other domains during setup)
 */
export async function createSystemTask(request: CreateSystemTaskRequest): Promise<any> {
  console.log('➕ [COORDINATOR] Creating system task:', request);
  
  try {
    // Check if task already exists
    const existingTask = await Task.findOne({
      user: new Types.ObjectId(request.userId),
      domainCategory: request.domainCategory,
      labels: { $all: request.labels },
      isSystemTask: true
    });
    
    if (existingTask) {
      console.log('⚠️ [COORDINATOR] System task already exists:', existingTask._id);
      return convertTaskToTaskData(existingTask as ITask);
    }
    
    // Create new system task
    const taskData = {
      ...createSystemTaskData(
        request.userId,
        request.name,
        request.domainCategory,
        request.labels,
        request.scheduledTime,
        request.recurrencePattern
      ),
      description: request.description,
      category: request.category || 'system',
      priority: request.priority || 'medium'
    };
    
    const task = await Task.create(taskData) as ITask;
    
    console.log('✅ [COORDINATOR] System task created:', task._id);
    return convertTaskToTaskData(task);
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Error creating system task:', error);
    throw error;
  }
}

/**
 * Get metrics for a label across all user tasks
 * Used by other domains to check completion status
 */
export async function getLabelMetrics(
  userId: string,
  labels: string[],
  domainCategory?: DomainCategory
): Promise<{
  totalTasks: number;
  totalCompletions: number;
  currentStreak: number;
  lastCompletedDate: string | null;
}> {
  try {
    const query: any = {
      user: new Types.ObjectId(userId),
      labels: { $in: labels }
    };
    
    if (domainCategory) {
      query.domainCategory = domainCategory;
    }
    
    const tasks = await Task.find(query) as ITask[];
    
    const totalCompletions = tasks.reduce((sum, task) => sum + (task.totalCompletions || 0), 0);
    const currentStreak = Math.max(...tasks.map(task => task.currentStreak || 0), 0);
    
    // Find most recent completion
    const completionDates = tasks
      .map(task => task.lastCompletedDate)
      .filter(date => date !== null)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    
    const lastCompletedDate = completionDates.length > 0 
      ? completionDates[0]!.toISOString() 
      : null;
    
    return {
      totalTasks: tasks.length,
      totalCompletions,
      currentStreak,
      lastCompletedDate
    };
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Error getting label metrics:', error);
    throw error;
  }
}

/**
 * Manual milestone check (for debugging/admin purposes)
 */
export async function checkMilestonesForUser(userId: string): Promise<{
  streakMilestones: any[];
  completionMilestones: any[];
}> {
  try {
    const tasks = await Task.find({ 
      user: new Types.ObjectId(userId),
      isSystemTask: false 
    }) as ITask[];
    
    const streakMilestones = [];
    const completionMilestones = [];
    
    for (const task of tasks) {
      // Check current streak milestones
      for (const threshold of DISCIPLINE_MILESTONES.STREAK) {
        if (task.currentStreak >= threshold) {
          streakMilestones.push({
            taskId: task._id.toString(),
            taskName: task.name,
            milestone: `streak_${threshold}`,
            currentValue: task.currentStreak
          });
        }
      }
      
      // Check completion milestones  
      for (const threshold of DISCIPLINE_MILESTONES.COMPLETIONS) {
        if (task.totalCompletions >= threshold) {
          completionMilestones.push({
            taskId: task._id.toString(),
            taskName: task.name,
            milestone: `completion_${threshold}`,
            currentValue: task.totalCompletions
          });
        }
      }
    }
    
    return { streakMilestones, completionMilestones };
    
  } catch (error) {
    console.error('💥 [COORDINATOR] Error checking milestones:', error);
    throw error;
  }
}