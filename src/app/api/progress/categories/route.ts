export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { 
  getCategoriesComparison, 
  VALID_CATEGORIES, 
  CATEGORY_METADATA, 
  ProgressCategory, 
  isValidCategory 
} from '@/lib/category-progress';
import { IUserProgress, IUserProgressModel } from '@/types/models/progress';

// Define response data structure with exact property types
interface CategorySummaryResponseData {
  categories: Array<{
    category: ProgressCategory;
    name: string;
    xp: number;
    level: number;
    rank: string;
    percentOfTotal: number;
  }>;
  strongest: { 
    category: ProgressCategory;
    xp: number;
    level: number;
    name: string;
    icon: string;
    color: string;
    rank: string;
    percentOfTotal: number;
  };
  weakest: {
    category: ProgressCategory;
    xp: number;
    level: number;
    name: string;
    icon: string;
    color: string;
    rank: string;
    percentOfTotal: number;
  };
  balanceScore: number;
  balanceMessage: string;
  metadata: {
    categories: Array<{
      key: ProgressCategory;
      name: string;
      description: string;
      icon: string;
      color: string;
      primaryMuscles: string[];
      scaling: number;
    }>;
    categoryCount: number;
  };
  overview: {
    totalXp: number;
    averageCategoryLevel: number;
    totalCategoryLevels: number;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
    target: ProgressCategory | null;
  }>;
}

/**
 * GET /api/progress/categories
 */
export const GET = withAuth<CategorySummaryResponseData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Defensive check for userId validity
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
      }
      
      // Convert to ObjectId safely
      const userObjectId = new Types.ObjectId(userId);
      
      // Try to get the user's progress document with error handling
      let userProgress: IUserProgress | null;
      try {
        userProgress = await UserProgress.findOne({ userId: userObjectId });
      } catch (error) {
        return handleApiError(error, 'Database error while fetching user progress');
      }
      
      // If no progress document exists, create one with initial values
      if (!userProgress) {
        try {
          // Cast UserProgress to IUserProgressModel to access the static method
          userProgress = await (UserProgress as IUserProgressModel).createInitialProgress(userObjectId);
        } catch (error) {
          return handleApiError(error, 'Failed to create initial progress record');
        }
      }
      
      // Defensively ensure userProgress is valid before proceeding
      if (!userProgress) {
        return apiError('Unable to find or create user progress', 500, 'ERR_DATABASE');
      }
      
      // Get category comparison data with defensive error handling
      let categoriesData = {
        categories: [] as any[],
        strongest: { 
          category: 'core' as ProgressCategory, 
          xp: 0, 
          level: 1,
          name: 'Core',
          icon: 'disc',
          color: 'bg-blue-500',
          rank: 'Novice',
          percentOfTotal: 0
        },
        weakest: { 
          category: 'core' as ProgressCategory, 
          xp: 0, 
          level: 1,
          name: 'Core',
          icon: 'disc',
          color: 'bg-blue-500',
          rank: 'Novice',
          percentOfTotal: 0
        },
        balanceScore: 100,
        balanceMessage: 'Balance calculation error'
      };
      
      try {
        categoriesData = getCategoriesComparison(userProgress);
      } catch (error) {
        console.error('Error calculating category comparison:', error);
        // We already have default values set
      }
      
      // Ensure we have valid weakest category for recommendations
      const weakestCategory = categoriesData?.weakest?.category || 'core';
      
      // Ensure category progress exists for calculations
      const categoryProgress = userProgress.categoryProgress || {
        core: { level: 1, xp: 0, unlockedExercises: [] },
        push: { level: 1, xp: 0, unlockedExercises: [] },
        pull: { level: 1, xp: 0, unlockedExercises: [] },
        legs: { level: 1, xp: 0, unlockedExercises: [] }
      };
      
      // Calculate overall stats with defensive null checks
      let totalCategoryLevels = 0;
      let validCategoryCount = 0;
      
      VALID_CATEGORIES.forEach(category => {
        const level = categoryProgress[category]?.level || 1;
        totalCategoryLevels += level;
        validCategoryCount++;
      });
      
      const averageCategoryLevel = validCategoryCount > 0 
        ? totalCategoryLevels / validCategoryCount
        : 1;
      
      // Generate recommendations based on balance with defensive checks
      const recommendations = generateRecommendations(
        categoriesData?.balanceScore || 100,
        weakestCategory
      );
      
      // Build response with careful null checks
      const response: CategorySummaryResponseData = {
        ...categoriesData,
        metadata: {
          categories: VALID_CATEGORIES.map(cat => ({
            key: cat,
            ...(CATEGORY_METADATA[cat] || {
              name: cat,
              description: 'Category information',
              icon: 'circle',
              color: 'bg-gray-500',
              primaryMuscles: [],
              scaling: 1.0
            })
          })),
          categoryCount: VALID_CATEGORIES.length
        },
        overview: {
          totalXp: userProgress.totalXp || 0,
          averageCategoryLevel: parseFloat(averageCategoryLevel.toFixed(1)),
          totalCategoryLevels
        },
        recommendations
      };
      
      return apiResponse(response);
    } catch (error) {
      return handleApiError(error, 'Error retrieving categories summary');
    }
  }, AuthLevel.DEV_OPTIONAL);

/**
 * Generate recommendations based on balance score and weakest category
 */
function generateRecommendations(balanceScore: number, weakestCategory: string): Array<{
  type: string;
  priority: string;
  message: string;
  target: ProgressCategory | null;
}> {
  const recommendations: Array<{
    type: string;
    priority: string;
    message: string;
    target: ProgressCategory | null;
  }> = [];
  
  // Ensure weakestCategory is valid with defensive check
  const safeCategory = isValidCategory(weakestCategory) ? weakestCategory : 'core';
  
  // Get category metadata with fallback
  const categoryName = CATEGORY_METADATA[safeCategory]?.name || safeCategory.charAt(0).toUpperCase() + safeCategory.slice(1);
  
  // Balance-based recommendations
  if (balanceScore < 50) {
    recommendations.push({
      type: 'balance',
      priority: 'high',
      message: `Focus on ${categoryName} exercises to improve overall balance.`,
      target: safeCategory
    });
  } else if (balanceScore < 75) {
    recommendations.push({
      type: 'balance',
      priority: 'medium',
      message: `Consider adding more ${categoryName} exercises to your routine.`,
      target: safeCategory
    });
  } else {
    recommendations.push({
      type: 'balance',
      priority: 'low',
      message: 'Your training is well-balanced across categories.',
      target: null
    });
  }
  
  // Add one general recommendation
  recommendations.push({
    type: 'general',
    priority: 'medium',
    message: 'Try to train at least two different movement categories per week for best results.',
    target: null
  });
  
  return recommendations;
}