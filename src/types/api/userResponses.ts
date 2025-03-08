import { ApiResponse } from './common';

export interface WeightEntry {
  weight: number;
  date: string; // ISO date string
  notes?: string;
}

// Changed from interface to type alias
export type UserProfileResponse = ApiResponse<{
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
}>;

export interface UpdateProfileRequest {
  name?: string;
  image?: string | null;
  settings?: {
    weightUnit?: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
  };
  currentPassword?: string;
  newPassword?: string;
}