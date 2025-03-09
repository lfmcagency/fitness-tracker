export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { apiResponse, apiError } from '@/lib/api-utils';
import { isValidObjectId } from 'mongoose';

// Response type for settings
type SettingsResponse = {
  settings: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
  };
};

const handler = async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    if (!isValidObjectId(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_VALIDATION');
    }
    const user = await User.findById(userId).select('settings');
    if (!user) {
      return apiError('User not found', 404, 'ERR_NOT_FOUND');
    }
    const settings = user.settings || { weightUnit: 'kg' };
    return apiResponse<SettingsResponse>({ settings }, true, 'User settings retrieved successfully');
  } catch (error) {
    return apiError('Error retrieving user settings', 500, 'ERR_INTERNAL');
  }
};

export const GET = withAuth<SettingsResponse>(handler, AuthLevel.DEV_OPTIONAL);