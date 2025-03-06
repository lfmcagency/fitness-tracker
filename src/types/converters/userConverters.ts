// src/types/converters/userConverters.ts
import { IUser } from '../models/user';
import { UserProfile } from '../api/authResponses';
import { WeightEntry } from '../api/userResponses';

/**
 * Converts a User document to a UserProfile response
 */
export function convertUserToProfile(user: IUser): UserProfile {
  return {
    id: user._id.toString(),
    name: user.name || '',
    email: user.email,
    image: user.image || null,
    role: user.role || 'user',
    settings: user.settings || {
      weightUnit: 'kg',
    }
  };
}

/**
 * Converts database weight entries to API format
 */
export function convertWeightEntries(
  entries?: Array<{ weight: number; date: Date; notes?: string }>
): WeightEntry[] {
  if (!Array.isArray(entries)) return [];
  
  return entries.map(entry => ({
    weight: entry.weight,
    date: entry.date.toISOString(),
    notes: entry.notes
  }));
}