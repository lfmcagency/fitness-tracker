export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';
import { validateRequest, schemas } from '@/lib/validation';
import { awardXp } from '@/lib/xp-manager';

/**
 * POST /api/progress/add-xp
 * 
 * Adds XP to a user's progress and returns updated progress information.
 * Detects level-ups and updates category-specific XP if provided.
 * Checks for and awards any newly unlocked achievements.
 * 
 * Request payload:
 * - xpAmount: number (required) - Amount of XP to award
 * - category: string (optional) - One of: "core", "push", "pull", "legs"
 * - source: string (required) - Describes the activity that earned the XP
 * - details: string (optional) - Additional context about the XP award
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Validate request body - only do this once
    const { xpAmount, category, source, details } = await validateRequest(
      req,
      schemas.xp.addXp
    );
    
    // Add additional defensive validation
    if (!xpAmount || xpAmount <= 0) {
      return apiError('XP amount must be positive', 400, 'ERR_VALIDATION');
    }
    
    if (!source) {
      return apiError('Source is required', 400, 'ERR_VALIDATION');
    }
    
    // Award XP and get comprehensive result
    const result = await awardXp(
      userId,
      xpAmount,
      source,
      category,
      details
    );
    
    // Generate appropriate success message
    let message;
    
    if (result.leveledUp && result.achievements?.count && result.category?.milestone) {
      message = `Congratulations! You've leveled up to ${result.currentLevel}, reached the ${result.category.milestone.milestone} milestone in ${category}, and unlocked ${result.achievements.count} achievement(s)!`;
    } else if (result.leveledUp && result.category?.milestone) {
      message = `Congratulations! You've leveled up to ${result.currentLevel} and reached the ${result.category.milestone.milestone} milestone in ${category}!`;
    } else if (result.achievements?.count && result.category?.milestone) {
      message = `You've earned ${xpAmount} XP, reached the ${result.category.milestone.milestone} milestone in ${category}, and unlocked ${result.achievements.count} achievement(s)!`;
    } else if (result.category?.milestone) {
      message = `You've earned ${xpAmount} XP and reached the ${result.category.milestone.milestone} milestone in ${category}!`;
    } else if (result.leveledUp && result.achievements?.count) {
      message = `Congratulations! You've leveled up to level ${result.currentLevel} and unlocked ${result.achievements.count} new achievement(s)!`;
    } else if (result.leveledUp) {
      message = `Congratulations! You've leveled up to level ${result.currentLevel}!`;
    } else if (result.achievements?.count) {
      message = `You've earned ${xpAmount} XP and unlocked ${result.achievements.count} new achievement(s)!`;
    } else {
      message = `You've earned ${xpAmount} XP from ${source}. ${result.xpToNextLevel} XP until next level.`;
    }
    
    return apiSuccess(result, message);
  } catch (error) {
    return handleApiError(error, 'Error processing XP award');
  }
}, AuthLevel.DEV_OPTIONAL);