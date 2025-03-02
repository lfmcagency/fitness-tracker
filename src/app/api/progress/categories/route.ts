export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { getCategoriesComparison, VALID_CATEGORIES, CATEGORY_METADATA } from '@/lib/category-progress';

/**
 * GET /api/progress/categories
 * 
 * Retrieves a summary of the user's progress across all exercise categories,
 * including comparative data and balance analysis.
 * 
 * Returns:
 * - Summary data for all categories
 * - Comparative analysis identifying strongest/weakest categories
 * - Balance score and recommendations
 * - Category-specific metadata for UI rendering
 */
export async function GET(req: NextRequest) {
  try {
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
    
    // Get category comparison data
    const categoriesData = getCategoriesComparison(userProgress);
    
    // Calculate overall stats
    const totalCategoryLevels = VALID_CATEGORIES.reduce(
      (sum, category) => sum + userProgress.categoryProgress[category].level, 
      0
    );
    
    const averageCategoryLevel = totalCategoryLevels / VALID_CATEGORIES.length;
    
    // Generate recommendations based on balance
    const recommendations = generateRecommendations(
      categoriesData.balanceScore,
      categoriesData.weakest.category
    );
    
    // Build response
    const response = {
      ...categoriesData,
      metadata: {
        categories: VALID_CATEGORIES.map(cat => ({
          key: cat,
          ...CATEGORY_METADATA[cat]
        })),
        categoryCount: VALID_CATEGORIES.length
      },
      overview: {
        totalXp: userProgress.totalXp,
        averageCategoryLevel: parseFloat(averageCategoryLevel.toFixed(1)),
        totalCategoryLevels
      },
      recommendations
    };
    
    return apiResponse(response);
  } catch (error) {
    return handleApiError(error, 'Error retrieving categories summary');
  }
}

/**
 * Generate recommendations based on balance score and weakest category
 */
function generateRecommendations(balanceScore: number, weakestCategory: string) {
  const recommendations = [];
  
  // Balance-based recommendations
  if (balanceScore < 50) {
    recommendations.push({
      type: 'balance',
      priority: 'high',
      message: `Focus on ${CATEGORY_METADATA[weakestCategory].name} exercises to improve overall balance.`,
      target: weakestCategory
    });
  } else if (balanceScore < 75) {
    recommendations.push({
      type: 'balance',
      priority: 'medium',
      message: `Consider adding more ${CATEGORY_METADATA[weakestCategory].name} exercises to your routine.`,
      target: weakestCategory
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