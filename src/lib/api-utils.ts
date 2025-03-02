import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

/**
 * General API response function that can handle both success and error cases
 * @param data Response data or error details
 * @param success Whether the response is a success (true) or error (false)
 * @param message Optional message
 * @param status HTTP status code
 * @returns NextResponse with formatted response
 */
export function apiResponse<T>(
  data: T, 
  success: boolean = true,
  message?: string,
  status: number = success ? 200 : 400
): NextResponse<ApiResponse<T>> {
  if (success) {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }, { status });
  } else {
    // Error case - if data is a string, use it as the error message
    const errorMessage = message || (typeof data === 'string' ? data : 'An error occurred');
    
    return NextResponse.json({
      success: false,
      error: {
        code: `ERR_${status}`,
        message: errorMessage
      },
      timestamp: new Date().toISOString()
    }, { status });
  }
}

/**
 * Pagination information interface
 */
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Creates a standardized successful API response
 * @param data Response data
 * @param message Optional success message
 * @param pagination Optional pagination information
 * @param status HTTP status code (default: 200)
 * @returns NextResponse with formatted success response
 */
export function apiSuccess<T>(
  data: T, 
  message?: string, 
  pagination?: PaginationInfo,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination
  }, { status });
}

/**
 * Creates a standardized error API response
 * @param message Error message
 * @param status HTTP status code (default: 400)
 * @param errorCode Optional error code
 * @param details Optional error details
 * @returns NextResponse with formatted error response
 */
export function apiError(
  message: string, 
  status: number = 400, 
  errorCode?: string,
  details?: any
): NextResponse<ApiResponse<never>> {
  // Log the error for server-side debugging
  console.error(`API Error (${status}): ${message}`, details);
  
  // Only include detailed error information in development
  const errorDetails = process.env.NODE_ENV === 'development' ? details : undefined;
  
  return NextResponse.json({
    success: false,
    error: {
      code: errorCode || `ERR_${status}`,
      message,
      details: errorDetails
    },
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Format Mongoose validation errors into a structured object
 * @param error Mongoose validation error
 * @returns Structured validation error object
 */
export function formatValidationErrors(error: mongoose.Error.ValidationError) {
  const formattedErrors: Record<string, { message: string; value?: any }> = {};
  
  for (const field in error.errors) {
    const err = error.errors[field];
    formattedErrors[field] = {
      message: err.message,
      value: err.value
    };
  }
  
  return formattedErrors;
}

/**
 * Standardized error handler for Mongoose and other common errors
 * @param error The caught error
 * @param defaultMessage Default error message if not a recognized error type
 * @returns NextResponse with appropriate error format
 */
export function handleApiError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): NextResponse {
  // Handle Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = formatValidationErrors(error);
    return apiError('Validation error', 400, 'ERR_VALIDATION', errors);
  }
  
  // Handle Mongoose CastError (usually invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    return apiError(
      `Invalid ${error.path}: ${error.value}`, 
      400, 
      'ERR_INVALID_ID',
      { path: error.path, value: error.value }
    );
  }

  // Handle document not found error
  if (error instanceof mongoose.Error.DocumentNotFoundError) {
    return apiError('Resource not found', 404, 'ERR_NOT_FOUND');
  }
  
  // Handle MongoDB duplicate key error (code 11000)
  if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
    return apiError(
      'Duplicate entry', 
      409, 
      'ERR_DUPLICATE', 
      { keyPattern: (error as any).keyPattern }
    );
  }
  
  // Handle known error instances
  if (error instanceof Error) {
    return apiError(error.message, 500, 'ERR_INTERNAL');
  }
  
  // Fallback for unknown error types
  return apiError(defaultMessage, 500, 'ERR_UNKNOWN');
}

/**
 * Helper to create pagination info from database query results
 * @param total Total number of items
 * @param page Current page number
 * @param limit Items per page
 * @returns Pagination info object
 */
export function createPaginationInfo(total: number, page: number, limit: number): PaginationInfo {
  const pages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1
  };
}