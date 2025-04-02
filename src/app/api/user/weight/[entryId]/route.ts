// src/app/api/user/weight/[entryId]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose, { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { withAuth, AuthLevel } from '@/lib/auth-utils'; // Assuming withAuth exists and works
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { ErrorCode } from '@/types/validation';
import { ParsedUrlQuery } from 'querystring'; // Import if needed, but likely params object is simpler

// --- FIX: Define the expected shape of the params object ---
// This is simpler than the full RouteContext and likely what withAuth passes
interface DeleteWeightParams {
    entryId: string;
}

/** DELETE /api/user/weight/[entryId] */
// --- FIX: Adjust handler signature passed to withAuth ---
// Assume withAuth provides (req, userId, params)
export const DELETE = withAuth<void, { entryId: string }>(
  async (_req: NextRequest, userId: string, context?: { params: { entryId: string } }) => { // Expect context object
    try {
      await dbConnect();

      // --- FIX: Safely access entryId from params ---
      const entryId = context?.params?.entryId;

      if (!isValidObjectId(userId)) {
          return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION);
      }
      if (!entryId || !isValidObjectId(entryId)) { // Check entryId validity
        // Log the received params for debugging if the error persists
        console.error("DELETE /weight error: Invalid or missing entryId. Received params:", context?.params);
        return apiError('Invalid or missing entry ID', 400, ErrorCode.VALIDATION);
      }

      // Update logic using updateOne for efficiency
      const updateResult = await User.updateOne(
          { _id: userId },
          { $pull: { bodyweight: { _id: entryId } } }
      );

      if (updateResult.matchedCount === 0) {
          return apiError('User not found', 404, ErrorCode.NOT_FOUND);
      }
      if (updateResult.modifiedCount === 0) {
          console.warn(`Weight entry ${entryId} not found/deleted for user ${userId}.`);
          // Consider this success as the entry is gone from client perspective
      }

      return apiResponse<void>(undefined, true, 'Weight entry deleted', 200); // Use 200 or 204

    } catch (error: unknown) { return handleApiError(error, 'Error deleting weight entry'); }
  }, AuthLevel.USER // Ensure requires authenticated user
);