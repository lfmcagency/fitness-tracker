export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { 
  ProgressCategory, 
  VALID_CATEGORIES,
  getCategoryStatistics
} from '@/lib/category-progress';
import { Exercise } from '@/models/Exercise';
import { CategoryProgressData } from '@/types/api/progressResponses';
import { IUserProgress, IUserProgressModel } from '@/types/models/progress';

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
export const GET = withAuth<CategoryProgressData, { category: string }>(
  async (req: NextRequest, userId: string, context) => {
    try {
      if (!context?.params?.category) {
        return apiError('Missing category parameter', 400, 'ERR_MISSING_PARAM');
      }
      
      const category = context.params.category;
    
      if (!category || typeof category !== 'string' || !VALID_CATEGORIES.includes(category as ProgressCategory)) {
        return apiError(
          `Invalid category: ${category}. Valid categories are: ${VALID_CATEGORIES.join(', ')}`,
          400,
          'ERR_INVALID_CATEGORY'
        );
      }
    
      await dbConnect();
    
      // Defensive check for userId
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
      }
    
      const userObjectId = new Types.ObjectId(userId);
    
      // Try to get the user's progress document with error handling
      let userProgress: IUserProgress | null = null;
      try {
        userProgress = await UserProgress.findOne({ userId: userObjectId });
      } catch (error) {
        return handleApiError(error, 'Database error while fetching user progress');
      }
    
      // If no progress document exists, create one with initial values
      if (!userProgress) {
        try {
          userProgress = await (UserProgress as IUserProgressModel).createInitialProgress(userObjectId);
        } catch (error) {
          return handleApiError(error, 'Failed to create initial progress record');
        }
      }
    
      // Defensive null check for userProgress
      if (!userProgress) {
        return apiError('Unable to find or create user progress', 500, 'ERR_DATABASE');
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
    
      const validCategory = category as ProgressCategory;
      
      if (!userProgress.categoryProgress[validCategory]) {
        // Initialize category if it doesn't exist
        userProgress.categoryProgress[validCategory] = {
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
    
      // Get the minimal data needed for CategoryProgressData
      const categoryProgress = userProgress.categoryProgress[validCategory];
      
      // Create the simple response matching CategoryProgressData
      const response: CategoryProgressData = {
        level: categoryProgress.level,
        xp: userProgress.categoryXp[validCategory] || 0
      };
    
      return apiResponse(response, true, `${category} progress retrieved successfully`);
    } catch (error) {
      return handleApiError(error, 'Error retrieving category progress');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);