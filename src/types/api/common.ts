// src/types/api/common.ts

/**
 * Standard API success response structure
 * @template T The type of data returned in successful responses
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

/**
 * Union type for all API responses
 * @template T The type of data returned in successful responses
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;