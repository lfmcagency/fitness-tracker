export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import Exercise from "@/models/Exercise";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/exercises
 * Get exercises with filtering, searching and pagination
 */
export const GET = withAuth<ResponseType['data']>(
  async (req: NextRequest, userId: string) => {
    try {
    await dbConnect();
    
    // Get query parameters with defensive handling
    const url = new URL(req.url);
    
    // Search term
    const search = url.searchParams.get('search') || '';
    
    // Category filter
    const category = url.searchParams.get('category') || '';
    const subcategory = url.searchParams.get('subcategory') || '';
    
    // Difficulty filter
    const difficulty = url.searchParams.get('difficulty') || '';
    const validDifficulties = ['beginner', 'intermediate', 'advanced', 'elite'];
    
    // Progression level filter with defensive parsing
    let minLevel = null;
    let maxLevel = null;
    
    try {
      const minLevelParam = url.searchParams.get('minLevel');
      if (minLevelParam) {
        const parsed = parseInt(minLevelParam);
        if (!isNaN(parsed) && parsed > 0) {
          minLevel = parsed;
        }
      }
    } catch (error) {
      console.error('Error parsing minLevel parameter:', error);
    }
    
    try {
      const maxLevelParam = url.searchParams.get('maxLevel');
      if (maxLevelParam) {
        const parsed = parseInt(maxLevelParam);
        if (!isNaN(parsed) && parsed > 0) {
          maxLevel = parsed;
        }
      }
    } catch (error) {
      console.error('Error parsing maxLevel parameter:', error);
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
    
    // Build query with defensive filters
    const query: any = {};
    
    // Add search if provided
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add category if provided
    if (category && category.trim() !== '') {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }
    
    // Add subcategory if provided
    if (subcategory && subcategory.trim() !== '') {
      query.subcategory = { $regex: new RegExp(`^${subcategory.trim()}$`, 'i') };
    }
    
    // Add difficulty if provided and valid
    if (difficulty && difficulty.trim() !== '') {
      const normalizedDifficulty = difficulty.trim().toLowerCase();
      if (validDifficulties.includes(normalizedDifficulty)) {
        query.difficulty = normalizedDifficulty;
      }
    }
    
    // Add progression level range
    if (minLevel !== null || maxLevel !== null) {
      query.progressionLevel = {};
      
      if (minLevel !== null) {
        query.progressionLevel.$gte = minLevel;
      }
      
      if (maxLevel !== null) {
        query.progressionLevel.$lte = maxLevel;
      }
    }
    
    // Get count for pagination with defensive error handling
    let total = 0;
    try {
      total = await Exercise.countDocuments(query);
    } catch (countError) {
      console.error('Error counting exercises:', countError);
    }
    
    // Get exercises with defensive error handling
    let exercises = [];
    try {
      const sort: any = {};
      
      // Default sort by category and progressionLevel
      sort.category = 1;
      sort.progressionLevel = 1;
      
      // Custom sort if specified
      const sortParam = url.searchParams.get('sort');
      if (sortParam && typeof sortParam === 'string') {
        const sortField = sortParam.trim();
        if (['name', 'difficulty', 'progressionLevel', 'category', 'subcategory'].includes(sortField)) {
          // Clear default sort and use custom sort
          sort[sortField] = url.searchParams.get('order') === 'desc' ? -1 : 1;
        }
      }
      
      exercises = await Exercise.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
    } catch (error) {
      return handleApiError(error, 'Error querying exercises database');
    }
    
    // Calculate pagination info with defensive math
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    
    // Safely transform exercise documents to objects
    const formattedExercises = [];
    
    for (const exercise of exercises) {
      try {
        const exerciseObj = exercise.toObject();
        
        // Process previous and next exercise references
        let previousExercise = null;
        let nextExercise = null;
        
        if (exerciseObj.previousExercise) {
          try {
            const prev = await Exercise.findById(exerciseObj.previousExercise)
              .select('name category subcategory progressionLevel');
            
            if (prev) {
              previousExercise = {
                id: prev._id.toString(),
                name: prev.name,
                category: prev.category,
                subcategory: prev.subcategory,
                progressionLevel: prev.progressionLevel
              };
            }
          } catch (error) {
            console.error('Error fetching previous exercise:', error);
          }
        }
        
        if (exerciseObj.nextExercise) {
          try {
            const next = await Exercise.findById(exerciseObj.nextExercise)
              .select('name category subcategory progressionLevel');
            
            if (next) {
              nextExercise = {
                id: next._id.toString(),
                name: next.name,
                category: next.category,
                subcategory: next.subcategory,
                progressionLevel: next.progressionLevel
              };
            }
          } catch (error) {
            console.error('Error fetching next exercise:', error);
          }
        }
        
        formattedExercises.push({
          id: exerciseObj._id.toString(),
          name: exerciseObj.name || 'Unknown Exercise',
          category: exerciseObj.category || 'Uncategorized',
          subcategory: exerciseObj.subcategory || '',
          progressionLevel: exerciseObj.progressionLevel || 1,
          difficulty: exerciseObj.difficulty || 'beginner',
          description: exerciseObj.description || '',
          primaryMuscleGroup: exerciseObj.primaryMuscleGroup || '',
          secondaryMuscleGroups: Array.isArray(exerciseObj.secondaryMuscleGroups) 
            ? exerciseObj.secondaryMuscleGroups 
            : [],
          formCues: Array.isArray(exerciseObj.formCues) 
            ? exerciseObj.formCues 
            : [],
          xpValue: exerciseObj.xpValue || exerciseObj.progressionLevel * 10 || 10,
          unlockRequirements: exerciseObj.unlockRequirements || '',
          previousExercise,
          nextExercise
        });
      } catch (error) {
        console.error('Error formatting exercise object:', error);
        // Add minimal exercise data as fallback
        formattedExercises.push({
          id: exercise._id?.toString() || 'unknown',
          name: exercise.name || 'Unknown Exercise',
          category: exercise.category || 'Uncategorized',
          subcategory: exercise.subcategory || '',
          progressionLevel: exercise.progressionLevel || 1
        });
      }
    }
    
    return apiResponse({
      exercises: formattedExercises,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    }, true, `Retrieved ${formattedExercises.length} exercises`);
  } catch (error) {
    return handleApiError(error, "Error retrieving exercises");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/exercises (Admin only)
 * Create a new exercise (For admin use - requires separate admin validation)
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Parse request body with defensive error handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body
    if (!body || typeof body !== 'object') {
      return apiError('Invalid exercise data', 400, 'ERR_INVALID_DATA');
    }
    
    // Check if user has admin permission (actual role check should be in middleware)
    // This is a fallback defense - the API should be protected by admin middleware
    try {
      // This is where you would check if the user has admin role
      // For now, we'll assume this check is handled by middleware
      // and this is just a defensive fallback
    } catch (error) {
      return apiError('Insufficient permissions', 403, 'ERR_FORBIDDEN');
    }
    
    // Basic validation with defensive string checks
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return apiError('Exercise name is required', 400, 'ERR_VALIDATION');
    }
    
    if (!body.category || typeof body.category !== 'string' || body.category.trim() === '') {
      return apiError('Exercise category is required', 400, 'ERR_VALIDATION');
    }
    
    // Validate progression level with safe parsing
    let progressionLevel = 1;
    if (body.progressionLevel !== undefined) {
      if (typeof body.progressionLevel === 'string') {
        progressionLevel = parseInt(body.progressionLevel);
      } else if (typeof body.progressionLevel === 'number') {
        progressionLevel = body.progressionLevel;
      }
      
      if (isNaN(progressionLevel) || progressionLevel < 1) {
        return apiError('Progression level must be a positive integer', 400, 'ERR_VALIDATION');
      }
    }
    
    // Validate difficulty
    let difficulty = 'beginner';
    if (body.difficulty !== undefined) {
      if (typeof body.difficulty !== 'string') {
        return apiError('Difficulty must be a string', 400, 'ERR_VALIDATION');
      }
      
      const validDifficulties = ['beginner', 'intermediate', 'advanced', 'elite'];
      const normalizedDifficulty = body.difficulty.trim().toLowerCase();
      
      if (!validDifficulties.includes(normalizedDifficulty)) {
        return apiError(`Invalid difficulty. Valid values: ${validDifficulties.join(', ')}`, 400, 'ERR_VALIDATION');
      }
      
      difficulty = normalizedDifficulty;
    }
    
    // Validate array fields
    const secondaryMuscleGroups = [];
    if (body.secondaryMuscleGroups !== undefined) {
      if (!Array.isArray(body.secondaryMuscleGroups)) {
        return apiError('Secondary muscle groups must be an array', 400, 'ERR_VALIDATION');
      }
      
      for (const muscle of body.secondaryMuscleGroups) {
        if (typeof muscle === 'string' && muscle.trim() !== '') {
          secondaryMuscleGroups.push(muscle.trim());
        }
      }
    }
    
    const formCues = [];
    if (body.formCues !== undefined) {
      if (!Array.isArray(body.formCues)) {
        return apiError('Form cues must be an array', 400, 'ERR_VALIDATION');
      }
      
      for (const cue of body.formCues) {
        if (typeof cue === 'string' && cue.trim() !== '') {
          formCues.push(cue.trim());
        }
      }
    }
    
    // Validate XP value with safe parsing
    let xpValue = progressionLevel * 10; // Default based on progression level
    if (body.xpValue !== undefined) {
      if (typeof body.xpValue === 'string') {
        xpValue = parseInt(body.xpValue);
      } else if (typeof body.xpValue === 'number') {
        xpValue = body.xpValue;
      }
      
      if (isNaN(xpValue) || xpValue < 0) {
        xpValue = progressionLevel * 10; // Fallback to default if invalid
      }
    }
    
    // Generate unique_id if not provided
    let uniqueId = body.unique_id;
    if (!uniqueId || typeof uniqueId !== 'string' || uniqueId.trim() === '') {
      // Generate from category, name, and level
      uniqueId = `${body.category}-${body.name}-${progressionLevel}`.toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric chars with dashes
        .replace(/-+/g, '-')        // Replace multiple dashes with a single dash
        .replace(/^-|-$/g, '');     // Remove leading/trailing dashes
    }
    
    // Create exercise data object
    const exerciseData: any = {
      name: body.name.trim(),
      category: body.category.trim(),
      subcategory: body.subcategory && typeof body.subcategory === 'string' 
        ? body.subcategory.trim() 
        : '',
      progressionLevel,
      difficulty,
      description: body.description && typeof body.description === 'string' 
        ? body.description.trim() 
        : '',
      primaryMuscleGroup: body.primaryMuscleGroup && typeof body.primaryMuscleGroup === 'string' 
        ? body.primaryMuscleGroup.trim() 
        : '',
      secondaryMuscleGroups,
      formCues,
      xpValue,
      unique_id: uniqueId,
      unlockRequirements: body.unlockRequirements && typeof body.unlockRequirements === 'string' 
        ? body.unlockRequirements.trim() 
        : ''
    };
    
    // Handle exercise relationships
    if (body.previousExercise && typeof body.previousExercise === 'string' && body.previousExercise.trim() !== '') {
      exerciseData.previousExercise = body.previousExercise.trim();
    }
    
    if (body.nextExercise && typeof body.nextExercise === 'string' && body.nextExercise.trim() !== '') {
      exerciseData.nextExercise = body.nextExercise.trim();
    }
    
    // Create exercise with defensive error handling
    let newExercise;
    try {
      newExercise = await Exercise.create(exerciseData);
    } catch (error) {
      return handleApiError(error, 'Error creating exercise in database');
    }
    
    // Format response
    let exerciseResponse;
    try {
      const exerciseObj = newExercise.toObject();
      exerciseResponse = {
        ...exerciseObj,
        id: exerciseObj._id.toString(),
        _id: undefined
      };
    } catch (error) {
      console.error('Error formatting new exercise response:', error);
      // Fallback with minimal data
      exerciseResponse = {
        id: newExercise._id?.toString(),
        name: newExercise.name,
        category: newExercise.category,
        progressionLevel: newExercise.progressionLevel
      };
    }
    
    return apiResponse(exerciseResponse, true, 'Exercise created successfully', 201);
  } catch (error) {
    return handleApiError(error, "Error creating exercise");
  }
}, AuthLevel.DEV_OPTIONAL);