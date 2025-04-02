// src/types/api/settingsResponses.ts

import { IUserSettings } from '@/types/models/user'; // Use the clean model type
import { ApiResponse } from './common';

// Represents the data payload for GET /api/user/settings
export interface UserSettingsPayload {
  settings: IUserSettings;
}

// Represents the request body for PUT /api/user/settings
export interface UpdateUserSettingsRequest {
  settings: Partial<IUserSettings>; // Allow updating parts of settings
}

// Specific response type for the settings endpoint
export type UserSettingsApiResponse = ApiResponse<UserSettingsPayload>;