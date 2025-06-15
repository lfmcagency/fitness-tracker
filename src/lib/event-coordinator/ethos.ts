/**
 * ENHANCED ETHOS PROCESSOR
 * 
 * Updated to work with rich contract system and shared utilities.
 * Calculates complete context and integrates with cross-domain operations.
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
  DomainProcessor,
  RichEventContext
} from './types';
import { 
  calculateTaskContext,
  MILESTONE_THRESHOLDS 
} from '@/lib/shared-utilities';
import { EthosContracts } from './contracts';
import { trackTokenStage } from './logging';

/**
 * Enhanced ethos processor with rich context calculation
 */
export class EthosProcessor implements DomainProcessor {
  
  /**
   * Get milestone configuration for ethos domain
   */
  getMilestoneConfig(): Record<string, MilestoneConfig> {
    return {
      streak: {
        type: 'streak',
        thresholds: MILESTONE_THRESHOLDS.STREAK,
        achievementPrefix: 'discipline_streak',
        bonusXp: 25
      },
      completion: {
        type: 'completion', 
        thresholds: MILESTONE_THRESHOLDS.USAGE,
        achievementPrefix: 'discipline_completion',
        bonusXp: 50
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
      progressCategory: 'core',
      difficultyMultipliers: { easy: 0.8, medium: 1.0, hard: 1.3 },
      systemItemBonus: 10
    };
  }

  /**
   * Calculate rich context using shared utilities
   */
  async calculateRichContext(eventData: BaseEventData): Promise<RichEventContext> {
    const taskEventData = eventData.metadata?.taskEventData as TaskEventData;
    if (!taskEventData) {
      throw new Error('Task event data missing from event metadata');
    }

    trackTokenStage(eventData.token, 'ethos_context_start');
    
    // Get all user tasks for domain analysis
    const allUserTasks = await Task.find({ 
      user: new Types.ObjectId(eventData.userId) 
    }).lean() as any[];
    
    // Calculate rich context using shared utilities
    const taskContext = calculateTaskContext(
      taskEventData,
      allUserTasks,
      taskEventData.completionHistory || []
    );
    
    trackTokenStage(eventData.token, 'ethos_context_calculated');
    
    // Detect milestones
    let milestoneHit: string | undefined;
    let milestoneValue: number | undefined;
    
    if (MILESTONE_THRESHOLDS.STREAK.includes(taskContext.streakCount as 3 | 7 | 14 | 30 | 50 | 100)) {
      milestoneHit = `discipline_streak_${taskContext.streakCount}`;
      milestoneValue = taskContext.streakCount;
    } else if (MILESTONE_THRESHOLDS.USAGE.includes(taskContext.totalCompletions as 10 | 25 | 50 | 100 | 250 | 500 | 1000 | 2500 | 5000)) {
      milestoneHit = `discipline_completion_${taskContext.totalCompletions}`;
      milestoneValue = taskContext.totalCompletions;
    }
    
    const richContext: RichEventContext = {
      streakCount: taskContext.streakCount,
      totalCompletions: taskContext.totalCompletions,
      itemName: taskEventData.name || 'Task', // Use task name from event data instead
      domainCategory: taskContext.domainCategory,
      labels: taskContext.labels,
      difficulty: 'medium', // Could be enhanced based on task properties
      isSystemItem: taskContext.isSystemTask,
      milestoneHit,
      milestoneValue,
      taskContext: {
        ...taskContext,
        taskName: taskEventData.name || 'Task'
      }
    };
    
    console.log('📋 [ETHOS] Rich context calculated:', {
      token: eventData.token,
      streakCount: richContext.streakCount,
      totalCompletions: richContext.totalCompletions,
      milestoneHit: richContext.milestoneHit
    });
    
    return richContext;
  }

  /**
   * Process task events using rich contract system
   */
  async processEvent(eventData: BaseEventData): Promise<DomainEventResult> {
    const { token, action } = eventData;
    
    console.log('📋 [ETHOS] Processing event with rich contracts:', { token, action });
    
    try {
      trackTokenStage(token, 'ethos_processing_start');
      
      // Calculate rich context
      const richContext = await this.calculateRichContext(eventData);
      
      // Build domain-specific rich contract
      let richContract;
      if (action === 'task_completed') {
        const taskEventData = eventData.metadata?.taskEventData as TaskEventData;
        const allUserTasks = await Task.find({ 
          user: new Types.ObjectId(eventData.userId) 
        }).lean() as any[];
        
        richContract = await EthosContracts.buildTaskCompletionContract(
          eventData,
          taskEventData,
          allUserTasks,
          taskEventData.completionHistory || []
        );
      } else if (action === 'task_created') {
        richContract = EthosContracts.buildTaskCreationContract(eventData, eventData.metadata);
      } else {
        // Fallback to basic rich contract
        richContract = {
          token,
          eventId: Date.now(),
          source: eventData.source,
          action: eventData.action,
          userId: eventData.userId,
          context: richContext,
          taskUpdates: [],
          achievementThresholds: [],
          xpMetadata: {
            baseXp: this.getXpConfig().baseXp,
            streakMultiplier: this.getXpConfig().streakMultiplier,
            milestoneBonus: this.getXpConfig().milestoneBonus,
            difficultyMultiplier: this.getXpConfig().difficultyMultipliers.medium,
            categoryBonus: richContext.isSystemItem ? this.getXpConfig().systemItemBonus : 0
          },
          reversalData: {
            undoInstructions: {},
            snapshotData: {
              userStateBeforeEvent: null,
              eventContext: richContext,
              crossDomainUpdates: []
            }
          }
        };
      }
      
      trackTokenStage(token, 'ethos_contract_built');
      
      console.log('✅ [ETHOS] Rich contract event processing complete:', {
        token,
        milestonesHit: richContract.achievementThresholds?.length || 0,
        taskUpdates: richContract.taskUpdates?.length || 0
      });
      
      return {
        success: true,
        token,
        progressContract: richContract,
        milestonesHit: richContract.achievementThresholds
          ?.filter(t => t.justCrossed)
          ?.map(t => ({
            type: t.type,
            threshold: t.threshold,
            achievementId: t.achievementId,
            currentValue: t.currentValue
          })) || [],
        achievementsUnlocked: richContract.achievementThresholds
          ?.filter(t => t.justCrossed)
          ?.map(t => t.achievementId) || []
      };
      
    } catch (error) {
      console.error('💥 [ETHOS] Enhanced processing failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        token
      };
    }
  }

  /**
   * Handle cross-domain operations targeting ethos (system tasks)
   */
  async handleCrossDomainOperation(contract: CrossDomainContract): Promise<any> {
    const { operation, operationData, token } = contract;
    
    console.log('🔧 [ETHOS] Cross-domain operation:', { token, operation });
    trackTokenStage(token, 'ethos_cross_domain_start');
    
    try {
      let result;
      
      switch (operation) {
        case 'create_task':
          result = await this.createSystemTask(operationData);
          break;
        case 'update_task':
        case 'complete_task':
          result = await this.updateSystemTask(operationData);
          break;
        case 'check_metrics':
          result = await this.getLabelMetrics(
            operationData.userId,
            operationData.labels,
            operationData.domainCategory
          );
          break;
        default:
          throw new Error(`Unsupported ethos operation: ${operation}`);
      }
      
      trackTokenStage(token, 'ethos_cross_domain_complete');
      return result;
      
    } catch (error) {
      console.error('💥 [ETHOS] Cross-domain operation failed:', error);
      throw error;
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
          
          console.log('✅ [ETHOS] System task completed:', task._id);
          eventFired = true;
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
   * Debug utility - check milestones for all user tasks
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