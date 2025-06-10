export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Task from '@/models/Task';
import { ITask } from '@/types/models/tasks';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { checkTaskStreakMilestones } from '@/lib/achievements/unlock';
import { TaskData } from '@/types';
import { BatchTaskRequest } from '@/types/api/taskRequests';
import { convertTaskToTaskData } from '@/lib/task-utils';
import { isValidObjectId } from 'mongoose';

/**
 * POST /api/tasks/batch
 * Performs batch operations on tasks with achievement milestone checking
 */
export const POST = withAuth<TaskData[] | { count: number; taskIds: string[]; achievements?: any }>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Defensive request body parsing
      let requestBody: BatchTaskRequest;
      try {
        requestBody = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Extract and validate operation with defensive checks
      const operation = requestBody?.operation;
      if (!operation || typeof operation !== 'string' || 
          !['complete', 'delete', 'update'].includes(operation)) {
        return apiError(
          'Invalid operation. Supported operations: complete, delete, update.',
          400,
          'ERR_INVALID_OPERATION'
        );
      }
      
      // Extract and validate taskIds with defensive checks
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
      
      // Extract data object with defensive checks
      const data = requestBody?.data;
      
      // Filter tasks to only include those owned by the user
      const query = {
        _id: { $in: validTaskIds },
        user: userId
      };
      
      // Perform the requested operation with specific error handling for each
      switch (operation) {
        case 'complete': {
          console.log(`🎯 [BATCH] Completing ${validTaskIds.length} tasks...`);
          
          // For 'complete' operation, we need to update each task individually
          // to correctly calculate streaks and check achievements
          try {
            const completionDate = data?.completionDate 
              ? new Date(data.completionDate) 
              : new Date();
              
            if (isNaN(completionDate.getTime())) {
              return apiError('Invalid completion date', 400, 'ERR_INVALID_DATE');
            }
            
            const completedTasks: TaskData[] = [];
            let totalAchievementsUnlocked = 0;
            const allUnlockedAchievements: any[] = [];
            
            for (const taskId of validTaskIds) {
              try {
                const task = await Task.findOne({ _id: taskId, user: userId }) as ITask | null;
                
                if (task && !task.completed) {
                  console.log(`✅ [BATCH] Completing task: ${task.name}`);
                  
                  // Complete the task and calculate new streak
                  task.completeTask(completionDate);
                  
                  // 🆕 CHECK ACHIEVEMENT MILESTONES FOR EACH TASK 🆕
                  try {
                    const achievementResult = await checkTaskStreakMilestones(userId, task.currentStreak);
                    
                    if (achievementResult.unlockedCount > 0) {
                      console.log(`🏆 [BATCH] Task "${task.name}" unlocked ${achievementResult.unlockedCount} achievements!`);
                      totalAchievementsUnlocked += achievementResult.unlockedCount;
                      allUnlockedAchievements.push(...achievementResult.achievements);
                    }
                  } catch (achievementError) {
                    console.error(`💥 [BATCH] Error checking achievements for task ${taskId}:`, achievementError);
                    // Continue with other tasks
                  }
                  
                  await task.save();
                  
                  // Convert task with defensive error handling
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
          // For 'delete' operation, we can use deleteMany with error handling
          try {
            const deleteResult = await Task.deleteMany(query);
            
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
          
          try {
            // Perform updates for each task individually
            // This ensures proper handling of special cases like recurrence patterns
            const updatedTasks: TaskData[] = [];
            
            for (const taskId of validTaskIds) {
              try {
                // Update the task with validation
                const updatedTask = await Task.findOneAndUpdate(
                  { _id: taskId, user: userId },
                  data,
                  { new: true, runValidators: true }
                ) as ITask | null;
                
                if (updatedTask) {
                  // Convert task with defensive error handling
                  const taskData = convertTaskToTaskData(updatedTask);
                  updatedTasks.push(taskData);
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