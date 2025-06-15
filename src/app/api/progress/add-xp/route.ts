// src/app/api/progress/add-xp/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { handleRichProgressEvent, handleLegacyProgressEvent } from '@/lib/xp/index';
import { ProgressEventContract, XpAwardResult } from '@/types/api/progressResponses';
import { RichProgressContract } from '@/lib/event-coordinator/types';
import { Types } from 'mongoose';

/**
 * POST /api/progress/add-xp
 * 
 * Now handles both rich contracts (Phase 5) and legacy contracts (backward compatibility)
 * Rich contracts provide complete context for atomic operations
 */
export const POST = withAuth<XpAwardResult>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    
    // Validate userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_INVALID_ID');
    }
    
    // Parse request body
    let requestData: ProgressEventContract | RichProgressContract;
    try {
      requestData = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Detect contract type and route accordingly
    if (isRichProgressContract(requestData)) {
      console.log(`🚀 [PROGRESS] Processing rich contract: ${requestData.token}`);
      
      // Ensure userId matches authenticated user
      requestData.userId = userId;
      
      // Handle rich contract with atomic operations
      const result = await handleRichProgressEvent(requestData);
      
      // Build success message
      let message = `Awarded ${result.xpAwarded} XP`;
      if (result.leveledUp) {
        message += ` - Level up! Now level ${result.currentLevel}`;
      }
      if (result.achievementsUnlocked?.length) {
        message += ` - ${result.achievementsUnlocked.length} achievement(s) unlocked!`;
      }
      if (result.tasksUpdated?.length) {
        message += ` - ${result.tasksUpdated.length} task(s) updated`;
      }
      
      return apiResponse(result, true, message);
      
    } else {
      console.log(`📦 [PROGRESS] Processing legacy contract: ${requestData.eventId}`);
      
      // Validate legacy contract fields
      if (!requestData.eventId || !requestData.source || 
          requestData.streakCount === undefined || requestData.totalCompletions === undefined) {
        return apiError('Invalid legacy contract - missing required fields', 400, 'ERR_VALIDATION');
      }
      
      // Ensure userId matches authenticated user
      (requestData as ProgressEventContract).userId = userId;
      
      // Handle legacy contract
      const result = await handleLegacyProgressEvent(requestData as ProgressEventContract);
      
      // Build success message
      let message = `Awarded ${result.xpAwarded} XP`;
      if (result.leveledUp) {
        message += ` - Level up! Now level ${result.currentLevel}`;
      }
      if (result.achievementsUnlocked?.length) {
        message += ` - ${result.achievementsUnlocked.length} achievement(s) unlocked!`;
      }
      
      return apiResponse(result, true, message);
    }
    
  } catch (error) {
    return handleApiError(error, 'Error processing XP award');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * Type guard to detect rich vs legacy contracts
 */
function isRichProgressContract(data: any): data is RichProgressContract {
  return data && 
         typeof data.token === 'string' &&
         typeof data.context === 'object' &&
         Array.isArray(data.taskUpdates) &&
         Array.isArray(data.achievementThresholds) &&
         typeof data.xpMetadata === 'object';
}