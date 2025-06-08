// src/types/api/userResponses.ts
import { IUserSettings } from '@/types/models/user'; // Use model types as base
import { ApiResponse } from './common';

// --- FIX: Define and Export ApiWeightEntry HERE ---
export interface ApiWeightEntry {
    _id?: string; // Optional because it might not be present before creation OR if mapped from older data without ID
    weight: number;
    date: string; // ISO date string
    notes?: string;
}

// Represents the user profile data structure within API responses
export interface IUserProfileData {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    role: 'user' | 'admin' | 'trainer';
    createdAt?: string | null;
    stats?: {
        level: number;
        xp: number;
    } | null;
}

// Represents the FULL data payload for GET /api/user/profile
export interface UserProfilePayload {
    user: IUserProfileData;
    settings?: IUserSettings | null;
}

// Specific response type for the profile endpoint
export type UserProfileApiResponse = ApiResponse<UserProfilePayload>;