export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import Exercise from '@/models/Exercise';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

/**
 * GET /api/exercises
 * 
 * Fetch exercises with advanced filtering, sorting, and pagination
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    
    // Filtering parameters
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const difficulty = searchParams.get('difficulty');
    const minLevel = searchParams.get('minLevel');
    const maxLevel = searchParams.get('maxLevel');
    const level = searchParams.get('level');
    const hasPrevious = searchParams.get('hasPrevious');
    const hasNext = searchParams.get('hasNext');
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Max 100 items
    const page = parseInt(searchParams.get('page') || '1', 10);
    
    // Sorting parameters
    const sortField = searchParams.get('sortBy') || 'progressionLevel';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
    
    // Fields selection
    const fields = searchParams.get('fields')?.split(',').join(' ') || 
      'name category subcategory progressionLevel difficulty description uniqueId';
    
    // Build query
    const query: any = {};
    
    // Apply filters
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (difficulty) query.difficulty = difficulty;
    if (level) {
      query.progressionLevel = parseInt(level, 10);
    } else {
      // Range queries for progression level
      if (minLevel) query.progressionLevel = { ...query.progressionLevel, $gte: parseInt(minLevel, 10) };
      if (maxLevel) query.progressionLevel = { ...query.progressionLevel, $lte: parseInt(maxLevel, 10) };
    }
    
    // Previous/Next relationship filters
    if (hasPrevious === 'true') query.previousExercise = { $exists: true, $ne: null };
    if (hasPrevious === 'false') query.previousExercise = { $exists: false };
    if (hasNext === 'true') query.nextExercise = { $exists: true, $ne: null };
    if (hasNext === 'false') query.nextExercise = { $exists: false };
    
    // Pagination
    const skip = (page - 1) * limit;
    
    // Prepare sort object
    const sort: Record<string, number> = {};
    sort[sortField] = sortOrder;
    
    // Add secondary sort to ensure consistent ordering
    if (sortField !== 'category') sort.category = 1;
    if (sortField !== 'progressionLevel') sort.progressionLevel = 1;
    
    // Execute query
    const exercises = await Exercise.find(query)
      .select(fields)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Exercise.countDocuments(query);
    
    return apiResponse({
      exercises: exercises || [], // Ensure data is always an array
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      filters: {
        category,
        subcategory,
        difficulty,
        level: level ? parseInt(level, 10) : undefined,
        minLevel: minLevel ? parseInt(minLevel, 10) : undefined,
        maxLevel: maxLevel ? parseInt(maxLevel, 10) : undefined,
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching exercises');
  }
}

/**
 * POST /api/exercises
 * 
 * Create a new exercise
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Parse request body
    const data = await req.json();
    
    // Validate required fields
    if (!data.name || !data.category) {
      return apiError('Name and category are required fields', 400);
    }
    
    // Check for unique ID if provided
    if (data.uniqueId) {
      const existingExercise = await Exercise.findOne({ uniqueId: data.uniqueId });
      if (existingExercise) {
        return apiError(`Exercise with uniqueId '${data.uniqueId}' already exists`, 409);
      }
    }
    
    // Handle relationships by ID
    if (data.previousExerciseId) {
      const prevExists = await Exercise.exists({ _id: data.previousExerciseId });
      if (!prevExists) {
        return apiError(`Previous exercise with ID '${data.previousExerciseId}' not found`, 400);
      }
      data.previousExercise = data.previousExerciseId;
      delete data.previousExerciseId;
    }
    
    if (data.nextExerciseId) {
      const nextExists = await Exercise.exists({ _id: data.nextExerciseId });
      if (!nextExists) {
        return apiError(`Next exercise with ID '${data.nextExerciseId}' not found`, 400);
      }
      data.nextExercise = data.nextExerciseId;
      delete data.nextExerciseId;
    }
    
    // Create new exercise
    const exercise = new Exercise(data);
    await exercise.save();
    
    // Update relationships in the other direction if needed
    if (exercise.previousExercise) {
      await Exercise.findByIdAndUpdate(
        exercise.previousExercise,
        { nextExercise: exercise._id }
      );
    }
    
    if (exercise.nextExercise) {
      await Exercise.findByIdAndUpdate(
        exercise.nextExercise,
        { previousExercise: exercise._id }
      );
    }
    
    return apiResponse(exercise, 'Exercise created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'Error creating exercise');
  }
}