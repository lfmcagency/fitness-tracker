// src/app/api/achievements/[id]/claim/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import UserProgress from '@/models/UserProgress';
import { 
  getAchievements, 
  checkEligibility, 
  isAchievementUnlocked, 
  awardAchievements 
} from '@/lib/achievements';
import { ClaimAchievementData } from '@/types/api/achievementResponses';
import { convertDefinitionToResponse } from '@/types/converters/achievementConverters';

/**
 * POST /api/achievements/:id/claim
 * Manually claim an achievement if eligible
 */
export const POST = withAuth<ClaimAchievementData, { id: string }>(
  async (req: NextRequest, userId: string, context?: { params: { id: string } }) => {
    try {
      await dbConnect();

      // Extract and validate achievement ID
      const achievementId = context?.params?.id;
      if (!achievementId) {
        return apiError('Achievement ID missing', 400, 'ERR_MISSING_PARAM');
      }

      // Fetch and validate achievements
      let achievements;
      try {
        achievements = getAchievements();
        
        if (!Array.isArray(achievements) || achievements.length === 0) {
          return apiError('Failed to retrieve achievements', 500, 'ERR_ACHIEVEMENTS');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving achievements');
      }

      // Find the requested achievement
      const achievement = achievements.find(a => a?.id === achievementId);
      if (!achievement) {
        return apiError(`Achievement with ID "${achievementId}" not found`, 404, 'ERR_NOT_FOUND');
      }

      // Check if the achievement is already unlocked
      let isUnlocked = false;
      try {
        isUnlocked = await isAchievementUnlocked(userId, achievementId);
      } catch (error) {
        console.error('Error checking achievement unlock status:', error);
        // Continue with unlocked=false if check fails
      }

      if (isUnlocked) {
        return apiResponse<ClaimAchievementData>(
          {
            claimed: false,
            message: 'Achievement already unlocked',
          },
          true,
          'Achievement already unlocked'
        );
      }

      // Verify user eligibility
      let eligibility;
      try {
        eligibility = await checkEligibility(userId, achievement);
        
        if (!eligibility.eligible) {
          return apiError(
            `You are not eligible for this achievement: ${eligibility.reason || 'Requirements not met'}`,
            400,
            'ERR_NOT_ELIGIBLE'
          );
        }
      } catch (error) {
        return handleApiError(error, 'Error checking achievement eligibility');
      }

      // Fetch user progress
      let userProgress;
      try {
        userProgress = await UserProgress.findOne({ userId });
        
        if (!userProgress) {
          return apiError('User progress not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error fetching user progress');
      }

      // Award the achievement
      let awardResult;
      try {
        awardResult = await awardAchievements(userProgress, [achievement]);
      } catch (error) {
        return handleApiError(error, 'Error awarding achievement');
      }

      // Return success response
      return apiResponse<ClaimAchievementData>(
        {
          claimed: true,
          message: `Achievement "${achievement.title}" claimed successfully!`,
          achievement: {
            id: achievement.id,
            title: achievement.title,
            xpReward: achievement.xpReward,
          },
          xpAwarded: achievement.xpReward,
        },
        true,
        `Achievement "${achievement.title}" claimed successfully!`
      );
    } catch (error) {
      return handleApiError(error, 'Error claiming achievement');
    }
  },
  AuthLevel.DEV_OPTIONAL
);