/**
 * ETHOS PROCESSOR - Task Events
 * 
 * Handles task completion/uncompletion and creation/deletion.
 * Simple context output, no cross-domain complexity.
 */

import { Types } from 'mongoose';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { 
  TaskEvent, 
  TaskEventContext, 
  DomainEventResult, 
  DomainProcessor 
} from './types';
import { MILESTONE_THRESHOLDS } from '@/lib/shared-utilities';

/**
 * Ethos domain processor
 */
export class EthosProcessor implements DomainProcessor {
  
  /**
   * Process task events
   */
  async processEvent(event: TaskEvent): Promise<DomainEventResult> {
    const { token, action, taskData } = event;
    
    console.log(`📋 [ETHOS] Processing ${action}: ${taskData.taskName} | ${token}`);
    
    try {
      switch (action) {
        case 'task_completed':
          return await this.handleTaskCompletion(event);
        case 'task_uncompleted':
          return await this.handleTaskUncompletion(event);
        case 'task_created':
          return await this.handleTaskCreation(event);
        case 'task_deleted':
          return await this.handleTaskDeletion(event);
        default:
          throw new Error(`Unsupported task action: ${action}`);
      }
    } catch (error) {
      console.error(`💥 [ETHOS] Processing failed: ${token}`, error);
      return {
        success: false,
        token,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle task completion
   */
  private async handleTaskCompletion(event: TaskEvent): Promise<DomainEventResult> {
    const { token, taskData } = event;
    
    // Build simple context for Progress
    const context: TaskEventContext = {
      taskId: taskData.taskId,
      taskName: taskData.taskName,
      streakCount: taskData.streakCount,
      totalCompletions: taskData.totalCompletions,
      isSystemTask: false, // Could be enhanced from task data
      milestoneHit: this.detectMilestone(taskData.streakCount, taskData.totalCompletions)
    };
    
    console.log(`✅ [ETHOS] Task completion context: ${token}`, {
      streak: context.streakCount,
      total: context.totalCompletions,
      milestone: context.milestoneHit
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle task uncompletion (reversal)
   */
  private async handleTaskUncompletion(event: TaskEvent): Promise<DomainEventResult> {
    const { token, taskData } = event;
    
    // Build context showing the reduced state
    const context: TaskEventContext = {
      taskId: taskData.taskId,
      taskName: taskData.taskName,
      streakCount: taskData.streakCount, // Already updated to reduced value
      totalCompletions: taskData.totalCompletions, // Already updated
      isSystemTask: false
      // No milestones on uncompletion
    };
    
    console.log(`❌ [ETHOS] Task uncompletion context: ${token}`, {
      streak: context.streakCount,
      total: context.totalCompletions
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle task creation
   */
  private async handleTaskCreation(event: TaskEvent): Promise<DomainEventResult> {
    const { token, taskData } = event;
    
    // Simple context for task creation
    const context: TaskEventContext = {
      taskId: taskData.taskId,
      taskName: taskData.taskName,
      streakCount: 0,
      totalCompletions: 0,
      isSystemTask: false
    };
    
    console.log(`➕ [ETHOS] Task creation context: ${token}`, {
      taskName: context.taskName
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Handle task deletion
   */
  private async handleTaskDeletion(event: TaskEvent): Promise<DomainEventResult> {
    const { token, taskData } = event;
    
    // Context for deletion (might not award XP)
    const context: TaskEventContext = {
      taskId: taskData.taskId,
      taskName: taskData.taskName,
      streakCount: taskData.streakCount,
      totalCompletions: taskData.totalCompletions,
      isSystemTask: false
    };
    
    console.log(`🗑️ [ETHOS] Task deletion context: ${token}`, {
      taskName: context.taskName
    });
    
    return {
      success: true,
      token,
      context
    };
  }

  /**
   * Check if event can be reversed (same-day only)
   */
  canReverseEvent(event: TaskEvent): boolean {
    const eventDate = new Date(event.timestamp);
    const today = new Date();
    
    // Same day check
    return eventDate.toDateString() === today.toDateString();
  }

  /**
   * Reverse a task event
   */
  async reverseEvent(
    originalEvent: TaskEvent, 
    originalContext: TaskEventContext
  ): Promise<DomainEventResult> {
    const { action, taskData } = originalEvent;
    
    console.log(`🔄 [ETHOS] Reversing ${action} for task: ${taskData.taskName}`);
    
    // Determine reverse action
    let reverseAction: string;
    switch (action) {
      case 'task_completed':
        reverseAction = 'task_uncompleted';
        break;
      case 'task_created':
        reverseAction = 'task_deleted';
        break;
      default:
        throw new Error(`Cannot reverse action: ${action}`);
    }
    
    // Build reverse context (will be used to subtract XP)
    const reverseContext: TaskEventContext = {
      ...originalContext,
      milestoneHit: undefined // No milestones on reversal
    };
    
    return {
      success: true,
      token: originalEvent.token,
      context: reverseContext
    };
  }

  /**
   * Detect if a milestone was hit
   */
  private detectMilestone(streakCount: number, totalCompletions: number): string | undefined {
    // Check streak milestones
    if (MILESTONE_THRESHOLDS.STREAK.includes(streakCount as any)) {
      return `task_streak_${streakCount}`;
    }
    
    // Check completion milestones
    if (MILESTONE_THRESHOLDS.USAGE.includes(totalCompletions as any)) {
      return `task_completion_${totalCompletions}`;
    }
    
    return undefined;
  }

  /**
   * Helper to get task from database
   */
  private async getTask(taskId: string, userId: string): Promise<ITask | null> {
    return await Task.findOne({
      _id: new Types.ObjectId(taskId),
      user: new Types.ObjectId(userId)
    }) as ITask | null;
  }
}