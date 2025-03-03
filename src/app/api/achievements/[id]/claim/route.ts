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
    
    // Validate achievement ID with defensive checks
    const achievementId = params?.id;
    
    if (!achievementId || typeof achievementId !== 'string' || achievementId.trim() === '') {
      return apiError('Achievement ID is required', 400, 'ERR_MISSING_ID');
    }
    
    // Get all achievements and check if the specified one exists
    let achievements = [];
    try {
      achievements = getAchievements();
    } catch (error) {
      return handleApiError(error, 'Error retrieving achievements');
    }
    
    if (!Array.isArray(achievements)) {
      return apiError('Failed to retrieve achievements', 500, 'ERR_ACHIEVEMENTS');
    }
    
    const achievement = achievements.find(a => a && a.id === achievementId);
    
    if (!achievement) {
      return apiError(`Achievement with ID "${achievementId}" not found`, 404, 'ERR_NOT_FOUND');
    }
    
    // Check if already unlocked with defensive error handling
    let isUnlocked = false;
    try {
      isUnlocked = await isAchievementUnlocked(userId, achievementId);
    } catch (error) {
      console.error('Error checking if achievement is unlocked:', error);
      // Continue execution - assume not unlocked
    }
    
    if (isUnlocked) {
      return apiResponse({ 
        claimed: false,
        message: 'Achievement already unlocked' 
      }, true, 'Achievement already unlocked');
    }
    
    // Check eligibility with defensive error handling
    let eligibility: { eligible: boolean; reason?: string } = { 
      eligible: false, 
      reason: 'Unknown error checking eligibility' 
    };
    try {
      eligibility = await checkEligibility(userId, achievement);
    }
    
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
    
    // Import UserProgress model with defensive error handling
    let UserProgress;
    try {
      UserProgress = (await import('@/models/UserProgress')).default;
    } catch (error) {
      return handleApiError(error, 'Error loading UserProgress model');
    }
    
    if (!UserProgress) {
      return apiError('Failed to load required models', 500, 'ERR_MODEL_LOADING');
    }
    
    // Get user progress with defensive error handling
    let userProgress;
    try {
      userProgress = await UserProgress.findOne({ userId });
    } catch (error) {
      return handleApiError(error, 'Database error while fetching user progress');
    }
    
    if (!userProgress) {
      return apiError('User progress not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Award the achievement with defensive error handling
    let result;
    try {
      if (typeof awardAchievement === 'function') {
        result = await awardAchievement(userProgress, achievement);
      } else {
        // Fallback to awardAchievements function if awardAchievement doesn't exist
        result = await awardAchievements(userProgress, [achievement]);
      }
    } catch (error) {
      return handleApiError(error, 'Error awarding achievement');
    }
    
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