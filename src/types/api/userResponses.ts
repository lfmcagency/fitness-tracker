// src/types/api/userResponses.ts
// Represents the data structures returned BY the API endpoints

import { IUserSettings } from '@/types/models/user'; // Use model types as base
import { ApiResponse } from './common';

// Represents a single weight entry as returned by the API
// Note: Date is stringified, _id is stringified
// --- FIX: Make sure ApiWeightEntry is exported (it was missing in user prompt, but should be here or own file) ---
export interface ApiWeightEntry {
    _id?: string; // Optional because it might not be present before creation OR if mapped from older data without ID
    weight: number;
    date: string; // ISO date string
    notes?: string;
}

// Represents the user profile data structure within API responses
export interface IUserProfileData {
    id: string; // Usually user._id.toString()
    name?: string | null;
    email: string; // Usually mandatory
    image?: string | null;
    role: 'user' | 'admin' | 'trainer';
    createdAt?: string | null; // ISO date string
    stats?: { // Mirror stats from IUser if needed
        level: number;
        xp: number;
    } | null;
}

// Represents the FULL data payload for GET /api/user/profile
// This structure should be returned inside ApiSuccessResponse.data
export interface UserProfilePayload {
    user: IUserProfileData;
    settings?: IUserSettings | null; // Use the clean IUserSettings type
    bodyweight?: ApiWeightEntry[] | null; // Array of API-formatted weight entries
}

// Specific response type for the profile endpoint
export type UserProfileApiResponse = ApiResponse<UserProfilePayload>;

// Request body for updating parts of the user profile (if needed)
// Example: PUT /api/user/profile (Not implemented yet)
// export interface UpdateProfileRequest {
//   name?: string;
//   image?: string | null;
// }
// export type UpdateProfileResponse = ApiResponse<IUserProfileData>; // Return updated user data