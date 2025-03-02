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
 * 
 * Returns detailed category-specific progress data, including:
 * - Total category XP and level
 * - Percentage of global XP
 * - Category rank and next rank
 * - Recent activity in the category
 * - Category-specific achievements
 * - Unlocked exercises (if requested)
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
    
    // Get category statistics
    const categoryStats = getCategoryStatistics(category, userProgress);
    
    // If requested, include unlocked exercises details
    let unlockedExercises = [];
    if (includeExercises && userProgress.categoryProgress[category].unlockedExercises.length > 0) {
      try {
        unlockedExercises = await Exercise.find({
          _id: { $in: userProgress.categoryProgress[category].unlockedExercises }
        }).select('name difficulty description category');
      } catch (error) {
        console.error('Error fetching unlocked exercises:', error);
        // Continue execution even if exercise fetching fails
      }
    }
    
    // Build response
    const response = {
      ...categoryStats,
      exercises: includeExercises ? unlockedExercises : undefined
    };
    
    return apiResponse(response);
  } catch (error) {
    return handleApiError(error, 'Error retrieving category progress');
  }
}