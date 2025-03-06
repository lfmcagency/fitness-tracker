/**
 * Standard API response format used across all endpoints
 * @template T The type of data returned in successful responses
 */
export interface ApiResponse<T = any> {
    /** Whether the request was successful */
    success: boolean;
    /** The data returned by the API (only present on success) */
    data?: T;
    /** A human-readable message describing the result */
    message?: string;
    /** Error information (only present on failure) */
    error?: {
      /** Error code for programmatic handling */
      code: string;
      /** Human-readable error message */
      message: string;
      /** Additional error details (only in development) */
      details?: any;
    };
    /** ISO timestamp of when the response was generated */
    timestamp: string;
  }
  
  /**
   * Standard error information structure
   */
  export interface ApiErrorInfo {
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: any;
  }
  
  /**
   * Type for successful API responses
   * @template T The type of data returned
   */
  export type ApiSuccessResponse<T> = {
    success: true;
    data: T;
    message?: string;
    timestamp: string;
  };
  
  /**
   * Type for failed API responses
   */
  export type ApiErrorResponse = {
    success: false;
    error: ApiErrorInfo;
    timestamp: string;
  };