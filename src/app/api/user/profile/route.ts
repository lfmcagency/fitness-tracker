// src/app/api/user/profile/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
// --- FIX: Use the correct converter ---
import { convertUserToProfileResponse } from '@/types/converters/userConverters';
import mongoose, { isValidObjectId } from 'mongoose';
import { IUser } from '@/types/models/user'; // Use the corrected type
import { ErrorCode } from '@/types/validation';
// --- FIX: Use the correct response type ---
import { UserProfileApiResponse, UserProfilePayload } from "@/types/api/userResponses";

/**
 * GET /api/user/profile
 * Get the full profile for the currently authenticated user.
 */
export const GET = withAuth<UserProfilePayload>( // Generic type is the PAYLOAD
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();

      if (!isValidObjectId(userId)) {
        console.error(`[API Profile GET] Invalid userId in token: ${userId}`);
        return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION);
      }

      // Use lean only if not calling methods/middleware on the doc later
      const user = await User.findById(userId).select('-password').lean() as IUser | null;

      if (!user) {
        console.warn(`[API Profile GET] User not found for validated userId: ${userId}`);
        return apiError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      // --- FIX: Use the correct converter which returns UserProfilePayload ---
      const userProfilePayload = convertUserToProfileResponse(user);

      // --- FIX: Pass the payload to apiResponse ---
      // The generic T in apiResponse is UserProfilePayload
      return apiResponse<UserProfilePayload>(userProfilePayload, true, 'User profile retrieved successfully');

    } catch (error: unknown) {
      return handleApiError(error, 'Error fetching user profile');
    }
  },
  AuthLevel.USER
);