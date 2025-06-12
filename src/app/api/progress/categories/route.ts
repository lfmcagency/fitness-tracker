export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { CATEGORY_METADATA, VALID_CATEGORIES, ProgressCategory } from '@/lib/category-progress';

interface SimpleCategoryData {
  category: ProgressCategory;
  name: string;
  level: number;
  xp: number;
  icon: string;
  color: string;
}

interface CategoriesResponseData {
  categories: SimpleCategoryData[];
  strongest: SimpleCategoryData;
  weakest: SimpleCategoryData;
  averageLevel: number;
  totalCategoryXp: number;
}

export const GET = withAuth<CategoriesResponseData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
      }
      
      const userObjectId = new Types.ObjectId(userId);
      
      let userProgress = await UserProgress.findOne({ userId: userObjectId });
      
      if (!userProgress) {
        userProgress = await UserProgress.createInitialProgress(userObjectId);
      }
      
      if (!userProgress) {
        return apiError('Unable to find or create user progress', 500, 'ERR_DATABASE');
      }

      // Build category data
      const categories: SimpleCategoryData[] = VALID_CATEGORIES.map(category => {
        const metadata = CATEGORY_METADATA[category];
        const level = userProgress!.categoryProgress?.[category]?.level || 1;
        const xp = userProgress!.categoryXp?.[category] || 0;
        
        return {
          category,
          name: metadata.name,
          level,
          xp,
          icon: metadata.icon,
          color: metadata.color,
        };
      });

      // Find strongest and weakest
      const sortedByXp = [...categories].sort((a, b) => b.xp - a.xp);
      const strongest = sortedByXp[0];
      const weakest = sortedByXp[sortedByXp.length - 1];

      // Calculate stats
      const averageLevel = categories.reduce((sum, cat) => sum + cat.level, 0) / categories.length;
      const totalCategoryXp = categories.reduce((sum, cat) => sum + cat.xp, 0);

      const responseData: CategoriesResponseData = {
        categories,
        strongest,
        weakest,
        averageLevel: Math.round(averageLevel * 10) / 10, // Round to 1 decimal
        totalCategoryXp,
      };
      
      return apiResponse(responseData);
    } catch (error) {
      return handleApiError(error, 'Error retrieving categories summary');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);