export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import TaskLog from '@/models/TaskLog';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { convertTaskToTaskData, convertToTaskEventData } from '@/lib/task-utils';
import { processTaskEvent } from '@/lib/ethos/coordinator';
import { TaskData } from '@/types';
import { BatchTaskRequest } from '@/types/api/taskRequests';
import { isValidObjectId } from 'mongoose';

/**
 * POST /api/tasks/batch
 * Performs batch operations on tasks with simplified event-driven architecture
 */
export const POST = withAuth<TaskData[] | { count: number; taskIds: string[]; achievements?: any }>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse request body
      let requestBody: BatchTaskRequest;
      try {
        requestBody = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Extract and validate operation
      const operation = requestBody?.operation;
      if (!operation || typeof operation !== 'string' || 
          !['complete', 'delete', 'update'].includes(operation)) {
        return apiError(
          'Invalid operation. Supported operations: complete, delete, update.',
          400,
          'ERR_INVALID_OPERATION'
        );
      }
      
      // Extract and validate taskIds
      const taskIds = requestBody?.taskIds;
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return apiError('No task IDs provided.', 400, 'ERR_VALIDATION');
      }
      
      // Filter out invalid task IDs
      const validTaskIds = taskIds.filter(id => 
        id && typeof id === 'string' && id.trim() !== '' && isValidObjectId(id)
      );
      
      if (validTaskIds.length === 0) {
        return apiError('No valid task IDs provided.', 400, 'ERR_VALIDATION');
      }
      
      // Extract data object
      const data = requestBody?.data;
      
      // Filter tasks to only include those owned by the user
      const query = {
        _id: { $in: validTaskIds },
        user: userId
      };
      
      // Perform the requested operation
      switch (operation) {
        case 'complete': {
          console.log(`🎯 [BATCH] Completing ${validTaskIds.length} tasks...`);
          
          try {
            const completionDate = data?.completionDate 
              ? new Date(data.completionDate) 
              : new Date();
              
            if (isNaN(completionDate.getTime())) {
              return apiError('Invalid completion date', 400, 'ERR_INVALID_DATE');
            }
            
            const completedTasks: TaskData[] = [];
            let totalAchievementsUnlocked = 0;
            const allUnlockedAchievements: string[] = [];
            
            // Process each task individually for proper event handling
            for (const taskId of validTaskIds) {
              try {
                const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
                
                if (task && !task.isCompletedOnDate(completionDate)) {
                  console.log(`✅ [BATCH] Completing task: ${task.name}`);
                  
                  // Store previous state for event creation
                  const previousState = {
                    streak: task.currentStreak,
                    totalCompletions: task.totalCompletions
                  };
                  
                  // Complete the task
                  task.completeTask(completionDate);
                  await task.save();
                  
                  // Log the completion
                  await TaskLog.logCompletion(
                    task._id,
                    task.user,
                    'completed',
                    completionDate,
                    task,
                    'api'
                  );
                  
                  // 🆕 FIRE EVENT TO COORDINATOR FOR EACH TASK 🆕
                  try {
                    const eventData = convertToTaskEventData(task, 'completed', completionDate, previousState);
                    const coordinatorResult = await processTaskEvent(eventData);
                    
                    if (coordinatorResult.achievementsNotified.length > 0) {
                      console.log(`🏆 [BATCH] Task "${task.name}" unlocked ${coordinatorResult.achievementsNotified.length} achievements!`);
                      totalAchievementsUnlocked += coordinatorResult.achievementsNotified.length;
                      allUnlockedAchievements.push(...coordinatorResult.achievementsNotified);
                    }
                  } catch (coordinatorError) {
                    console.error(`💥 [BATCH] Error processing coordinator event for task ${taskId}:`, coordinatorError);
                    // Continue with other tasks
                  }
                  
                  // Convert task for response
                  const taskData = convertTaskToTaskData(task);
                  completedTasks.push(taskData);
                }
              } catch (error) {
                console.error(`💥 [BATCH] Error completing task ${taskId}:`, error);
                // Continue with other tasks even if one fails
              }
            }
            
            // Build response with achievement info
            const response: any = {
              tasks: completedTasks,
              completedCount: completedTasks.length
            };
            
            if (totalAchievementsUnlocked > 0) {
              response.achievements = {
                unlockedCount: totalAchievementsUnlocked,
                achievements: allUnlockedAchievements
              };
            }
            
            const message = totalAchievementsUnlocked > 0
              ? `${completedTasks.length} tasks completed and ${totalAchievementsUnlocked} achievement(s) unlocked!`
              : `${completedTasks.length} tasks marked as completed.`;
            
            return apiResponse(response, true, message);
          } catch (error) {
            return handleApiError(error, 'Error completing tasks');
          }
        }
        
        case 'delete': {
          try {
            // First check for system tasks
            const tasksToDelete = await Task.find(query) as ITask[];
            const systemTasks = tasksToDelete.filter(task => task.isSystemTask);
            
            if (systemTasks.length > 0) {
              return apiError(
                `Cannot delete system tasks: ${systemTasks.map(t => t.name).join(', ')}`,
                403,
                'ERR_FORBIDDEN'
              );
            }
            
            // Proceed with deletion
            const deleteResult = await Task.deleteMany(query);
            
            console.log(`🗑️ [BATCH] Deleted ${deleteResult?.deletedCount || 0} tasks`);
            
            return apiResponse(
              { 
                count: deleteResult?.deletedCount || 0, 
                taskIds: validTaskIds 
              },
              true,
              `${deleteResult?.deletedCount || 0} tasks deleted.`
            );
          } catch (error) {
            return handleApiError(error, 'Error deleting tasks');
          }
        }
        
        case 'update': {
          // For 'update' operation, validate the data
          if (!data || typeof data !== 'object') {
            return apiError('No update data provided.', 400, 'ERR_VALIDATION');
          }
          
          // Validate update fields
          const allowedFields = [
            'name', 'description', 'scheduledTime', 'recurrencePattern', 
            'customRecurrenceDays', 'category', 'priority', 'labels'
          ];
          
          const updateFields = Object.keys(data);
          const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
          
          if (invalidFields.length > 0) {
            return apiError(`Invalid update fields: ${invalidFields.join(', ')}`, 400, 'ERR_VALIDATION');
          }
          
          // Prevent updating system task identifying fields
          if (data.domainCategory || data.isSystemTask !== undefined) {
            return apiError('Cannot update domain category or system task status via batch operation', 403, 'ERR_FORBIDDEN');
          }
          
          try {
            // Perform updates for each task individually
            const updatedTasks: TaskData[] = [];
            
            for (const taskId of validTaskIds) {
              try {
                // Check if it's a system task first
                const existingTask = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
                
                if (existingTask?.isSystemTask) {
                  console.warn(`⚠️ [BATCH] Skipping system task update: ${existingTask.name}`);
                  continue;
                }
                
                // Update the task
                const updatedTask = await Task.findOneAndUpdate(
                  { _id: taskId, user: userId },
                  data,
                  { new: true, runValidators: true }
                ) as ITask | null;
                
                if (updatedTask) {
                  const taskData = convertTaskToTaskData(updatedTask);
                  updatedTasks.push(taskData);
                  console.log(`📝 [BATCH] Updated task: ${updatedTask.name}`);
                }
              } catch (error) {
                console.error(`💥 [BATCH] Error updating task ${taskId}:`, error);
                // Continue with other tasks even if one fails
              }
            }
            
            return apiResponse(
              updatedTasks,
              true,
              `${updatedTasks.length} tasks updated.`
            );
          } catch (error) {
            return handleApiError(error, 'Error updating tasks');
          }
        }
        
        default:
          // This should never happen due to validation above
          return apiError('Invalid operation', 400, 'ERR_INVALID_OPERATION');
      }
    } catch (error) {
      return handleApiError(error, 'Error performing batch operation');
    }
  },
  AuthLevel.DEV_OPTIONAL
);