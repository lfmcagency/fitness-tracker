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
export interface ApiSuccessResponse<T> extends ApiResponse {
  success: true;
  data: T;
  message?: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Type alias for a response type
 */
export type ResponseType<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;