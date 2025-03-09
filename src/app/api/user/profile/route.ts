export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError } from '@/lib/api-utils';
import { UserProfileResponse } from "@/types/api/userResponses";
import { convertUserToProfile } from '@/types/converters/userConverters';

// Success data type
type ProfileSuccessData = UserProfileResponse['data'];
type UserProfileData = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'user' | 'admin' | 'trainer';
  // ... other properties
};

export const GET = withAuth<UserProfileData>(async (req, userId) => {
  try {
    await dbConnect();
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return apiError('User not found', 404, 'ERR_NOT_FOUND');
    }
    const userProfile = convertUserToProfile(user);
    return apiResponse<UserProfileData>(userProfile);
  } catch (error) {
    return apiError('Error fetching user profile', 500, 'ERR_INTERNAL');
  }
});