// src/lib/api-utils.ts
import { NextResponse } from 'next/server';
import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '../types/api/common';
import { ErrorCode } from '../types/validation';

/**
 * Standard API success response
 * @param data Response data
 * @param message Optional success message
 * @param status HTTP status code (default: 200)
 * @returns NextResponse with formatted API response
 */
export function apiResponse<T>(
  data: T,
  success = true,
  message = '',
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  const timestamp = new Date().toISOString();
  
  // Ensure success is always true for ApiSuccessResponse type
  if (!success) {
    throw new Error("apiResponse should only be used for successful responses; use apiError for errors");
  }
  
  return NextResponse.json({
    success: true, // Explicitly true to match ApiSuccessResponse type
    data,
    message,
    timestamp
  }, { status });
}

/**
 * Standard API error response
 * @param message Error message
 * @param status HTTP status code (default: 500)
 * @param code Error code (default: 'ERR_INTERNAL')
 * @param details Additional error details (optional)
 * @returns NextResponse with formatted error response
 */
export function apiError(
  message: string,
  status = 500,
  code: string = ErrorCode.INTERNAL,
  details?: any
): NextResponse<ApiErrorResponse> {
  const timestamp = new Date().toISOString();
  
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    },
    timestamp
  }, { status });
}

/**
 * Error handler for API routes
 * @param error Error object
 * @param contextMessage Context message for logging
 * @returns NextResponse with formatted error response
 */
export function handleApiError(
  error: unknown,
  contextMessage: string
): NextResponse<ApiErrorResponse> {
  console.error(`API Error: ${contextMessage}`, error);
  
  // Default error values
  let status = 500;
  let errorCode = ErrorCode.INTERNAL;
  let errorMessage = contextMessage || 'An internal error occurred';
  let errorDetails;
  
  // If the error is already a NextResponse, return it
  if (error instanceof NextResponse) {
    return error as NextResponse<ApiErrorResponse>;
  }
  
  // Handle specific error types
  if (error instanceof Error) {
    errorDetails = error.message;
    
    // Handle MongoDB/Mongoose specific errors
    if ('name' in error && error.name === 'ValidationError') {
      status = 400;
      errorCode = ErrorCode.VALIDATION;
      errorMessage = 'Validation error';
      errorDetails = formatValidationErrors(error);
    } else if ('name' in error && error.name === 'CastError') {
      status = 400;
      errorCode = ErrorCode.INVALID_ID;
      errorMessage = 'Invalid ID format';
    }
  }
  
  return NextResponse.json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    },
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Format Mongoose validation errors into a structured object
 * @param error Mongoose validation error
 * @returns Formatted error object
 */
export function formatValidationErrors(error: any): Record<string, string> | string {
  if (!error.errors) return error.message;
  
  const formattedErrors: Record<string, string> = {};
  
  Object.keys(error.errors).forEach(key => {
    formattedErrors[key] = error.errors[key].message;
  });
  
  return formattedErrors;
}