import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import Exercise from '@/models/Exercise';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { IExercise, ExerciseCategory, ExerciseDifficulty } from '@/types/models/exercise';
import { extractPagination } from '@/lib/validation';
import { convertExerciseToResponse, ExerciseData } from '@/types/converters/exerciseConverters';
import UserProgress from '@/models/UserProgress';
import { IUserProgress } from '@/types/models/progress';
import mongoose from 'mongoose';

/**
 * Exercise search response interface
 */
interface ExerciseSearchResult extends ExerciseData {
  relevance: number;
}

/**
 * Complete search response structure
 */
interface SearchResponse {
  query: string;
  results: ExerciseSearchResult[];
  filters: {
    categories: string[];
    difficulties: string[];
    subcategories: string[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * GET /api/exercises/search
 * Search exercises with text search, filtering, and pagination
 */
export const GET = withAuth<SearchResponse>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    
    // Parse query parameters
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('q') || '';
    const categoryFilter = url.searchParams.get('category');
    const difficultyFilter = url.searchParams.get('difficulty');
    const subcategoryFilter = url.searchParams.get('subcategory');
    
    // Extract pagination with safe defaults
    const { page, limit, skip } = extractPagination(url);
    
    // Build MongoDB query with text search if provided
    const query: Record<string, any> = {};
    
    if (searchQuery && searchQuery.trim() !== '') {
      query.$text = { $search: searchQuery };
    }
    
    // Add optional filters with type validation
    if (categoryFilter && categoryFilter.trim() !== '') {
      query.category = categoryFilter;
    }
    
    if (subcategoryFilter && subcategoryFilter.trim() !== '') {
      query.subcategory = subcategoryFilter;
    }
    
    if (difficultyFilter && difficultyFilter.trim() !== '') {
      // Validate difficulty is one of the allowed values
      const validDifficulties: ExerciseDifficulty[] = ['beginner', 'intermediate', 'advanced', 'elite'];
      if (validDifficulties.includes(difficultyFilter as ExerciseDifficulty)) {
        query.difficulty = difficultyFilter;
      }
    }
    
    // Execute query with pagination, sorting and projection
    const totalCount = await Exercise.countDocuments(query);
    
    // FIX 1: Handle the sorting parameter properly
    let exercisesQuery = Exercise.find(query);
    
    // Apply sort options based on search type
    if (searchQuery && searchQuery.trim() !== '') {
      // For text search, we need to use specific MongoDB syntax
      // This is a special case where we need to explicitly set the projection and sort
      exercisesQuery = exercisesQuery
        .select({ score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } } as any); // Type assertion needed for MongoDB special operator
    } else {
      // Regular sorting by progression level
      exercisesQuery = exercisesQuery.sort({ progressionLevel: 1 });
    }
    
    // Apply pagination
    const exercises = await exercisesQuery
      .skip(skip)
      .limit(limit || 10) as IExercise[];
    
    // Get user progress to determine unlocked exercises
    const userProgress = await UserProgress.findOne({ user: userId }) as IUserProgress | null;
    
    // Safely extract unlocked exercise IDs
    const unlockedExerciseIds: string[] = [];
    
    if (userProgress && userProgress.categoryProgress) {
      // Collect unlocked exercises from all categories
      for (const category of Object.values(userProgress.categoryProgress)) {
        if (category && Array.isArray(category.unlockedExercises)) {
          category.unlockedExercises.forEach(id => {
            unlockedExerciseIds.push(id.toString());
          });
        }
      }
    }
    
    // Convert to response format with calculated relevance
    const results: ExerciseSearchResult[] = exercises.map(exercise => {
      // FIX 2: Handle the score value safely
      let relevance = 0;
      if (searchQuery.trim() !== '') {
        // Access the score from the exercise document - MongoDB stores it as a property
        const textScore = (exercise as any).score;
        relevance = typeof textScore === 'number' ? textScore : 0;
      } else {
        // Calculate based on progression level
        const level = exercise.progressionLevel || 1; // Default to 1 if undefined
        relevance = 1 - (level / 10);
      }
      
      // Check if this exercise is unlocked for the user
      const isUnlocked = unlockedExerciseIds.includes(exercise._id.toString());
      
      // Convert exercise to response format
      const responseData = convertExerciseToResponse(exercise, {
        includeProgress: true,
        unlocked: isUnlocked
      });
      
      // Return the combined result with relevance score
      return {
        ...responseData,
        relevance: Number(relevance.toFixed(2)) // Ensure it's a number with 2 decimal places
      };
    });
    
    // Get distinct values for filters
    const categoriesPromise = Exercise.distinct('category').exec();
    const difficultiesPromise = Exercise.distinct('difficulty').exec();
    const subcategoriesPromise = Exercise.distinct('subcategory').exec();
    
    // Execute all filter queries in parallel
    const [categories, difficulties, subcategories] = await Promise.all([
      categoriesPromise,
      difficultiesPromise,
      subcategoriesPromise
    ]);
    
    // Ensure we have valid pagination values for the response
    const validatedPage = page;
    const validatedLimit = limit;
    
    // FIX 3: Calculate total pages safely
    const totalPages = Math.max(1, Math.ceil(totalCount / (validatedLimit || 1)));
    
    // Return formatted response
    return apiResponse<SearchResponse>({
      query: searchQuery,
      results,
      filters: {
        categories: categories.filter(Boolean), // Remove null/empty values
        difficulties: difficulties.filter(Boolean),
        subcategories: subcategories.filter(Boolean)
      },
      pagination: {
        total: totalCount,
        page: validatedPage || 1,
        limit: validatedLimit || 10, // Provide a default value of 10 if undefined
        pages: totalPages
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error searching exercises');
  }
}, AuthLevel.DEV_OPTIONAL);