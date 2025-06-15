// src/lib/event-coordinator/task-completion.ts
/**
 * TASK COMPLETION HELPER
 * 
 * Simplified helper for API routes to fire task completion events.
 * Handles the complex coordinator integration so API routes stay clean.
 */

import { ITask } from '@/types/models/tasks';
import { convertToTaskEventData } from '@/types/converters/taskConverters';
import { processEvent } from '@/lib/event-coordinator';
import { generateToken } from '@/lib/event-coordinator/logging';
import { BaseEventData } from './types';

/**
 * Handle task completion and fire coordinator events
 * Used by API routes to trigger the full event chain
 */
export async function handleTaskCompletion(
  userId: string,
  task: ITask,
  action: 'completed' | 'uncompleted',
  completionDate: Date,
  previousState: {
    streak: number;
    totalCompletions: number;
    completed?: boolean;
  }
): Promise<{
  success: boolean;
  token: string;
  achievementsUnlocked?: string[];
  error?: string;
}> {
  
  try {
    const token = generateToken();
    
    console.log(`🎯 [TASK-COMPLETION] Processing ${action} for task: ${task.name} | ${token}`);
    
    // Convert task to event data format
    const taskEventData = convertToTaskEventData(task, action, completionDate, previousState);
    
    // Build BaseEventData structure for coordinator
    const eventData: BaseEventData = {
      token,
      userId,
      source: 'ethos',
      action: action === 'completed' ? 'task_completed' : 'task_uncompleted',
      timestamp: new Date(),
      metadata: {
        taskEventData,
        completionDate: completionDate.toISOString(),
        previousState
      }
    };
    
    // Fire event to coordinator
    const result = await processEvent(eventData);
    
    console.log(`✅ [TASK-COMPLETION] Coordinator result: ${token}`, {
      success: result.success,
      achievementsUnlocked: result.achievementsUnlocked?.length || 0
    });
    
    return {
      success: result.success,
      token,
      achievementsUnlocked: result.achievementsUnlocked || [],
      error: result.error
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`💥 [TASK-COMPLETION] Failed:`, errorMessage);
    
    return {
      success: false,
      token: 'failed',
      error: errorMessage
    };
  }
}

/**
 * Batch completion handler for multiple tasks
 */
export async function handleBatchTaskCompletion(
  userId: string,
  tasks: Array<{
    task: ITask;
    completionDate: Date;
    previousState: { streak: number; totalCompletions: number; };
  }>
): Promise<{
  success: boolean;
  achievementsUnlocked: string[];
  processedTasks: number;
  errors: string[];
}> {
  
  const allAchievements: string[] = [];
  const errors: string[] = [];
  let processedTasks = 0;
  
  for (const { task, completionDate, previousState } of tasks) {
    try {
      const result = await handleTaskCompletion(
        userId,
        task,
        'completed',
        completionDate,
        previousState
      );
      
      if (result.success) {
        processedTasks++;
        if (result.achievementsUnlocked) {
          allAchievements.push(...result.achievementsUnlocked);
        }
      } else {
        errors.push(`Task ${task.name}: ${result.error}`);
      }
    } catch (error) {
      errors.push(`Task ${task.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    success: errors.length === 0,
    achievementsUnlocked: allAchievements,
    processedTasks,
    errors
  };
}