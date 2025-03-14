export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';
import { awardXp } from '@/lib/xp-manager-improved';
import { Types } from 'mongoose';
import { AddXpResponse, AddXpResponseData } from '@/types/api/progressResponses';
import { schemas } from '@/lib/validation';
import { ProgressCategory } from '@/types/models/progress';

/**
 * POST /api/progress/add-xp
 * 
 * Adds XP to a user's progress and returns updated progress information.
 */
export const POST = withAuth<AddXpResponseData>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    
    // Defensive check for userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    // Validate request body with defensive error handling
    let requestData;
    try {
      requestData = await validateRequest(
        req,
        schemas.xp.addXp
      );
    } catch (error: any) {
      // If validateRequest already returned an API error response
      if (error && typeof error.status === 'number' && typeof error.json === 'function') {
        return error;
      }
      return apiError('Invalid request data', 400, 'ERR_VALIDATION');
    }
    
    // Safely extract values with defaults
    const xpAmount = Number(requestData?.xpAmount || 0);
    const category = requestData?.category as ProgressCategory | undefined;
    const source = requestData?.source || '';
    const details = requestData?.details || '';
    
    // Add additional defensive validation
    if (!xpAmount || xpAmount <= 0) {
      return apiError('XP amount must be positive', 400, 'ERR_VALIDATION');
    }
    
    if (!source || typeof source !== 'string' || source.trim() === '') {
      return apiError('Source is required', 400, 'ERR_VALIDATION');
    }
    
    // Award XP and get comprehensive result with error handling
    const result = await awardXp(
      userId,
      xpAmount,
      source,
      category,
      details
    );
    
    // Handle case where result is undefined or null
    if (!result) {
      return apiError('Failed to process XP award', 500, 'ERR_PROCESSING');
    }
    
    // Generate appropriate success message with defensive checks
    let message: string;
    
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
    
    return apiResponse(result, true, message);
  } catch (error) {
    return handleApiError(error, 'Error processing XP award');
  }
}, AuthLevel.DEV_OPTIONAL);