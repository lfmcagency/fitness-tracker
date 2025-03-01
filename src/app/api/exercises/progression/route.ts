export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

/**
 * GET /api/exercises/progression
 * 
 * Fetch complete exercise progression paths
 * Based on category/subcategory or starting from specific exercise
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const exerciseId = searchParams.get('exerciseId');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const difficulty = searchParams.get('difficulty');
    
    // Return progression paths based on different query types
    if (exerciseId) {
      // Case 1: Progression path from a specific exercise
      if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
        return apiError(`Invalid exercise ID: ${exerciseId}`, 400);
      }
      
      const exercise = await Exercise.findById(exerciseId);
      
      if (!exercise) {
        return apiError(`Exercise with ID ${exerciseId} not found`, 404);
      }
      
      const progressionPath = await getFullProgressionPath(exercise);
      
      return apiResponse({
        progressionPath,
        exerciseName: exercise.name,
        category: exercise.category,
        subcategory: exercise.subcategory
      });
    } else if (category) {
      // Case 2: Progression paths for a category/subcategory
      
      // Find all root exercises (those without previous exercises)
      // or the lowest progression level exercises in each subcategory
      const query: any = { category };
      
      if (subcategory) {
        query.subcategory = subcategory;
      }
      
      if (difficulty) {
        query.difficulty = difficulty;
      }
      
      // Find all exercises in each category/subcategory grouped by subcategory
      const exercises = await Exercise.find(query)
        .sort({ subcategory: 1, progressionLevel: 1 })
        .select('name category subcategory progressionLevel difficulty uniqueId previousExercise nextExercise');
      
      // Group exercises by subcategory
      const subcategories: Record<string, any[]> = {};
      
      for (const exercise of exercises) {
        const sub = exercise.subcategory || 'general';
        
        if (!subcategories[sub]) {
          subcategories[sub] = [];
        }
        
        subcategories[sub].push(exercise);
      }
      
      // Build progression paths for each subcategory
      const progressionPaths: Record<string, any[]> = {};
      
      for (const sub in subcategories) {
        // Find potential root exercises (lowest progression level in subcategory)
        const exercisesInSub = subcategories[sub];
        
        // Group exercises by unique progression paths
        const paths = [];
        const processedIds = new Set();
        
        // First, find all real root exercises (no previous exercise)
        const rootExercises = exercisesInSub.filter(ex => !ex.previousExercise);
        
        // Build paths from each root exercise
        for (const rootExercise of rootExercises) {
          if (!processedIds.has(rootExercise._id.toString())) {
            const path = await getForwardProgressionPath(rootExercise);
            
            // Mark all exercises in this path as processed
            path.forEach(ex => processedIds.add(ex._id.toString()));
            
            paths.push(path);
          }
        }
        
        // Then look for orphaned paths (exercises without roots)
        for (const exercise of exercisesInSub) {
          if (!processedIds.has(exercise._id.toString())) {
            // This exercise is not part of any path yet
            // Find the head of its path
            const head = await findHeadOfPath(exercise);
            const path = await getForwardProgressionPath(head);
            
            // Mark all exercises in this path as processed
            path.forEach(ex => processedIds.add(ex._id.toString()));
            
            paths.push(path);
          }
        }
        
        progressionPaths[sub] = paths;
      }
      
      return apiResponse({
        category,
        subcategory: subcategory || 'all',
        progressionPaths
      });
    } else {
      // Case 3: No specific parameters provided
      // Return category summary with count of exercise paths
      
      // Get all categories
      const categories = await Exercise.distinct('category');
      
      const summary = [];
      
      for (const cat of categories) {
        // Get subcategories for this category
        const subcategories = await Exercise.distinct('subcategory', { category: cat });
        
        // Get count of root exercises in this category
        const rootExerciseCount = await Exercise.countDocuments({ 
          category: cat,
          previousExercise: { $exists: false }
        });
        
        // Get total exercise count in this category
        const totalExerciseCount = await Exercise.countDocuments({ category: cat });
        
        summary.push({
          category: cat,
          subcategories,
          rootExerciseCount,
          totalExerciseCount
        });
      }
      
      return apiResponse({
        categories: summary,
        message: 'Provide category or exerciseId parameter for detailed progression paths'
      });
    }
  } catch (error) {
    return handleApiError(error, 'Error fetching exercise progressions');
  }
}

/**
 * Helper function to get the full progression path (previous and next) for an exercise
 */
async function getFullProgressionPath(exercise: any) {
  const path = [exercise];
  
  // Get all previous exercises in the progression
  let current = exercise;
  while (current.previousExercise) {
    const previousId = typeof current.previousExercise === 'object' 
      ? current.previousExercise._id 
      : current.previousExercise;
      
    const prev = await Exercise.findById(previousId)
      .select('name progressionLevel difficulty uniqueId previousExercise nextExercise subcategory');
      
    if (!prev) break;
    
    path.unshift(prev);
    current = prev;
  }
  
  // Reset to the original exercise
  current = exercise;
  
  // Get all next exercises in the progression
  while (current.nextExercise) {
    const nextId = typeof current.nextExercise === 'object'
      ? current.nextExercise._id
      : current.nextExercise;
      
    const next = await Exercise.findById(nextId)
      .select('name progressionLevel difficulty uniqueId previousExercise nextExercise subcategory');
      
    if (!next) break;
    
    path.push(next);
    current = next;
  }
  
  return path;
}

/**
 * Helper function to get only the forward path from an exercise
 */
async function getForwardProgressionPath(exercise: any) {
  const path = [exercise];
  
  // Get all next exercises in the progression
  let current = exercise;
  while (current.nextExercise) {
    const nextId = typeof current.nextExercise === 'object'
      ? current.nextExercise._id
      : current.nextExercise;
      
    const next = await Exercise.findById(nextId)
      .select('name progressionLevel difficulty uniqueId previousExercise nextExercise subcategory');
      
    if (!next) break;
    
    path.push(next);
    current = next;
  }
  
  return path;
}

/**
 * Find the head of a progression path by following previousExercise links
 */
async function findHeadOfPath(exercise: any) {
  let current = exercise;
  
  while (current.previousExercise) {
    const previousId = typeof current.previousExercise === 'object'
      ? current.previousExercise._id
      : current.previousExercise;
      
    const prev = await Exercise.findById(previousId)
      .select('name progressionLevel difficulty uniqueId previousExercise nextExercise subcategory');
      
    if (!prev) break;
    
    current = prev;
  }
  
  return current;
}