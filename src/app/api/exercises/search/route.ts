// src/app/api/exercises/search/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';;
import Exercise from "@/models/Exercise";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/exercises/search
 * Search exercises with advanced filtering and pagination
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get query parameters with defensive handling
    const url = new URL(req.url);
    
    // Search term (required)
    const search = url.searchParams.get('q') || url.searchParams.get('query') || '';
    
    if (!search || typeof search !== 'string' || search.trim() === '') {
      return apiError('Search query is required', 400, 'ERR_VALIDATION');
    }
    
    // Pagination with defensive parsing
    let page = DEFAULT_PAGE;
    let limit = DEFAULT_LIMIT;
    
    try {
      const pageParam = url.searchParams.get('page');
      if (pageParam) {
        const parsedPage = parseInt(pageParam);
        if (!isNaN(parsedPage) && parsedPage > 0) {
          page = parsedPage;
        }
      }
    } catch (error) {
      console.error('Error parsing page parameter:', error);
    }
    
    try {
      const limitParam = url.searchParams.get('limit');
      if (limitParam) {
        const parsedLimit = parseInt(limitParam);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, MAX_LIMIT);
        }
      }
    } catch (error) {
      console.error('Error parsing limit parameter:', error);
    }
    
    const skip = (page - 1) * limit;
    
    // Additional filters
    const filters: any = {};
    
    // Category filter
    const category = url.searchParams.get('category');
    if (category && typeof category === 'string' && category.trim() !== '') {
      filters.category = { $regex: new RegExp(category.trim(), 'i') };
    }
    
    // Subcategory filter
    const subcategory = url.searchParams.get('subcategory');
    if (subcategory && typeof subcategory === 'string' && subcategory.trim() !== '') {
      filters.subcategory = { $regex: new RegExp(subcategory.trim(), 'i') };
    }
    
    // Difficulty filter
    const difficulty = url.searchParams.get('difficulty');
    if (difficulty && typeof difficulty === 'string') {
      const validDifficulties = ['beginner', 'intermediate', 'advanced', 'elite'];
      const normalizedDifficulty = difficulty.trim().toLowerCase();
      
      if (validDifficulties.includes(normalizedDifficulty)) {
        filters.difficulty = normalizedDifficulty;
      }
    }
    
    // Muscle group filter
    const muscleGroup = url.searchParams.get('muscle') || url.searchParams.get('muscleGroup');
    if (muscleGroup && typeof muscleGroup === 'string' && muscleGroup.trim() !== '') {
      const musclePattern = new RegExp(muscleGroup.trim(), 'i');
      filters.$or = [
        { primaryMuscleGroup: { $regex: musclePattern } },
        { secondaryMuscleGroups: { $elemMatch: { $regex: musclePattern } } }
      ];
    }
    
    // Progression level filter
    const minLevel = url.searchParams.get('minLevel');
    const maxLevel = url.searchParams.get('maxLevel');
    
    if (minLevel || maxLevel) {
      filters.progressionLevel = {};
      
      if (minLevel) {
        try {
          const parsedMinLevel = parseInt(minLevel);
          if (!isNaN(parsedMinLevel) && parsedMinLevel > 0) {
            filters.progressionLevel.$gte = parsedMinLevel;
          }
        } catch (error) {
          console.error('Error parsing minLevel parameter:', error);
        }
      }
      
      if (maxLevel) {
        try {
          const parsedMaxLevel = parseInt(maxLevel);
          if (!isNaN(parsedMaxLevel) && parsedMaxLevel > 0) {
            filters.progressionLevel.$lte = parsedMaxLevel;
          }
        } catch (error) {
          console.error('Error parsing maxLevel parameter:', error);
        }
      }
    }
    
    // Build search query
    const searchTerms = search.trim().split(/\s+/).filter(Boolean);
    const searchPattern = searchTerms.map(term => `(?=.*${term})`).join('');
    const searchRegex = new RegExp(searchPattern, 'i');
    
    const query = {
      $and: [
        {
          $or: [
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { primaryMuscleGroup: { $regex: searchRegex } },
            { formCues: { $elemMatch: { $regex: searchRegex } } }
          ]
        },
        filters
      ]
    };
    
    // Get count for pagination with defensive error handling
    let total = 0;
    try {
      total = await Exercise.countDocuments(query);
    } catch (countError) {
      console.error('Error counting search results:', countError);
    }
    
    // Execute search with defensive error handling
    let exercises = [];
    try {
      exercises = await Exercise.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);
    } catch (error) {
      return handleApiError(error, 'Error executing exercise search');
    }
    
    // Calculate pagination info with defensive math
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    
    // Process search results with defensive handling
    const searchResults = [];
    
    for (const exercise of exercises) {
      try {
        const exerciseObj = exercise.toObject();
        
        // Create search result with matched highlight info
        searchResults.push({
          id: exerciseObj._id.toString(),
          name: exerciseObj.name || 'Unknown Exercise',
          category: exerciseObj.category || 'Uncategorized',
          subcategory: exerciseObj.subcategory || '',
          progressionLevel: exerciseObj.progressionLevel || 1,
          difficulty: exerciseObj.difficulty || 'beginner',
          description: exerciseObj.description || '',
          primaryMuscleGroup: exerciseObj.primaryMuscleGroup || '',
          // Only include key fields in search results
          secondaryMuscleGroups: Array.isArray(exerciseObj.secondaryMuscleGroups) 
            ? exerciseObj.secondaryMuscleGroups 
            : [],
          // Generate relevance score - for now just a simple match count
          relevance: countMatches(
            [
              exerciseObj.name, 
              exerciseObj.description, 
              exerciseObj.primaryMuscleGroup
            ].join(' '), 
            searchTerms
          )
        });
      } catch (error) {
        console.error('Error processing search result:', error);
        // Add minimal exercise data as fallback
        searchResults.push({
          id: exercise._id?.toString() || 'unknown',
          name: exercise.name || 'Unknown Exercise',
          category: exercise.category || 'Uncategorized',
          relevance: 0
        });
      }
    }
    
    // Sort by relevance if we have relevance scores
    searchResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    
    // Return search results
    return apiResponse({
      query: search,
      results: searchResults,
      filters: {
        category: category || null,
        subcategory: subcategory || null,
        difficulty: difficulty || null,
        muscleGroup: muscleGroup || null,
        progressionLevel: {
          min: filters.progressionLevel?.$gte || null,
          max: filters.progressionLevel?.$lte || null
        }
      },
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    }, true, `Found ${total} exercises matching "${search}"`);
  } catch (error) {
    return handleApiError(error, "Error searching exercises");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * Helper function to count matches of search terms in text
 */
function countMatches(text: string, terms: string[]): number {
  if (!text || !terms || terms.length === 0) return 0;
  
  try {
    text = text.toLowerCase();
    let matches = 0;
    
    for (const term of terms) {
      if (!term) continue;
      
      const regex = new RegExp(term.toLowerCase(), 'g');
      const count = (text.match(regex) || []).length;
      matches += count;
      
      // Exact match bonus
      if (text.includes(` ${term.toLowerCase()} `)) {
        matches += 2;
      }
    }
    
    return matches;
  } catch (error) {
    console.error('Error counting matches:', error);
    return 0;
  }
}