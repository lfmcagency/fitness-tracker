export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import { Types } from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { ACHIEVEMENTS, getAllAchievementsWithStatus } from '@/lib/achievements';

/**
 * GET /api/achievements
 * 
 * Returns all available achievements with unlock status for the authenticated user.
 * If user is not authenticated, returns all achievements without unlock status.
 * 
 * Query parameters:
 * - unlocked: 'true' to filter only unlocked achievements
 * - type: achievement type filter (e.g., 'strength', 'milestone', etc.)
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Get query parameters
    const url = new URL(req.url);
    const unlockedFilter = url.searchParams.get('unlocked') === 'true';
    const typeFilter = url.searchParams.get('type');
    
    let userProgress = null;
    
    // If user is authenticated, get their progress
    if (session?.user?.id) {
      try {
        const userObjectId = new Types.ObjectId(session.user.id);
        userProgress = await UserProgress.findOne({ userId: userObjectId });
      } catch (error) {
        // Continue even if getting user progress fails
        console.error('Error getting user progress:', error);
      }
    }
    
    // Get all achievements with user's unlock status
    const achievements = await getAllAchievementsWithStatus(userProgress);
    
    // Apply filters if any
    let filteredAchievements = achievements;
    
    if (unlockedFilter && userProgress) {
      filteredAchievements = filteredAchievements.filter(achievement => achievement.unlocked);
    }
    
    if (typeFilter) {
      filteredAchievements = filteredAchievements.filter(
        achievement => achievement.type === typeFilter
      );
    }
    
    // Group achievements by type
    const groupedAchievements = filteredAchievements.reduce((groups, achievement) => {
      const type = achievement.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(achievement);
      return groups;
    }, {} as Record<string, typeof filteredAchievements>);
    
    return apiResponse({
      total: filteredAchievements.length,
      unlocked: filteredAchievements.filter(a => a.unlocked).length,
      byType: groupedAchievements,
      all: filteredAchievements
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching achievements');
  }
}

/**
 * POST /api/achievements/:id/claim
 * 
 * Claims an achievement if the user meets the requirements but doesn't
 * already have it. Primarily used for achievements that require manual
 * verification or claim.
 * 
 * This is NOT usually needed as achievements are typically awarded automatically,
 * but exists as a fallback mechanism.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication
    if (!session?.user?.id) {
      return apiError('Authentication required', 401);
    }
    
    // Parse request payload
    const { achievementId } = await req.json();
    
    if (!achievementId) {
      return apiError('Achievement ID is required', 400);
    }
    
    // Find the achievement definition
    const achievementDef = ACHIEVEMENTS.find(a => a.id === achievementId);
    
    if (!achievementDef) {
      return apiError('Achievement not found', 404);
    }
    
    // Get user progress
    const userObjectId = new Types.ObjectId(session.user.id);
    const userProgress = await UserProgress.findOne({ userId: userObjectId });
    
    if (!userProgress) {
      return apiError('User progress not found', 404);
    }
    
    // Check if user already has this achievement
    const userAchievementIds = userProgress.achievements.map(id => id.toString());
    
    if (userAchievementIds.includes(achievementId)) {
      return apiResponse({
        success: false,
        alreadyClaimed: true
      }, 'Achievement already claimed', 200);
    }
    
    // Import achievement checking and awarding functions
    const { meetsRequirements, awardAchievements } = await import('@/lib/achievements');
    
    // Check if user meets requirements
    if (!meetsRequirements(achievementDef, userProgress)) {
      return apiResponse({
        success: false,
        requirementsMet: false
      }, 'Requirements not met for this achievement', 400);
    }
    
    // Award the achievement
    const { updatedProgress, totalXpAwarded } = await awardAchievements(
      userProgress,
      [achievementDef]
    );
    
    return apiResponse({
      success: true,
      achievement: achievementDef,
      xpAwarded: totalXpAwarded,
      newLevel: updatedProgress.level
    }, `Achievement '${achievementDef.title}' unlocked!`);
  } catch (error) {
    return handleApiError(error, 'Error claiming achievement');
  }
}