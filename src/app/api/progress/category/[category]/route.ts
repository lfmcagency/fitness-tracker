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
    // Validate category parameter
    const category = params.category as ProgressCategory;
    
    if (!VALID_CATEGORIES.includes(category as ProgressCategory)) {
      return apiError(
        `Invalid category: ${category}. Valid categories are: ${VALID_CATEGORIES.join(', ')}`,
        400
      );
    }
    
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication in production
    if (!session && process.env.NODE_ENV === 'production') {
      return apiError('Authentication required', 401);
    }
    
    const userId = session?.user?.id || '000000000000000000000000'; // Mock ID for development
    let userObjectId: Types.ObjectId;
    
    try {
      userObjectId = new Types.ObjectId(userId);
    } catch (error) {
      return apiError('Invalid user ID', 400);
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const includeExercises = url.searchParams.get('includeExercises') === 'true';
    
    // Try to get the user's progress document
    let userProgress = await UserProgress.findOne({ userId: userObjectId });
    
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
      return apiError('User progress data is corrupted', 500, 'ERR_DATA_CORRUPT');
    }
    
    if (!userProgress.categoryProgress[category]) {
      // Initialize category if it doesn't exist
      userProgress.categoryProgress[category] = {
        level: 1,
        xp: 0,
        unlockedExercises: []
      };
      await userProgress.save();
    }
    
    // Get category statistics with defensive null checks
    const categoryStats = getCategoryStatistics(category, userProgress);
    
    // Safety check for categoryStats
    if (!categoryStats) {
      return apiError('Failed to retrieve category statistics', 500);
    }
    
    // If requested, include unlocked exercises details
    let unlockedExercises = [];
    
    // Add defensive null check for unlockedExercises
    const categoryUnlockedExercises = userProgress.categoryProgress[category]?.unlockedExercises || [];
    
    if (includeExercises && categoryUnlockedExercises.length > 0) {
      try {
        unlockedExercises = await Exercise.find({
          _id: { $in: categoryUnlockedExercises }
        }).select('name difficulty description category');
      } catch (error) {
        console.error('Error fetching unlocked exercises:', error);
        // Continue execution even if exercise fetching fails
      }
    }
    
    // Build response with defensive checks
    const response = {
      ...categoryStats,
      exercises: includeExercises ? (unlockedExercises || []) : undefined
    };
    
    return apiResponse(response);
  } catch (error) {
    return handleApiError(error, 'Error retrieving category progress');
  }
}