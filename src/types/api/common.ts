/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp?: string;
}

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
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}
/**
 * Standard API response format (union of success and error)
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
}