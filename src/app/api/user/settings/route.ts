// src/app/api/user/settings/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';;
import User from '@/models/User';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from 'mongoose';

/**
 * GET /api/user/settings
 * Get user settings
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Validate userId to prevent MongoDB injection
    if (!userId || !isValidObjectId(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_VALIDATION');
    }
    
    // Get user settings
    const user = await User.findById(userId).select('settings');
    
    if (!user) {
      return apiError('User not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Ensure settings exists with defaults
    const settings = user.settings || {
      weightUnit: 'kg'
    };
    
    return apiResponse({
      settings
    }, true, 'User settings retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving user settings');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * PUT /api/user/settings
 * Update user settings
 */
export const PUT = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Validate userId to prevent MongoDB injection
    if (!userId || !isValidObjectId(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_VALIDATION');
    }
    
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate settings object
    if (!body || typeof body !== 'object') {
      return apiError('Invalid settings data', 400, 'ERR_INVALID_DATA');
    }
    
    const { settings } = body;
    
    if (!settings || typeof settings !== 'object') {
      return apiError('Settings must be an object', 400, 'ERR_VALIDATION');
    }
    
    // Validate specific settings
    if (settings.weightUnit !== undefined) {
      if (typeof settings.weightUnit !== 'string' || !['kg', 'lbs'].includes(settings.weightUnit)) {
        return apiError('Weight unit must be either "kg" or "lbs"', 400, 'ERR_VALIDATION');
      }
    }
    
    // Update user settings
    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { settings } },
        { new: true, runValidators: true }
      ).select('settings');
      
      if (!updatedUser) {
        return apiError('User not found', 404, 'ERR_NOT_FOUND');
      }
    } catch (error) {
      return handleApiError(error, 'Error updating user settings');
    }
    
    // Get updated settings with defaults
    const updatedSettings = updatedUser.settings || {
      weightUnit: 'kg'
    };
    
    return apiResponse({
      settings: updatedSettings
    }, true, 'Settings updated successfully');
  } catch (error) {
    return handleApiError(error, 'Error updating user settings');
  }
}, AuthLevel.DEV_OPTIONAL);