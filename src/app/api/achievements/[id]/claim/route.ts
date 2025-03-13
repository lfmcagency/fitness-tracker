export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { getAchievements, checkEligibility, isAchievementUnlocked, awardAchievements } from '@/lib/achievements';
import { ClaimAchievementData } from '@/types/api/achievementResponses';

/**
 * POST /api/achievements/:id/claim
 *
 * Manually claim an achievement if eligible
 *
 * @param req - The incoming Next.js request
 * @param userId - The authenticated user's ID
 * @param context - Route context containing dynamic parameters
 * @returns A typed API response with claim status and achievement details
 */
export const POST = withAuth<ClaimAchievementData, { id: string }>(
  async (req: NextRequest, userId: string, context?: { params: { id: string } }) => {
    try {
      await dbConnect();

      // Step 1: Extract and validate achievement ID
      const achievementId = context?.params?.id;
      if (!achievementId) {
        return NextResponse.json(apiError('Achievement ID missing', 400));
      }

      // Step 2: Fetch and validate achievements
      let achievements;
      try {
        achievements = getAchievements();
      } catch (error) {
        return handleApiError(error, 'Error retrieving achievements');
      }

      if (!Array.isArray(achievements)) {
        return apiError('Failed to retrieve achievements', 500, 'ERR_ACHIEVEMENTS');
      }

      const achievement = achievements.find(a => a?.id === achievementId);
      if (!achievement) {
        return apiError(`Achievement with ID "${achievementId}" not found`, 404, 'ERR_NOT_FOUND');
      }

      // Step 3: Check if the achievement is already unlocked
      let isUnlocked = false;
      try {
        isUnlocked = await isAchievementUnlocked(userId, achievementId);
      } catch (error) {
        console.error('Error checking if achievement is unlocked:', error);
        // Proceed as if not unlocked if check fails
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

      // Step 4: Verify user eligibility
      let eligibility: { eligible: boolean; reason?: string } = {
        eligible: false,
        reason: 'Unknown error checking eligibility',
      };
      try {
        eligibility = await checkEligibility(userId, achievement);
      } catch (error) {
        return handleApiError(error, 'Error checking achievement eligibility');
      }

      if (!eligibility.eligible) {
        return apiError(
          `You are not eligible for this achievement: ${eligibility.reason || 'Requirements not met'}`,
          400,
          'ERR_NOT_ELIGIBLE'
        );
      }

      // Step 5: Load the UserProgress model
      let UserProgress;
      try {
        UserProgress = (await import('@/models/UserProgress')).default;
      } catch (error) {
        return handleApiError(error, 'Error loading UserProgress model');
      }

      if (!UserProgress) {
        return apiError('Failed to load required models', 500, 'ERR_MODEL_LOADING');
      }

      // Step 6: Fetch user progress
      let userProgress;
      try {
        userProgress = await UserProgress.findOne({ userId });
      } catch (error) {
        return handleApiError(error, 'Database error while fetching user progress');
      }

      if (!userProgress) {
        return apiError('User progress not found', 404, 'ERR_NOT_FOUND');
      }

      // Step 7: Award the achievement
      try {
        await awardAchievements(userProgress, [achievement]);
      } catch (error) {
        return handleApiError(error, 'Error awarding achievement');
      }

      // Step 8: Return success response
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
        true
      );
    } catch (error) {
      return handleApiError(error, 'Error claiming achievement');
    }
  },
  AuthLevel.DEV_OPTIONAL
);