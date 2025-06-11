// src/types/api/common.ts

/**
 * API success response with data
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // Use ErrorCode enum values if available
    message: string;
    details?: any; // For development debugging
  };
  timestamp?: string;
}

/**
 * Standard API response format (union of success and error)
 */
export type ApiResponse<T = void> = ApiSuccessResponse<T> | ApiErrorResponse; // Default T to void if no data