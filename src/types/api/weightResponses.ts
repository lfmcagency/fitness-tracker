// src/types/api/weightResponses.ts

import { ApiResponse } from './common';
// --- FIX: Import ApiWeightEntry explicitly as a type ---
import type { ApiWeightEntry } from './userResponses'; // Use 'import type'

// Represents the data payload for GET /api/user/weight
export interface WeightHistoryPayload {
  history: ApiWeightEntry[]; // Use the imported type
  unit: 'kg' | 'lbs';
  count: number;
  trends?: {
    totalChange: number;
    period: number;
    weeklyRate: number;
    direction: 'gain' | 'loss' | 'maintain';
  } | null;
}

// Represents the request body for POST /api/user/weight
export interface AddWeightEntryRequest {
  weight: number | string;
  date?: string;
  notes?: string;
}

// Represents the data payload for the response of POST /api/user/weight
export interface AddedWeightEntryPayload {
  entry: ApiWeightEntry; // Use the imported type
  count: number;
}

// --- Specific API Response Types ---
export type WeightHistoryApiResponse = ApiResponse<WeightHistoryPayload>;
export type AddedWeightEntryApiResponse = ApiResponse<AddedWeightEntryPayload>;

// No need for redundant re-export of ApiWeightEntry