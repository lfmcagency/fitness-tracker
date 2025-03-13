// src/app/api/achievements/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import UserProgress from '@/models/UserProgress';
import { 
  getAchievements, 
  getAllAchievementsWithStatus, 
  meetsRequirements, 
  awardAchievements 
} from '@/lib/achievements';
import { 
  AchievementData, 
  AchievementListData 
} from '@/types/api/achievementResponses';
import { 
  convertDefinitionToResponse,
  groupAchievementsByType
} from '@/types/converters/achievementConverters';
import { isValidObjectId } from 'mongoose';

/**
 * GET /api/achievements
 * 
 * Returns all available achievements with unlock status for the authenticated user.
 */
export const GET = withAuth<AchievementListData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Get query parameters with defensive checks
      const url = new URL(req.url);
      const unlockedFilter = url.searchParams.get('unlocked') === 'true';
      const typeFilter = url.searchParams.get('type');
      
      if (typeFilter && 
          typeof typeFilter === 'string' && 
          !['strength', 'consistency', 'nutrition', 'milestone'].includes(typeFilter)) {
        return apiError('Invalid achievement type', 400, 'ERR_VALIDATION');
      }
      
      // Get user progress with defensive error handling
      let userProgress = null;
      try {
        userProgress = await UserProgress.findOne({ userId });
      } catch (error) {
        console.error('Error getting user progress:', error);
        // Continue even if getting user progress fails
      }
      
      // Get all achievements with user's unlock status
      let achievements: AchievementData[] = [];
      try {
        achievements = await getAllAchievementsWithStatus(userProgress);
      } catch (error) {
        console.error('Error getting achievements with status:', error);
        // Continue with empty achievements rather than failing the request
        achievements = [];
      }
      
      // Apply filters if any
      let filteredAchievements = achievements;
      
      if (unlockedFilter) {
        filteredAchievements = filteredAchievements.filter(achievement => 
          achievement && achievement.unlocked === true
        );
      }
      
      if (typeFilter && typeof typeFilter === 'string') {
        filteredAchievements = filteredAchievements.filter(
          achievement => achievement && achievement.type === typeFilter
        );
      }
      
      // Group achievements by type with defensive handling
      const groupedAchievements = groupAchievementsByType(filteredAchievements);
      
      return apiResponse<AchievementListData>({
        total: filteredAchievements.length,
        unlocked: filteredAchievements.filter(a => a && a.unlocked).length,
        byType: groupedAchievements,
        all: filteredAchievements
      }, true, 'Achievements retrieved successfully');
    } catch (error) {
      return handleApiError(error, 'Error fetching achievements');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/achievements
 * 
 * Claims an achievement if the user meets the requirements.
 */
export const POST = withAuth<{
  success: boolean;
  achievement?: AchievementData;
  xpAwarded?: number;
  newLevel?: number;
  alreadyClaimed?: boolean;
  requirementsMet?: boolean;
}>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Validate request payload
      let payload;
      try {
        payload = await req.json();
      } catch (error) {
        return apiError('Invalid JSON payload', 400, 'ERR_INVALID_JSON');
      }
      
      // Check for required fields
      const achievementId = payload?.achievementId;
      
      if (!achievementId || typeof achievementId !== 'string' || achievementId.trim() === '') {
        return apiError('Achievement ID is required', 400, 'ERR_MISSING_ID');
      }
      
      // Find the achievement definition
      let achievementDef;
      try {
        const allAchievements = getAchievements();
        
        if (!Array.isArray(allAchievements)) {
          return apiError('Failed to retrieve achievements', 500, 'ERR_ACHIEVEMENTS');
        }
        
        achievementDef = allAchievements.find(a => a && a.id === achievementId);
        
        if (!achievementDef) {
          return apiError('Achievement not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving achievement definitions');
      }
      
      // Get user progress
      let userProgress;
      try {
        userProgress = await UserProgress.findOne({ userId });
        
        if (!userProgress) {
          return apiError('User progress not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error fetching user progress');
      }
      
      // Check if user already has this achievement
      const userAchievementIds = Array.isArray(userProgress.achievements) 
        ? userProgress.achievements.map(id => id?.toString() || '')
        : [];
      
      if (userAchievementIds.includes(achievementId)) {
        return apiResponse({
          success: false,
          alreadyClaimed: true
        }, true, 'Achievement already claimed');
      }
      
      // Check if user meets requirements
      let meetsRequirementsResult = false;
      try {
        meetsRequirementsResult = meetsRequirements(achievementDef, userProgress);
      } catch (error) {
        return handleApiError(error, 'Error checking achievement requirements');
      }
      
      if (!meetsRequirementsResult) {
        return apiResponse({
          success: false,
          requirementsMet: false
        }, false, 'Requirements not met for this achievement');
      }
      
      // Award the achievement
      let awardResult;
      try {
        awardResult = await awardAchievements(userProgress, [achievementDef]);
      } catch (error) {
        return handleApiError(error, 'Error awarding achievement');
      }
      
      const { updatedProgress, totalXpAwarded } = awardResult || { updatedProgress: userProgress, totalXpAwarded: 0 };
      
      return apiResponse({
        success: true,
        achievement: convertDefinitionToResponse(achievementDef, { unlocked: true }),
        xpAwarded: totalXpAwarded,
        newLevel: updatedProgress?.level || userProgress.level
      }, true, `Achievement '${achievementDef.title}' unlocked!`);
    } catch (error) {
      return handleApiError(error, 'Error claiming achievement');
    }
  },
  AuthLevel.DEV_OPTIONAL
);