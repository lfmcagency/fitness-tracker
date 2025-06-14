/**
 * ETHOS DOMAIN PROCESSOR
 * 
 * Handles task completion events, system task operations, and ethos-specific
 * milestone detection. Implements DomainProcessor interface for the coordinator.
 */

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
import { 
  BaseEventData,
  DomainEventResult,
  MilestoneConfig,
  DomainXpConfig,
  CrossDomainContract,
  DomainProcessor
} from './types';
import { 
  detectMilestone, 
  fireProgressEventWithContext, 
  notifyAchievementSystem 
} from './index';

/**
 * Ethos-specific milestone configuration
 */
const ETHOS_MILESTONES = {
  STREAK: [3, 7, 14, 30, 50, 100, 365], // Days
  COMPLETIONS: [10, 25, 50, 100, 250, 500, 1000] // Total completions
} as const;

/**
 * Ethos domain processor implementation
 */
export class EthosProcessor implements DomainProcessor {
  
  /**
   * Get milestone configuration for ethos domain
   */
  getMilestoneConfig(): Record<string, MilestoneConfig> {
    return {
      streak: {
        type: 'streak',
        thresholds: ETHOS_MILESTONES.STREAK,
        achievementPrefix: 'discipline_streak'
      },
      completion: {
        type: 'completion', 
        thresholds: ETHOS_MILESTONES.COMPLETIONS,
        achievementPrefix: 'discipline_completion'
      }
    };
  }

  /**
   * Get XP configuration for ethos domain
   */
  getXpConfig(): DomainXpConfig {
    return {
      baseXp: 50,
      streakMultiplier: 1.0,
      milestoneBonus: 25,
      progressCategory: 'core'
    };
  }

  /**
   * Process task completion events
   */
  async processEvent(eventData: BaseEventData): Promise<DomainEventResult> {
    // Convert base event to task event data
    const taskEventData = eventData.metadata?.taskEventData as TaskEventData;
    if (!taskEventData) {
      throw new Error('Task event data missing from event metadata');
    }

    console.log('📋 [ETHOS] Processing task event:', taskEventData);
    
    const milestonesHit: string[] = [];
    const achievementsNotified: string[] = [];
    
    try {
      // Detect milestones using extracted logic
      const milestoneConfigs = this.getMilestoneConfig();
      
      const streakMilestone = detectMilestone(
        taskEventData.newStreak,
        taskEventData.previousStreak,
        milestoneConfigs.streak.thresholds,
        'streak',
        milestoneConfigs.streak.achievementPrefix
      );
      
      const completionMilestone = detectMilestone(
        taskEventData.totalCompletions,
        taskEventData.previousTotalCompletions,
        milestoneConfigs.completion.thresholds,
        'completion',
        milestoneConfigs.completion.achievementPrefix
      );
      
      // Build domain context for progress event
      const domainContext = {
        streakCount: taskEventData.newStreak,
        totalCompletions: taskEventData.totalCompletions,
        taskName: taskEventData.taskName,
        milestoneHit: streakMilestone.isNewMilestone 
          ? streakMilestone.achievementId! 
          : (completionMilestone.isNewMilestone ? completionMilestone.achievementId! : undefined),
        difficulty: 'medium', // Could be derived from task properties
        isSystemItem: taskEventData.isSystemTask
      };
      
      // Fire to Progress system using coordinator utility
      const progressResult = await fireProgressEventWithContext(eventData, domainContext);
      
      // Handle milestone achievements
      if (streakMilestone.isNewMilestone) {
        milestonesHit.push(streakMilestone.achievementId!);
        await notifyAchievementSystem(
          eventData.userId, 
          streakMilestone.achievementId!, 
          taskEventData.newStreak,
          eventData.token
        );
        achievementsNotified.push(streakMilestone.achievementId!);
      }
      
      if (completionMilestone.isNewMilestone) {
        milestonesHit.push(completionMilestone.achievementId!);
        await notifyAchievementSystem(
          eventData.userId, 
          completionMilestone.achievementId!, 
          taskEventData.totalCompletions,
          eventData.token
        );
        achievementsNotified.push(completionMilestone.achievementId!);
      }
      
      console.log('✅ [ETHOS] Task event processing complete:', {
        token: eventData.token,
        milestonesHit,
        achievementsNotified
      });
      
      return {
        success: true,
        progressResult,
        milestonesHit,
        achievementsUnlocked: achievementsNotified,
        token: eventData.token
      };
      
    } catch (error) {
      console.error('💥 [ETHOS] Error processing task event:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        token: eventData.token
      };
    }
  }

