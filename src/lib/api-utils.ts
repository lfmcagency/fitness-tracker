// src/lib/api-utils.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

/**
 * Standard API response type
 */
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | Record<string, any>;
  timestamp?: string;
};

/**
 * Creates a successful API response
 */
export function apiResponse<T>(data: T, message?: string, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Creates an error API response
 */
export function apiError(
  message: string, 
  status: number = 400, 
  error?: any
): NextResponse<ApiResponse> {
  console.error(`API Error (${status}): ${message}`, error);
  
  // Only include detailed error information in development
  const errorDetails = process.env.NODE_ENV === 'development' 
    ? (error instanceof Error ? error.message : String(error)) 
    : undefined;
  
  return NextResponse.json({
    success: false,
    message,
    error: errorDetails,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Format Mongoose validation errors into a more readable object
 */
function formatValidationErrors(error: mongoose.Error.ValidationError) {
  const formattedErrors: Record<string, string> = {};
  
  for (const field in error.errors) {
    formattedErrors[field] = error.errors[field].message;
  }
  
  return formattedErrors;
}

/**
 * Standardized error handler for API routes
 */
export function handleApiError(error: unknown, message: string): NextResponse<ApiResponse> {
  // Handle Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = formatValidationErrors(error);
    return apiError(`Validation error: ${Object.values(errors).join(', ')}`, 400, errors);
  }
  
  // Handle Mongoose CastError (usually invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    return apiError(`Invalid ${error.path}: ${error.value}`, 400, error);
  }

  // Handle document not found error
  if (error instanceof mongoose.Error.DocumentNotFoundError) {
    return apiError('Resource not found', 404, error);
  }
  
  // Handle duplicate key error
  if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
    return apiError('Duplicate entry', 409, error);
  }
  
  // Log the error for server-side debugging
  console.error(`API Error: ${message}`, error);
  
  // General error response
  return apiError('Internal server error', 500, error);
}

/**
 * Wrapper for database operations with proper error handling
 */
export async function withDbConnection<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<NextResponse> {
  try {
    const result = await operation();
    return apiResponse(result);
  } catch (error) {
    return handleApiError(error, errorMessage);
  }
}