// src/app/api/achievements/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';;
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { 
  getAchievements, 
  getAllAchievementsWithStatus, 
  meetsRequirements, 
  awardAchievements 
} from '@/lib/achievements';

// Define Achievement interface to properly type the achievements array
interface Achievement {
  id: string;
  title: string;
  description?: string;
  type: string;
  unlocked: boolean;
  xpReward?: number;
  [key: string]: any; // For any other properties
}

/**
 * GET /api/achievements
 * 
 * Returns all available achievements with unlock status for the authenticated user.
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
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
    
    let userProgress = null;
    
    // Get user progress with defensive error handling
    if (userId) {
      try {
        const UserProgress = (await import('@/models/UserProgress')).default;
        if (!UserProgress) {
          console.error('UserProgress model not found');
        } else {
          userProgress = await UserProgress.findOne({ userId });
        }
      } catch (error) {
        console.error('Error getting user progress:', error);
        // Continue even if getting user progress fails
      }
    }
    
    // Get all achievements with user's unlock status
    let achievements: Achievement[] = [];
    try {
      achievements = await getAllAchievementsWithStatus(userProgress);
    } catch (error) {
      console.error('Error getting achievements with status:', error);
      // Continue with empty achievements rather than failing the request
    }
    
    if (!Array.isArray(achievements)) {
      achievements = [];
    }
    
    // Apply filters if any
    let filteredAchievements = achievements;
    
    if (unlockedFilter && userProgress) {
      filteredAchievements = filteredAchievements.filter(achievement => 
        achievement && achievement.unlocked === true
      );
    }
    
    if (typeFilter && typeof typeFilter === 'string') {
      filteredAchievements = filteredAchievements.filter(
        achievement => achievement && achievement.type === typeFilter
      );
    }
    
    // Group achievements by type with defensive checks
    const groupedAchievements = filteredAchievements.reduce((groups, achievement) => {
      if (!achievement) return groups;
      
      const type = achievement.type || 'other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(achievement);
      return groups;
    }, {} as Record<string, typeof filteredAchievements>);
    
    return apiResponse({
      total: filteredAchievements.length,
      unlocked: filteredAchievements.filter(a => a && a.unlocked).length,
      byType: groupedAchievements,
      all: filteredAchievements
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching achievements');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/achievements
 * 
 * Claims an achievement if the user meets the requirements.
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
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
    
    // Find the achievement definition with defensive error handling
    let achievementDef;
    try {
      const allAchievements = getAchievements();
      
      if (!Array.isArray(allAchievements)) {
        return apiError('Failed to retrieve achievements', 500, 'ERR_ACHIEVEMENTS');
      }
      
      achievementDef = allAchievements.find(a => a && a.id === achievementId);
    } catch (error) {
      return handleApiError(error, 'Error retrieving achievement definitions');
    }
    
    if (!achievementDef) {
      return apiError('Achievement not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Get user progress with defensive error handling
    let UserProgress;
    try {
      UserProgress = (await import('@/models/UserProgress')).default;
    } catch (error) {
      return handleApiError(error, 'Error loading UserProgress model');
    }
    
    if (!UserProgress) {
      return apiError('Failed to load required models', 500, 'ERR_MODEL_LOADING');
    }
    
    let userProgress;
    try {
      userProgress = await UserProgress.findOne({ userId });
    } catch (error) {
      return handleApiError(error, 'Error fetching user progress');
    }
    
    if (!userProgress) {
      return apiError('User progress not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Check if user already has this achievement with defensive array handling
    const userAchievementIds = Array.isArray(userProgress.achievements) 
      ? userProgress.achievements.map(id => id?.toString() || '')
      : [];
    
    if (userAchievementIds.includes(achievementId)) {
      return apiResponse({
        success: false,
        alreadyClaimed: true
      }, false, 'Achievement already claimed', 200);
    }
    
    // Check if user meets requirements with defensive error handling
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
      }, false, 'Requirements not met for this achievement', 400);
    }
    
    // Award the achievement with defensive error handling
    let awardResult;
    try {
      awardResult = await awardAchievements(userProgress, [achievementDef]);
    } catch (error) {
      return handleApiError(error, 'Error awarding achievement');
    }
    
    const { updatedProgress, totalXpAwarded } = awardResult || { updatedProgress: userProgress, totalXpAwarded: 0 };
    
    return apiResponse({
      success: true,
      achievement: achievementDef,
      xpAwarded: totalXpAwarded,
      newLevel: updatedProgress?.level || userProgress.level
    }, true, `Achievement '${achievementDef.title}' unlocked!`);
  } catch (error) {
    return handleApiError(error, 'Error claiming achievement');
  }
}, AuthLevel.DEV_OPTIONAL);