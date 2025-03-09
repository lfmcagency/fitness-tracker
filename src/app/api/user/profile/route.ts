export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { WeightEntry } from "@/types/api/userResponses";
import { convertUserToProfile, convertWeightEntries } from '@/types/converters/userConverters';
import { isValidObjectId } from 'mongoose';
import { IUser } from '@/types/models/user';
import { ErrorCode } from '@/types/validation';

// Define the profile data shape based on UserProfileResponse in userResponses.ts
interface UserProfileData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'user' | 'admin' | 'trainer';
  settings?: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
  };
  bodyweight?: WeightEntry[];
  stats?: {
    level: number;
    xp: number;
  };
}

export const GET = withAuth<UserProfileData>(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    
    // Validate userId
    if (!isValidObjectId(userId)) {
      return apiError('Invalid user ID', 400, ErrorCode.VALIDATION);
    }
    
    // Find user by ID
    const user = await User.findById(userId).select('-password') as IUser | null;
    
    if (!user) {
      return apiError('User not found', 404, ErrorCode.NOT_FOUND);
    }
    
    // Convert database user to API response format
    const userProfile = convertUserToProfile(user);
    
    // Add weight history if available
    const weightHistory = user.bodyweight && user.bodyweight.length > 0 
      ? convertWeightEntries(user.bodyweight) 
      : undefined;
    
    // Return successful response
    return apiResponse<UserProfileData>({
      ...userProfile,
      bodyweight: weightHistory,
      stats: user.stats
    }, true, 'User profile retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error fetching user profile');
  }
}, AuthLevel.DEV_OPTIONAL);