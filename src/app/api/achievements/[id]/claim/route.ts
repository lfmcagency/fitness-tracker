// src/app/api/achievements/[id]/claim/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import UserProgress from '@/models/UserProgress';
import { getAchievements } from '@/lib/achievements';
import { ClaimAchievementData } from '@/types/api/achievementResponses';

/**
 * POST /api/achievements/:id/claim
 * Claim a pending achievement and award bonus XP
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

      console.log(`🎯 [CLAIM] Attempting to claim achievement: ${achievementId} for user: ${userId}`);

      // Get achievement definition
      let achievement;
      try {
        const achievements = getAchievements();
        
        if (!Array.isArray(achievements) || achievements.length === 0) {
          return apiError('Failed to retrieve achievements', 500, 'ERR_ACHIEVEMENTS');
        }
        
        achievement = achievements.find(a => a?.id === achievementId);
        if (!achievement) {
          return apiError(`Achievement with ID "${achievementId}" not found`, 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error retrieving achievements');
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

      // Check if already claimed
      const claimedIds = userProgress.achievements ? userProgress.achievements.map(id => id.toString()) : [];
      
      if (claimedIds.includes(achievementId)) {
        return apiResponse<ClaimAchievementData>(
          {
            claimed: false,
            message: 'Achievement already claimed',
          },
          true,
          'Achievement already claimed'
        );
      }

      // Check if achievement is pending
      const isPending = userProgress.hasPendingAchievement(achievementId);
      
      if (!isPending) {
        return apiError(
          'Achievement is not available for claiming. Complete the requirements first.',
          400,
          'ERR_NOT_PENDING'
        );
      }

      console.log(`✅ [CLAIM] Achievement ${achievementId} is pending, proceeding with claim...`);

      // Claim the achievement (moves from pending to claimed)
      try {
        const claimSuccess = await userProgress.claimPendingAchievement(achievementId);
        
        if (!claimSuccess) {
          return apiError('Failed to claim achievement', 500, 'ERR_CLAIM_FAILED');
        }
      } catch (error) {
        return handleApiError(error, 'Error claiming achievement');
      }

      // Award bonus XP for claiming
      try {
        const leveledUp = await userProgress.addXp(
          achievement.xpReward,
          'achievement',
          undefined, // No specific category for achievement XP
          `Claimed achievement: ${achievement.title}`
        );
        
        console.log(`🎉 [CLAIM] Achievement claimed! XP awarded: ${achievement.xpReward}, Level up: ${leveledUp}`);

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
            leveledUp,
            newLevel: userProgress.level,
          },
          true,
          leveledUp 
            ? `Achievement claimed and leveled up to ${userProgress.level}!`
            : `Achievement "${achievement.title}" claimed successfully!`
        );
      } catch (error) {
        return handleApiError(error, 'Error awarding achievement XP');
      }
    } catch (error) {
      return handleApiError(error, 'Error claiming achievement');
    }
  },
  AuthLevel.DEV_OPTIONAL
);