  /**
   * Handle cross-domain operations targeting ethos (system tasks)
   */
  async handleCrossDomainOperation(contract: CrossDomainContract): Promise<any> {
    const { operation, operationData, token } = contract;
    
    console.log('🔧 [ETHOS] Cross-domain operation:', { token, operation });
    
    switch (operation) {
      case 'create_task':
        return await this.createSystemTask(operationData);
      case 'update_task':
      case 'complete_task':
        return await this.updateSystemTask(operationData);
      case 'check_metrics':
        return await this.getLabelMetrics(
          operationData.userId,
          operationData.labels,
          operationData.domainCategory
        );
      default:
        throw new Error(`Unsupported ethos operation: ${operation}`);
    }
  }

  /**
   * Handle system task operations from other domains
   */
  async updateSystemTask(request: SystemTaskRequest): Promise<{
    task: any;
    eventFired: boolean;
    achievements?: any;
  }> {
    console.log('🔧 [ETHOS] System task operation:', request);
    
    try {
      // Find existing system task or create if needed
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
        console.log('📝 [ETHOS] Created new system task:', task._id);
      }
      
      // Store previous state for milestone detection
      const previousState = {
        streak: task.currentStreak,
        totalCompletions: task.totalCompletions
      };
      
      // Perform the requested action
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
          
          // Fire event through coordinator
          const eventData: BaseEventData = {
            token: Date.now().toString(),
            userId: request.userId,
            source: 'ethos',
            action: 'task_completed',
            timestamp: new Date(),
            metadata: {
              taskEventData: convertToTaskEventData(task, 'completed', completionDate, previousState)
            }
          };
          
          const coordinatorResult = await this.processEvent(eventData);
          eventFired = true;
          
          console.log('✅ [ETHOS] System task completed:', task._id);
          return {
            task: convertTaskToTaskData(task),
            eventFired,
            achievements: coordinatorResult.achievementsUnlocked && coordinatorResult.achievementsUnlocked.length > 0 ? {
              unlockedCount: coordinatorResult.achievementsUnlocked.length,
              achievements: coordinatorResult.achievementsUnlocked
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
          
          console.log('❌ [ETHOS] System task uncompleted:', task._id);
        }
      } else if (request.action === 'update' && request.updates) {
        // Update task properties
        Object.assign(task, request.updates);
        await task.save();
        
        console.log('📝 [ETHOS] System task updated:', task._id);
      }
      
      return {
        task: convertTaskToTaskData(task),
        eventFired
      };
      
    } catch (error) {
      console.error('💥 [ETHOS] Error updating system task:', error);
      throw error;
    }
  }

  /**
   * Create a new system task (called by other domains during setup)
   */
  async createSystemTask(request: CreateSystemTaskRequest): Promise<any> {
    console.log('➕ [ETHOS] Creating system task:', request);
    
    try {
      // Check if task already exists
      const existingTask = await Task.findOne({
        user: new Types.ObjectId(request.userId),
        domainCategory: request.domainCategory,
        labels: { $all: request.labels },
        isSystemTask: true
      });
      
      if (existingTask) {
        console.log('⚠️ [ETHOS] System task already exists:', existingTask._id);
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
      
      console.log('✅ [ETHOS] System task created:', task._id);
      return convertTaskToTaskData(task);
      
    } catch (error) {
      console.error('💥 [ETHOS] Error creating system task:', error);
      throw error;
    }
  }

  /**
   * Get metrics for a label across all user tasks
   */
  async getLabelMetrics(
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
      console.error('💥 [ETHOS] Error getting label metrics:', error);
      throw error;
    }
  }

  /**
   * Check milestones for all user tasks (debugging/admin utility)
   */
  async checkMilestonesForUser(userId: string): Promise<{
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
      const milestoneConfigs = this.getMilestoneConfig();
      
      for (const task of tasks) {
        // Check current streak milestones
        for (const threshold of milestoneConfigs.streak.thresholds) {
          if (task.currentStreak >= threshold) {
            streakMilestones.push({
              taskId: task._id.toString(),
              taskName: task.name,
              milestone: `${milestoneConfigs.streak.achievementPrefix}_${threshold}`,
              currentValue: task.currentStreak
            });
          }
        }
        
        // Check completion milestones  
        for (const threshold of milestoneConfigs.completion.thresholds) {
          if (task.totalCompletions >= threshold) {
            completionMilestones.push({
              taskId: task._id.toString(),
              taskName: task.name,
              milestone: `${milestoneConfigs.completion.achievementPrefix}_${threshold}`,
              currentValue: task.totalCompletions
            });
          }
        }
      }
      
      return { streakMilestones, completionMilestones };
      
    } catch (error) {
      console.error('💥 [ETHOS] Error checking milestones:', error);
      throw error;
    }
  }
}