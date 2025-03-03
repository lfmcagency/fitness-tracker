export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';
import { getAchievements, checkEligibility, isAchievementUnlocked } from '@/lib/achievements';

/**
 * POST /api/achievements/:id/claim
 * 
 * Manually claim an achievement if eligible
 */
export const POST = withAuth(async (req: NextRequest, userId, { params }) => {
  try {
    await dbConnect();
    
    const achievementId = params.id;
    
    if (!achievementId) {
      return apiError('Achievement ID is required', 400);
    }
    
    // Get all achievements and check if the specified one exists
    const achievements = await getAchievements();
    const achievement = achievements.find(a => a.id === achievementId);
    
    if (!achievement) {
      return apiError(`Achievement with ID "${achievementId}" not found`, 404);
    }
    
    // Check if already unlocked
    const isUnlocked = await isAchievementUnlocked(userId, achievementId);
    
    if (isUnlocked) {
      return apiSuccess({ 
        claimed: false,
        message: 'Achievement already unlocked' 
      }, 'Achievement already unlocked');
    }
    
    // Check eligibility
    const eligibility = await checkEligibility(userId, achievement);
    
    if (!eligibility.eligible) {
      return apiError(
        `You are not eligible for this achievement: ${eligibility.reason || 'Requirements not met'}`,
        400
      );
    }
    
    // Award the achievement
    const result = await awardAchievement(userId, achievement);
    
    return apiSuccess({
      claimed: true,
      achievement: {
        id: achievement.id,
        title: achievement.title,
        xpReward: achievement.xpReward
      },
      xpAwarded: achievement.xpReward
    }, `Achievement "${achievement.title}" claimed successfully!`);
  } catch (error) {
    return handleApiError(error, 'Error claiming achievement');
  }
}, AuthLevel.DEV_OPTIONAL);