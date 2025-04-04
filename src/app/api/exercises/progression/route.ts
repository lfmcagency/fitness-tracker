// src/app/api/exercises/progression/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Exercise from "@/models/Exercise";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import { 
  ProgressionData,
  CategoryProgressionData,
  ExerciseData
} from "@/types/api/exerciseResponses";
import { IExercise } from '@/models/Exercise';

/**
 * GET /api/exercises/progression
 * Get progression path for a specific exercise or category
 */
export const GET = withAuth<ProgressionData | CategoryProgressionData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Get query parameters with defensive handling
      const url = new URL(req.url);
      
      // Exercise ID or category are required
      const exerciseId = url.searchParams.get('exerciseId') || null;
      const category = url.searchParams.get('category') || null;
      const subcategory = url.searchParams.get('subcategory') || null;
      
      // At least one filter is required
      if (!exerciseId && !category) {
        return apiError('Either exerciseId or category is required', 400, 'ERR_VALIDATION');
      }
      
      // Validate exerciseId if provided
      if (exerciseId && !isValidObjectId(exerciseId)) {
        return apiError('Invalid exercise ID format', 400, 'ERR_VALIDATION');
      }
      
      // Case 1: Progression for a specific exercise
      if (exerciseId) {
        try {
          // Find the target exercise
          const targetExercise = await Exercise.findById(exerciseId) as IExercise | null;
          
          if (!targetExercise) {
            return apiError('Exercise not found', 404, 'ERR_NOT_FOUND');
          }
          
          // Create a basic exercise info object
          const exerciseInfo: ExerciseData = {
            id: targetExercise._id.toString(),
            name: targetExercise.name || 'Unknown Exercise',
            category: targetExercise.category || 'Uncategorized',
            subcategory: targetExercise.subcategory || '',
            progressionLevel: targetExercise.progressionLevel || 1,
            difficulty: targetExercise.difficulty || 'beginner',
            xpValue: targetExercise.xpValue || 10,
            formCues: Array.isArray(targetExercise.formCues) 
              ? targetExercise.formCues 
              : typeof targetExercise.formCues === 'string'
                ? targetExercise.formCues.split(',').map(cue => cue.trim())
                : [],
            secondaryMuscleGroups: Array.isArray(targetExercise.secondaryMuscleGroups)
              ? targetExercise.secondaryMuscleGroups
              : typeof targetExercise.secondaryMuscleGroups === 'string'
                ? targetExercise.secondaryMuscleGroups.split(',').map(group => group.trim())
                : []
          };
          
          // Find the root exercise (lowest progression level in the chain)
          const rootExercise = await findRootExercise(targetExercise);
          
          // Build the full progression path
          const progressionPath = await buildProgressionPath(rootExercise);
          
          return apiResponse({
            exercise: exerciseInfo,
            progressionPath,
            root: rootExercise ? {
              id: rootExercise._id.toString(),
              name: rootExercise.name,
              progressionLevel: rootExercise.progressionLevel
            } : null
          }, true, 'Exercise progression retrieved successfully');
        } catch (error) {
          return handleApiError(error, 'Error retrieving exercise progression');
        }
      }
      // Case 2: Progression for a category/subcategory
      else if (category) {
        try {
          // Find all exercises in the category
          const query: Record<string, any> = { category: { $regex: new RegExp(`^${category}$`, 'i') } };
          
          // Add subcategory if provided
          if (subcategory) {
            query.subcategory = { $regex: new RegExp(`^${subcategory}$`, 'i') };
          }
          
          // Get exercises sorted by progression level
          const exercises = await Exercise.find(query)
            .sort({ progressionLevel: 1 }) as IExercise[];
          
          if (!exercises || exercises.length === 0) {
            return apiError('No exercises found in the specified category', 404, 'ERR_NOT_FOUND');
          }
          
          // Process exercises to build progression tree(s)
          const progressionTrees = await buildCategoryProgressionTrees(exercises);
          
          return apiResponse({
            category,
            subcategory: subcategory || null,
            progressionTrees,
            exerciseCount: exercises.length
          }, true, `Category progression trees retrieved successfully`);
        } catch (error) {
          return handleApiError(error, 'Error retrieving category progression');
        }
      }
      
      // This should never be reached due to the validation above
      return apiError('Invalid request parameters', 400, 'ERR_VALIDATION');
    } catch (error) {
      return handleApiError(error, "Error retrieving exercise progression");
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * Helper function to find the root exercise in a progression chain
 * (the exercise with the lowest progression level with no previous exercise)
 */
async function findRootExercise(exercise: IExercise | null): Promise<IExercise | null> {
  try {
    if (!exercise) return null;
    
    let current: IExercise = exercise;
    let root: IExercise = current;
    let visited = new Set([current._id.toString()]);
    
    // Trace backwards until we find an exercise with no previous link
    // or until we detect a cycle
    while (current.previousExercise) {
      try {
        const previousId = current.previousExercise.toString();
        
        // Detect cycles to prevent infinite loops
        if (visited.has(previousId)) {
          console.error('Cycle detected in exercise progression chain');
          break;
        }
        
        visited.add(previousId);
        
        // Get the previous exercise
        const prev = await Exercise.findById(previousId) as IExercise | null;
        
        // If previous exercise doesn't exist, break the chain
        if (!prev) break;
        
        current = prev;
        
        // Update root if this exercise has a lower progression level
        if (!root.progressionLevel || current.progressionLevel < root.progressionLevel) {
          root = current;
        }
      } catch (error) {
        console.error('Error tracing previous exercise:', error);
        break;
      }
    }
    
    return root;
  } catch (error) {
    console.error('Error finding root exercise:', error);
    return exercise; // Return the original exercise as fallback
  }
}

/**
 * Helper function to build a complete progression path from root to end
 */
async function buildProgressionPath(rootExercise: IExercise | null): Promise<ExerciseData[]> {
  try {
    if (!rootExercise) return [];
    
    const path: ExerciseData[] = [];
    let current: IExercise = rootExercise;
    let visited = new Set([current._id.toString()]);
    
    // Start with the root
    path.push({
      id: current._id.toString(),
      name: current.name,
      category: current.category,
      subcategory: current.subcategory || '',
      progressionLevel: current.progressionLevel || 1,
      difficulty: current.difficulty || 'beginner',
      xpValue: current.xpValue || current.progressionLevel * 10 || 10,
      unlockRequirements: current.unlockRequirements || '',
      formCues: Array.isArray(current.formCues) 
        ? current.formCues 
        : typeof current.formCues === 'string'
          ? current.formCues.split(',').map(cue => cue.trim())
          : [],
      secondaryMuscleGroups: Array.isArray(current.secondaryMuscleGroups)
        ? current.secondaryMuscleGroups
        : typeof current.secondaryMuscleGroups === 'string'
          ? current.secondaryMuscleGroups.split(',').map(group => group.trim())
          : []
    });
    
    // Follow the next links to build the complete path
    while (current.nextExercise) {
      try {
        const nextId = current.nextExercise.toString();
        
        // Detect cycles to prevent infinite loops
        if (visited.has(nextId)) {
          console.error('Cycle detected in exercise progression chain');
          break;
        }
        
        visited.add(nextId);
        
        // Get the next exercise
        const next = await Exercise.findById(nextId) as IExercise | null;
        
        // If next exercise doesn't exist, break the chain
        if (!next) break;
        
        current = next;
        
        // Add to path
        path.push({
          id: current._id.toString(),
          name: current.name,
          category: current.category,
          subcategory: current.subcategory || '',
          progressionLevel: current.progressionLevel || path.length + 1,
          difficulty: current.difficulty || 'beginner',
          xpValue: current.xpValue || current.progressionLevel * 10 || 10,
          unlockRequirements: current.unlockRequirements || '',
          formCues: Array.isArray(current.formCues) 
            ? current.formCues 
            : typeof current.formCues === 'string'
              ? current.formCues.split(',').map(cue => cue.trim())
              : [],
          secondaryMuscleGroups: Array.isArray(current.secondaryMuscleGroups)
            ? current.secondaryMuscleGroups
            : typeof current.secondaryMuscleGroups === 'string'
              ? current.secondaryMuscleGroups.split(',').map(group => group.trim())
              : []
        });
      } catch (error) {
        console.error('Error tracing next exercise:', error);
        break;
      }
    }
    
    return path;
  } catch (error) {
    console.error('Error building progression path:', error);
    return []; // Return empty array as fallback
  }
}

/**
 * Helper function to build progression trees for a category
 */
async function buildCategoryProgressionTrees(exercises: IExercise[]): Promise<CategoryProgressionData['progressionTrees']> {
  try {
    if (!exercises || exercises.length === 0) {
      return {
        trees: [],
        bySubcategory: {},
        rootCount: 0
      };
    }
    
    // Find all potential root exercises (those with no previous exercise)
    const roots = exercises.filter(ex => !ex.previousExercise);
    
    // If no roots are found, find exercises with the lowest progression level
    let rootsToUse = [...roots];
    if (roots.length === 0) {
      let minLevel = Math.min(...exercises.map(ex => ex.progressionLevel || 999));
      const lowestLevelExercises = exercises.filter(ex => (ex.progressionLevel || 999) === minLevel);
      
      // Add them as roots
      rootsToUse = [...lowestLevelExercises];
    }
    
    // Build progression path for each root
    const trees: Array<{
      root: {
        id: string;
        name: string;
        progressionLevel: number;
      };
      exercises: ExerciseData[];
      length: number;
      category: string;
      subcategory: string | null;
    }> = [];
    
    for (const root of rootsToUse) {
      try {
        // Build path for this root
        const path = await buildProgressionPath(root);
        
        // Only add non-empty paths
        if (path.length > 0) {
          trees.push({
            root: {
              id: root._id.toString(),
              name: root.name,
              progressionLevel: root.progressionLevel || 1
            },
            exercises: path,
            length: path.length,
            category: root.category,
            subcategory: root.subcategory || null
          });
        }
      } catch (error) {
        console.error(`Error building progression tree for ${root.name}:`, error);
      }
    }
    
    // Group trees by subcategory if any exist
    const subcategories: Record<string, any[]> = {};
    for (const tree of trees) {
      const subcategoryKey = tree.subcategory || 'Uncategorized';
      if (!subcategories[subcategoryKey]) {
        subcategories[subcategoryKey] = [];
      }
      subcategories[subcategoryKey].push(tree);
    }
    
    return {
      trees,
      bySubcategory: subcategories,
      rootCount: rootsToUse.length
    };
  } catch (error) {
    console.error('Error building category progression trees:', error);
    return {
      trees: [],
      bySubcategory: {},
      rootCount: 0
    };
  }
}