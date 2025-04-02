// src/app/api/user/settings/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import mongoose, { isValidObjectId } from 'mongoose';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { ErrorCode } from '@/types/validation';
import { IUser, IUserSettings } from '@/types/models/user';
import { UserSettingsApiResponse, UserSettingsPayload, UpdateUserSettingsRequest } from '@/types/api/settingsResponses';

/** GET /api/user/settings */
export const GET = withAuth<UserSettingsPayload>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      if (!isValidObjectId(userId)) { return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION); }

      const user = await User.findById(userId).select('settings').lean() as Pick<IUser, 'settings'> | null;

      if (!user) {
        console.warn(`[API Settings GET] User not found for validated userId: ${userId}`);
        return apiError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      const settings: IUserSettings = user.settings || { weightUnit: 'kg', lengthUnit: 'cm', theme: 'system' };
      return apiResponse<UserSettingsPayload>({ settings: settings }, true, 'User settings retrieved');

    } catch (error: unknown) { return handleApiError(error, 'Error retrieving settings'); }
  }, AuthLevel.USER
);

/** PUT /api/user/settings */
export const PUT = withAuth<UserSettingsPayload>(
  async (req: NextRequest, userId: string) => {
    let body: UpdateUserSettingsRequest; // Defined outside try
    try {
      await dbConnect();
      if (!isValidObjectId(userId)) { return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION); }

      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, ErrorCode.INVALID_JSON); // Ensure return
      }

      if (!body || typeof body.settings !== 'object' || body.settings === null) {
        return apiError('Request body must include a "settings" object', 400, ErrorCode.VALIDATION);
      }

      const { weightUnit, lengthUnit, theme } = body.settings;
      // Add validation for values if needed

      const user = await User.findById(userId) as IUser | null;

      if (!user) {
        console.warn(`[API Settings PUT] User not found for validated userId: ${userId}`);
        return apiError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      // Ensure settings object exists (using model default is better)
      if (!user.settings) {
        user.settings = { weightUnit: 'kg', lengthUnit: 'cm', theme: 'system' };
      }

      const updatedFields: Partial<IUserSettings> = {};
      // Apply updates safely
      if (weightUnit && user.settings) { user.settings.weightUnit = weightUnit; updatedFields.weightUnit = weightUnit; }
      if (lengthUnit && user.settings) { user.settings.lengthUnit = lengthUnit; updatedFields.lengthUnit = lengthUnit; }
      if (theme && user.settings) { user.settings.theme = theme; updatedFields.theme = theme; }


      if (Object.keys(updatedFields).length > 0) {
         await user.save();
      }

      // Ensure settings exist before returning
      const finalSettings = user.settings || { weightUnit: 'kg', lengthUnit: 'cm', theme: 'system' };
      return apiResponse<UserSettingsPayload>({ settings: finalSettings }, true, 'Settings updated');

    } catch (error: unknown) {
      if (error instanceof mongoose.Error.ValidationError) { return apiError(`Validation failed: ${error.message}`, 400, ErrorCode.VALIDATION); }
      return handleApiError(error, 'Error updating user settings');
    }
  }, AuthLevel.USER
);