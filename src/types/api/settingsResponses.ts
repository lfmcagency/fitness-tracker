import { ApiResponse } from './common';

/**
 * User settings data structure
 */
export interface SettingsData {
  settings: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
    notificationPreferences?: {
      email: boolean;
      push: boolean;
    };
  };
}

/**
 * Request body for updating settings
 */
export interface UpdateSettingsRequest {
  settings: {
    weightUnit?: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
    notificationPreferences?: {
      email?: boolean;
      push?: boolean;
    };
  };
}

// API response types
export type SettingsResponse = ApiResponse<SettingsData>;