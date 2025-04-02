// src/types/converters/userConverters.ts

import { IUser, IWeightEntry as DbWeightEntry, IUserSettings } from '@/types/models/user'; // Use Db types
import { UserProfilePayload, IUserProfileData, ApiWeightEntry } from '@/types/api/userResponses'; // Use API types
import { UserProfile as AuthUserProfile } from '@/components/auth/AuthProvider'; // Assuming type from AuthProvider


/**
 * Converts a User document (IUser) to the full UserProfilePayload for the API response.
 */
export function convertUserToProfileResponse(user: IUser): UserProfilePayload {

  // Convert user sub-part
  const userData: IUserProfileData = {
    id: user._id.toString(),
    name: user.name || null, // Ensure null if empty
    email: user.email,
    image: user.image || null,
    role: user.role || 'user',
    createdAt: user.createdAt?.toISOString() || null,
    stats: user.stats ? { // Check if stats exist
        level: user.stats.level,
        xp: user.stats.xp
    } : null,
  };

  // Convert settings (pass through if structure matches)
  // Ensure default settings are applied if user.settings is somehow null/undefined
  const settingsData: IUserSettings | null = user.settings ?? {
      weightUnit: 'kg', lengthUnit: 'cm', theme: 'system'
  };

  // Convert bodyweight entries
  const bodyweightData: ApiWeightEntry[] | null = Array.isArray(user.bodyweight)
    ? user.bodyweight.map((entry: DbWeightEntry): ApiWeightEntry => ({
        _id: entry._id?.toString(), // Ensure _id is stringified
        weight: entry.weight,
        date: entry.date.toISOString(),
        notes: entry.notes,
      }))
    : null; // Return null if no bodyweight data

  return {
    user: userData,
    settings: settingsData,
    bodyweight: bodyweightData,
  };
}


/**
 * Converts a User document to the simplified UserProfile used by AuthProvider.
 */
export function convertUserToAuthProfile(user: IUser): AuthUserProfile {
  return {
    id: user._id.toString(),
    name: user.name || '', // Provide default empty string
    email: user.email,
    image: user.image || null,
    role: user.role || 'user', // Provide default role
  };
}