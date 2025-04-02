// src/types/api/weightResponses.ts
import { ApiResponse } from './common';
import { ApiWeightEntry } from './userResponses'; // Use the consistent ApiWeightEntry type

// Represents the data payload for GET /api/user/weight
export interface WeightHistoryPayload {
  // --- FIX: ApiWeightEntry is now defined/imported before use ---
  history: ApiWeightEntry[];
  unit: 'kg' | 'lbs';
  count: number;
  trends?: {
    totalChange: number;
    period: number; // In days
    weeklyRate: number;
    direction: 'gain' | 'loss' | 'maintain';
  } | null;
}

// Represents the request body for POST /api/user/weight
export interface AddWeightEntryRequest {
  weight: number | string; // Allow string input from form
  date?: string; // ISO Date string (optional, defaults to now)
  notes?: string;
}

// Represents the data payload for the response of POST /api/user/weight
export interface AddedWeightEntryPayload {
   // --- FIX: ApiWeightEntry is now defined/imported before use ---
  entry: ApiWeightEntry; // The newly created entry WITH _id
  count: number; // Total count after adding
}

// --- Specific API Response Types ---
export type WeightHistoryApiResponse = ApiResponse<WeightHistoryPayload>;
export type AddedWeightEntryApiResponse = ApiResponse<AddedWeightEntryPayload>;


export type { ApiWeightEntry };
// --- FIX: Use 'export type' for re-exporting types with isolatedModules ---
// Re-exporting ApiWeightEntry is actually redundant if imported above,
// but if you needed to re-export for other reasons, it would be:
// export type { ApiWeightEntry } from './userResponses';
// Let's remove the redundant re-export as it's directly imported now.