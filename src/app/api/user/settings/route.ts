export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from 'mongoose';
import { ErrorCode } from '@/types/validation';
import { IUser } from '@/types/models/user';

// Response type for settings
interface SettingsData {
  settings: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
  };
}

// Request type for updating settings
interface UpdateSettingsRequest {
  settings: {
    weightUnit?: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
  };
}

/**
 * GET /api/user/settings
 * Get user settings
 */
export const GET = withAuth<SettingsData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Validate userId
      if (!isValidObjectId(userId)) {
        return apiError('Invalid user ID', 400, ErrorCode.VALIDATION);
      }
      
      // Find user by ID
      const user = await User.findById(userId).select('settings') as IUser | null;
      
      if (!user) {
        return apiError('User not found', 404, ErrorCode.NOT_FOUND);
      }
      
      // Ensure settings exists with defaults
      const settings = user.settings || { 
        weightUnit: 'kg',
        lengthUnit: 'cm',
        theme: 'light'
      };
      
      // Return successful response
      return apiResponse<SettingsData>(
        { settings }, 
        true, 
        'User settings retrieved successfully'
      );
    } catch (error) {
      return handleApiError(error, 'Error retrieving user settings');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/user/settings
 * Update user settings
 */
export const PUT = withAuth<SettingsData>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Validate userId
      if (!isValidObjectId(userId)) {
        return apiError('Invalid user ID', 400, ErrorCode.VALIDATION);
      }
      
      // Parse request body with defensive error handling
      let body: UpdateSettingsRequest;
      
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, ErrorCode.INVALID_JSON);
      }
      
      // Validate body
      if (!body || !body.settings) {
        return apiError('Settings object is required', 400, ErrorCode.VALIDATION);
      }
      
      // Find and update user
      const user = await User.findById(userId) as IUser | null;
      
      if (!user) {
        return apiError('User not found', 404, ErrorCode.NOT_FOUND);
      }
      
      // Initialize settings if not exists
      if (!user.settings) {
        user.settings = {
          weightUnit: 'kg',
          lengthUnit: 'cm',
          theme: 'light'
        };
      }
      
      // Update settings
      if (body.settings.weightUnit) {
        user.settings.weightUnit = body.settings.weightUnit;
      }
      
      if (body.settings.lengthUnit) {
        user.settings.lengthUnit = body.settings.lengthUnit;
      }
      
      if (body.settings.theme) {
        user.settings.theme = body.settings.theme;
      }
      
      // Save user
      await user.save();
      
      // Return updated settings
      return apiResponse<SettingsData>(
        { settings: user.settings }, 
        true, 
        'User settings updated successfully'
      );
    } catch (error) {
      return handleApiError(error, 'Error updating user settings');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);