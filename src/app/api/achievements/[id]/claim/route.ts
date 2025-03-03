export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { getAchievements, checkEligibility, isAchievementUnlocked, awardAchievements } from '@/lib/achievements';

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
    const achievements = getAchievements();
    const achievement = achievements.find(a => a.id === achievementId);
    
    if (!achievement) {
      return apiError(`Achievement with ID "${achievementId}" not found`, 404);
    }
    
    // Check if already unlocked
    const isUnlocked = await isAchievementUnlocked(userId, achievementId);
    
    if (isUnlocked) {
      return apiResponse({ 
        claimed: false,
        message: 'Achievement already unlocked' 
      }, true, 'Achievement already unlocked');
    }
    
    // Check eligibility
    const eligibility = await checkEligibility(userId, achievement);
    
    if (!eligibility.eligible) {
      return apiError(
        `You are not eligible for this achievement: ${eligibility.reason || 'Requirements not met'}`,
        400
      );
    }
    
    // Import UserProgress model
    const UserProgress = (await import('@/models/UserProgress')).default;
    
    // Get user progress
    const userProgress = await UserProgress.findOne({ userId });
    
    if (!userProgress) {
      return apiError('User progress not found', 404);
    }
    
    // Award the achievement
    const result = await awardAchievements(userProgress, [achievement]);
    
    return apiResponse({
      claimed: true,
      achievement: {
        id: achievement.id,
        title: achievement.title,
        xpReward: achievement.xpReward
      },
      xpAwarded: achievement.xpReward
    }, true, `Achievement "${achievement.title}" claimed successfully!`);
  } catch (error) {
    return handleApiError(error, 'Error claiming achievement');
  }
}, AuthLevel.DEV_OPTIONAL);