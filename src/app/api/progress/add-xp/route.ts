// src/app/api/progress/add-xp/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { handleProgressEvent } from '@/lib/xp/index';
import { XpAwardResult } from '@/types/api/progressResponses';
import { ProgressContract } from '@/lib/event-coordinator/types';
import { Types } from 'mongoose';

/**
 * POST /api/progress/add-xp
 * 
 * Simplified endpoint that receives simple ProgressContract from coordinator
 * Handles both forward actions (award XP) and reverse actions (subtract XP)
 */
export const POST = withAuth<XpAwardResult>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    
    // Validate userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    // Parse request body
    let contract: ProgressContract;
    try {
      contract = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate contract structure
    if (!contract.token || !contract.source || !contract.action || !contract.context) {
      return apiError('Invalid progress contract - missing required fields', 400, 'ERR_VALIDATION');
    }
    
    // Ensure userId matches authenticated user
    contract.userId = userId;
    
    console.log(`🎯 [PROGRESS-API] Processing ${contract.source}_${contract.action} | ${contract.token}`);
    
    // Handle progress event (both forward and reverse)
    const result = await handleProgressEvent(contract);
    
    // Build success message
    let message: string;
    if (contract.action.startsWith('reverse_')) {
      message = `Reversed ${Math.abs(result.xpAwarded)} XP`;
      if (result.leveledUp) {
        message += ` - Level decreased to ${result.currentLevel}`;
      }
    } else {
      message = `Awarded ${result.xpAwarded} XP`;
      if (result.leveledUp) {
        message += ` - Level up! Now level ${result.currentLevel}`;
      }
      if (result.achievementsUnlocked?.length) {
        message += ` - ${result.achievementsUnlocked.length} achievement(s) unlocked!`;
      }
    }
    
    console.log(`✅ [PROGRESS-API] ${contract.token} complete: ${message}`);
    
    return apiResponse(result, true, message);
    
  } catch (error) {
    return handleApiError(error, 'Error processing progress event');
  }
}, AuthLevel.DEV_OPTIONAL);