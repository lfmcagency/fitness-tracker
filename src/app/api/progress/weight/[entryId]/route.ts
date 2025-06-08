// src/app/api/progress/weight/[entryId]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import mongoose, { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { ErrorCode } from '@/types/validation';

/** DELETE /api/progress/weight/[entryId] */
export const DELETE = withAuth<void, { entryId: string }>(
  async (_req: NextRequest, userId: string, context?: { params: { entryId: string } }) => {
    try {
      await dbConnect();

      // Safely access entryId from params
      const entryId = context?.params?.entryId;

      if (!isValidObjectId(userId)) {
          return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION);
      }
      if (!entryId || !isValidObjectId(entryId)) {
        console.error("DELETE /weight error: Invalid or missing entryId. Received params:", context?.params);
        return apiError('Invalid or missing entry ID', 400, ErrorCode.VALIDATION);
      }

      // Update UserProgress document to remove the weight entry
      const updateResult = await UserProgress.updateOne(
          { userId: userId }, // Query by userId field, not _id
          { $pull: { bodyweight: { _id: entryId } } }
      );

      if (updateResult.matchedCount === 0) {
          return apiError('User progress not found', 404, ErrorCode.NOT_FOUND);
      }
      if (updateResult.modifiedCount === 0) {
          console.warn(`Weight entry ${entryId} not found/deleted for user ${userId}.`);
          // Consider this success as the entry is gone from client perspective
      }

      return apiResponse<void>(undefined, true, 'Weight entry deleted', 200);

    } catch (error: unknown) { 
      return handleApiError(error, 'Error deleting weight entry'); 
    }
  }, AuthLevel.USER
);