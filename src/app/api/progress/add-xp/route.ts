// src/app/api/progress/add-xp/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { handleProgressEvent } from '@/lib/xp/index';
import { ProgressEventContract, XpAwardResult } from '@/types/api/progressResponses';
import { Types } from 'mongoose';

/**
 * POST /api/progress/add-xp
 * 
 * Receives event contracts from Ethos and awards XP
 * This is now a thin API layer - all logic moved to handleProgressEvent
 */
export const POST = withAuth<XpAwardResult>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    
    // Validate userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    // Parse request body
    let contract: ProgressEventContract;
    try {
      contract = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate required contract fields
    if (!contract.eventId || !contract.source || contract.streakCount === undefined || contract.totalCompletions === undefined) {
      return apiError('Invalid event contract - missing required fields', 400, 'ERR_VALIDATION');
    }
    
    // Ensure userId matches authenticated user
    contract.userId = userId;
    
    // Handle the event
    const result = await handleProgressEvent(contract);
    
    // Build success message
    let message = `Awarded ${result.xpAwarded} XP`;
    if (result.leveledUp) {
      message += ` - Level up! Now level ${result.currentLevel}`;
    }
    if (result.achievementsUnlocked?.length) {
      message += ` - ${result.achievementsUnlocked.length} achievement(s) unlocked!`;
    }
    
    return apiResponse(result, true, message);
  } catch (error) {
    return handleApiError(error, 'Error processing XP award');
  }
}, AuthLevel.DEV_OPTIONAL);