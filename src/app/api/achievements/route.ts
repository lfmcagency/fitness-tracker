// src/app/api/achievements/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import UserProgress from '@/models/UserProgress';
import { 
  getAchievements, 
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
 * Get all achievements with proper status (pending/claimed/locked)
 */
async function getAllAchievementsWithStatus(userProgress: any) {
  const achievements = getAchievements();
  
  if (!userProgress) {
    // No user progress - all achievements are locked
    return achievements.map(achievement => ({
      ...achievement,
      unlocked: false,
      status: 'locked' as const,
      progress: 0
    }));
  }
  
  // Get claimed and pending achievement IDs
  const claimedIds = userProgress.achievements ? userProgress.achievements.map((id: any) => id.toString()) : [];
  const pendingIds = userProgress.pendingAchievements || [];
  
  console.log('🏆 [API] User achievement status:', {
    claimed: claimedIds,
    pending: pendingIds
  });
  
  return achievements.map(achievement => {
    let status: 'pending' | 'claimed' | 'locked' = 'locked';
    let unlocked = false;
    
    if (claimedIds.includes(achievement.id)) {
      status = 'claimed';
      unlocked = true;
    } else if (pendingIds.includes(achievement.id)) {
      status = 'pending';
      unlocked = true; // Still considered unlocked, just not claimed
    }
    
    // Calculate progress for locked achievements
    const progress = status === 'locked' ? calculateAchievementProgress(achievement, userProgress) : 100;
    
    return {
      ...achievement,
      unlocked,
      status,
      progress
    };
  });
}

/**
 * Calculate progress percentage toward an achievement
 */
function calculateAchievementProgress(achievement: any, userProgress: any): number {
  if (!userProgress) return 0;
  
  const req = achievement.requirements;
  
  // Level-based achievement
  if (req.level) {
    return Math.min(100, Math.floor((userProgress.level / req.level) * 100));
  }
  
  // XP-based achievement
  if (req.totalXp) {
    return Math.min(100, Math.floor((userProgress.totalXp / req.totalXp) * 100));
  }
  
  // Category level achievement
  if (req.categoryLevel) {
    const { category, level } = req.categoryLevel;
    const userCategoryLevel = userProgress.categoryProgress?.[category]?.level || 1;
    return Math.min(100, Math.floor((userCategoryLevel / level) * 100));
  }
  
  // Streak-based - for now return 0, we'll improve this when we integrate task data
  if (req.streakCount) {
    // TODO: Calculate based on actual task streak data
    return 0;
  }
  
  return 0;
}

/**
 * GET /api/achievements
 * Returns all available achievements with unlock status for the authenticated user.
 */
export const GET = withAuth<AchievementListData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Get query parameters with defensive checks
      const url = new URL(req.url);
      const statusFilter = url.searchParams.get('status'); // 'pending', 'claimed', 'locked'
      const typeFilter = url.searchParams.get('type');
      
      if (typeFilter && 
          typeof typeFilter === 'string' && 
          !['strength', 'consistency', 'nutrition', 'milestone'].includes(typeFilter)) {
        return apiError('Invalid achievement type', 400, 'ERR_VALIDATION');
      }
      
      if (statusFilter && 
          typeof statusFilter === 'string' && 
          !['pending', 'claimed', 'locked'].includes(statusFilter)) {
        return apiError('Invalid status filter', 400, 'ERR_VALIDATION');
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
        achievements = [];
      }
      
      // Apply filters
      let filteredAchievements = achievements;
      
      if (statusFilter) {
        filteredAchievements = filteredAchievements.filter(achievement => 
          achievement && (achievement as any).status === statusFilter
        );
      }
      
      if (typeFilter) {
        filteredAchievements = filteredAchievements.filter(
          achievement => achievement && achievement.type === typeFilter
        );
      }
      
      // Calculate stats
      const totalCount = achievements.length;
      const claimedCount = achievements.filter(a => (a as any).status === 'claimed').length;
      const pendingCount = achievements.filter(a => (a as any).status === 'pending').length;
      const lockedCount = achievements.filter(a => (a as any).status === 'locked').length;
      
      console.log('📊 [API] Achievement stats:', {
        total: totalCount,
        claimed: claimedCount,
        pending: pendingCount,
        locked: lockedCount
      });
      
      // Group achievements by type
      const groupedAchievements = groupAchievementsByType(filteredAchievements);
      
      return apiResponse<AchievementListData>({
        list: filteredAchievements,
        totalCount,
        unlockedCount: claimedCount + pendingCount,
        claimedCount,
        pendingCount,
        lockedCount,
        byType: groupedAchievements,
        total: 0,
        unlocked: 0
      }, true, 'Achievements retrieved successfully');
    } catch (error) {
      return handleApiError(error, 'Error fetching achievements');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * POST /api/achievements
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
      
      // Check if user already has this achievement claimed
      const userAchievementIds = Array.isArray(userProgress.achievements) 
        ? userProgress.achievements.map(id => id?.toString() || '')
        : [];
      
      if (userAchievementIds.includes(achievementId)) {
        return apiResponse({
          success: false,
          alreadyClaimed: true
        }, true, 'Achievement already claimed');
      }
      
      // Check if achievement is pending (eligible to claim)
      const isPending = userProgress.pendingAchievements?.includes(achievementId) || false;
      
      if (!isPending) {
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