export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { 
  ProgressCategory, 
  VALID_CATEGORIES, 
  getCategoryStatistics, 
  getRecentCategoryActivity 
} from '@/lib/category-progress';
import { Exercise } from '@/models/Exercise';

/**
 * GET /api/progress/category/[category]
 * 
 * Retrieves detailed progress for a specific exercise category.
 * 
 * Path parameters:
 * - category: 'core' | 'push' | 'pull' | 'legs' - The category to get progress for
 * 
 * Query parameters:
 * - includeExercises: boolean - Whether to include unlocked exercises details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    // Validate category parameter with defensive check
    const category = params?.category;
    
    if (!category || typeof category !== 'string' || !VALID_CATEGORIES.includes(category as ProgressCategory)) {
      return apiError(
        `Invalid category: ${category}. Valid categories are: ${VALID_CATEGORIES.join(', ')}`,
        400,
        'ERR_INVALID_CATEGORY'
      );
    }
    
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication in production
    if (!session && process.env.NODE_ENV === 'production') {
      return apiError('Authentication required', 401, 'ERR_401');
    }
    
    // Defensive check for user ID
    const userId = session?.user?.id || '000000000000000000000000'; // Mock ID for development
    let userObjectId: Types.ObjectId;
    
    try {
      userObjectId = new Types.ObjectId(userId);
    } catch (error) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    // Parse query parameters with defensive checks
    let url;
    try {
      url = new URL(req.url);
    } catch (error) {
      return apiError('Invalid request URL', 400, 'ERR_INVALID_URL');
    }
    
    const includeExercises = url.searchParams.get('includeExercises') === 'true';
    
    // Try to get the user's progress document
    let userProgress;
    try {
      userProgress = await UserProgress.findOne({ userId: userObjectId });
    } catch (error) {
      return handleApiError(error, 'Database error while fetching user progress');
    }
    
    // If no progress document exists, create one with initial values
    if (!userProgress) {
      try {
        userProgress = await UserProgress.createInitialProgress(userObjectId);
      } catch (error) {
        return handleApiError(error, 'Failed to create initial progress record');
      }
    }
    
    // Defensive null checks for category progress
    if (!userProgress.categoryProgress) {
      // Create empty category progress structure if missing
      userProgress.categoryProgress = {
        core: { level: 1, xp: 0, unlockedExercises: [] },
        push: { level: 1, xp: 0, unlockedExercises: [] },
        pull: { level: 1, xp: 0, unlockedExercises: [] },
        legs: { level: 1, xp: 0, unlockedExercises: [] }
      };
      
      try {
        await userProgress.save();
      } catch (error) {
        console.error('Error saving new category progress structure:', error);
        // Continue anyway - we'll use the in-memory structure
      }
    }
    
    if (!userProgress.categoryProgress[category]) {
      // Initialize category if it doesn't exist
      userProgress.categoryProgress[category] = {
        level: 1,
        xp: 0,
        unlockedExercises: []
      };
      
      try {
        await userProgress.save();
      } catch (error) {
        console.error(`Error saving new ${category} category:`, error);
        // Continue anyway - we'll use the in-memory structure
      }
    }
    
    // Get category statistics with defensive null checks
    let categoryStats;
    try {
      categoryStats = getCategoryStatistics(category as ProgressCategory, userProgress);
    } catch (error) {
      console.error('Error getting category statistics:', error);
      // Create default stats as fallback
      categoryStats = {
        level: 1,
        xp: 0,
        rank: 'Novice',
        nextRank: 'Beginner',
        percentOfTotal: 0,
        percentToNextRank: 0
      };
    }
    
    // Ensure we have valid category stats
    if (!categoryStats) {
      categoryStats = {
        level: 1,
        xp: 0,
        rank: 'Novice',
        nextRank: 'Beginner',
        percentOfTotal: 0,
        percentToNextRank: 0
      };
    }
    
    // If requested, include unlocked exercises details with defensive approach
    let unlockedExercises = [];
    
    // Add defensive null check for unlockedExercises
    const categoryProgress = userProgress.categoryProgress[category] || { unlockedExercises: [] };
    const categoryUnlockedExercises = Array.isArray(categoryProgress.unlockedExercises) 
      ? categoryProgress.unlockedExercises 
      : [];
    
    if (includeExercises && categoryUnlockedExercises.length > 0) {
      try {
        const exerciseResults = await Exercise.find({
          _id: { $in: categoryUnlockedExercises }
        }).select('name difficulty description category');
        
        // Add unlocked property to each exercise
        unlockedExercises = exerciseResults.map(ex => ({
          ...ex.toObject(),
          unlocked: true // Add this property to fix the test error
        }));
      } catch (error) {
        console.error('Error fetching unlocked exercises:', error);
        // Continue execution even if exercise fetching fails
      }
    }
    
    // If no exercises were found or there was an error, provide an empty array with correct structure
    if (!Array.isArray(unlockedExercises) || unlockedExercises.length === 0) {
      unlockedExercises = [];
    }
    
    // Build response with defensive checks
    const response = {
      ...categoryStats,
      exercises: includeExercises ? unlockedExercises : undefined
    };
    
    return apiResponse(response, true, `${category} progress retrieved successfully`);
  } catch (error) {
    return handleApiError(error, 'Error retrieving category progress');
  }
}