export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Workout from "@/models/Workout";
import Exercise from "@/models/Exercise";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import { WorkoutPerformanceData } from "@/types/api/workoutResponses";
import { WorkoutPerformanceParams } from "@/types/api/workoutRequests";
import { IWorkout } from "@/types/models/workout";

/**
 * GET /api/workouts/performance
 * Get performance metrics for an exercise across workouts
 * Query parameters: exerciseId (required), timeRange, startDate, endDate, includeBodyweight, calculateTrends
 */
export const GET = withAuth<WorkoutPerformanceData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Parse URL query parameters
      const url = new URL(req.url);
      
      // Required parameter: exerciseId
      const exerciseId = url.searchParams.get('exerciseId');
      if (!exerciseId) {
        return apiError('Exercise ID is required', 400, 'ERR_MISSING_PARAM');
      }
      
      if (!isValidObjectId(exerciseId)) {
        return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
      }
      
      // Get exercise details
      const exercise = await Exercise.findById(exerciseId);
      if (!exercise) {
        return apiError('Exercise not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Date range parameters
      let startDate: Date | undefined;
      let endDate = new Date(); // Default to now for end date
      
      // Process time range or explicit dates
      const timeRange = url.searchParams.get('timeRange');
      if (timeRange) {
        startDate = new Date();
        
        switch (timeRange) {
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case '3months':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case '6months':
            startDate.setMonth(startDate.getMonth() - 6);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case 'all':
            startDate = undefined; // No start date constraint
            break;
          default:
            // Default to 1 month if invalid range provided
            startDate.setMonth(startDate.getMonth() - 1);
        }
      } else {
        // Process explicit date range if provided
        const startDateParam = url.searchParams.get('startDate');
        if (startDateParam) {
          const parsedDate = new Date(startDateParam);
          if (!isNaN(parsedDate.getTime())) {
            startDate = parsedDate;
          }
        }
        
        const endDateParam = url.searchParams.get('endDate');
        if (endDateParam) {
          const parsedDate = new Date(endDateParam);
          if (!isNaN(parsedDate.getTime())) {
            endDate = parsedDate;
          }
        }
      }
      
      // Build query to find workouts with this exercise
      const query: Record<string, any> = {
        user: userId,
        'sets.exercise': exerciseId
      };
      
      // Add date constraints if applicable
      if (startDate) {
        query.date = { $gte: startDate };
        
        if (endDate) {
          query.date.$lte = endDate;
        }
      } else if (endDate) {
        query.date = { $lte: endDate };
      }
      
      // Find workouts with this exercise
      const workouts = await Workout.find(query).sort({ date: 1 }) as IWorkout[];
      
      // Process workout data to extract performance metrics
      const performanceData: Array<{
        date: Date;
        reps?: number;
        weight?: number;
        holdTime?: number;
        volume?: number;
        bodyweight?: number;
      }> = [];
      
      // Option to include bodyweight
      const includeBodyweight = url.searchParams.get('includeBodyweight') === 'true';
      
      // Extract performance data from each workout
      workouts.forEach(workout => {
        // Find sets for this exercise
        const exerciseSets = workout.sets.filter(set => {
          const setExerciseId = typeof set.exercise === 'string'
            ? set.exercise
            : set.exercise.toString();
          
          return setExerciseId === exerciseId;
        });
        
        // Skip if no sets for this exercise
        if (exerciseSets.length === 0) return;
        
        // Get max values for metrics from completed sets
        const completedSets = exerciseSets.filter(set => set.completed);
        if (completedSets.length === 0) return;
        
        // Find the best set based on weight × reps (volume)
        let bestSet = completedSets[0];
        let maxVolume = (bestSet.reps || 0) * (bestSet.weight || 1);
        
        completedSets.forEach(set => {
          const volume = (set.reps || 0) * (set.weight || 1);
          if (volume > maxVolume) {
            maxVolume = volume;
            bestSet = set;
          }
        });
        
        // Create performance data point
        const dataPoint: {
          date: Date;
          reps?: number;
          weight?: number;
          holdTime?: number;
          volume?: number;
          bodyweight?: number;
        } = {
          date: workout.date,
          reps: bestSet.reps,
          weight: bestSet.weight,
          holdTime: bestSet.holdTime,
          volume: maxVolume > 0 ? maxVolume : undefined
        };
        
        // Add bodyweight if requested and available
        if (includeBodyweight && workout.bodyweight) {
          dataPoint.bodyweight = workout.bodyweight;
        }
        
        performanceData.push(dataPoint);
      });
      
      // If we have no data, return an empty response
      if (performanceData.length === 0) {
        return apiResponse({
          exercise: {
            id: exercise._id.toString(),
            name: exercise.name,
            category: exercise.category
          },
          data: [],
          trends: {
            improvement: 0,
            volumeChange: 0,
            bestSet: {
              date: new Date().toISOString()
            }
          },
          timespan: {
            start: startDate ? startDate.toISOString() : new Date(0).toISOString(),
            end: endDate.toISOString(),
            days: startDate ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
          }
        }, true, 'No performance data found for this exercise');
      }
      
      // Calculate trend metrics if requested
      const calculateTrends = url.searchParams.get('calculateTrends') !== 'false'; // Default to true
      
      let trends = {
        improvement: 0,
        volumeChange: 0,
        bestSet: {
          date: performanceData[0].date.toISOString(),
          reps: performanceData[0].reps,
          weight: performanceData[0].weight,
          holdTime: performanceData[0].holdTime
        }
      };
      
      if (calculateTrends && performanceData.length > 1) {
        // Find the best performance
        let bestPerformance = performanceData[0];
        let maxVolume = (bestPerformance.reps || 0) * (bestPerformance.weight || 1);
        
        performanceData.forEach(perf => {
          const volume = (perf.reps || 0) * (perf.weight || 1);
          if (volume > maxVolume) {
            maxVolume = volume;
            bestPerformance = perf;
          }
        });
        
        // Calculate improvement from first to last
        const first = performanceData[0];
        const last = performanceData[performanceData.length - 1];
        
        const firstVolume = (first.reps || 0) * (first.weight || 1) || (first.holdTime || 0);
        const lastVolume = (last.reps || 0) * (last.weight || 1) || (last.holdTime || 0);
        
        if (firstVolume > 0) {
          trends.volumeChange = lastVolume - firstVolume;
          trends.improvement = Math.round((lastVolume / firstVolume - 1) * 100);
        }
        
        // Set the best performance details
        trends.bestSet = {
          date: bestPerformance.date.toISOString(),
          reps: bestPerformance.reps,
          weight: bestPerformance.weight,
          holdTime: bestPerformance.holdTime
        };
      }
      
      // Format response
      const response: WorkoutPerformanceData = {
        exercise: {
          id: exercise._id.toString(),
          name: exercise.name,
          category: exercise.category
        },
        data: performanceData.map(perf => {
          const formattedPerf: any = {
            date: perf.date.toISOString(),
            reps: perf.reps,
            weight: perf.weight,
            holdTime: perf.holdTime,
            volume: perf.volume
          };
          
          // Include bodyweight and calculate relative strength if available
          if (perf.bodyweight && perf.weight) {
            formattedPerf.bodyweight = perf.bodyweight;
            formattedPerf.relativeStrength = perf.weight / perf.bodyweight;
          }
          
          return formattedPerf;
        }),
        trends,
        timespan: {
          start: startDate ? startDate.toISOString() : performanceData[0].date.toISOString(),
          end: endDate.toISOString(),
          days: startDate 
            ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            : Math.floor((endDate.getTime() - new Date(performanceData[0].date).getTime()) / (1000 * 60 * 60 * 24))
        }
      };
      
      return apiResponse(response, true, 'Performance data retrieved successfully');
    } catch (error) {
      return handleApiError(error, "Error retrieving performance data");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);