import { ApiResponse } from './common';

/**
 * Response data for weight history
 */
export interface WeightHistoryData {
  history: Array<{
    weight: number;
    date: string;
    notes?: string;
  }>;
  count: number;
  unit: 'kg' | 'lbs';
  trends?: {
    totalChange: number;
    period: number;
    weeklyRate: number;
    direction: 'gain' | 'loss' | 'maintain';
  } | null;
}

/**
 * Response data for a single weight entry
 */
export interface WeightEntryData {
  entry: {
    weight: number;
    date: string;
    notes?: string;
  };
  count: number;
}

// API response types
export type WeightHistoryResponse = ApiResponse<WeightHistoryData>;
export type WeightEntryResponse = ApiResponse<WeightEntryData>;