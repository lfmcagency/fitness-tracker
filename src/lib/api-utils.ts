// src/lib/api-utils.ts
import { NextResponse } from 'next/server';

/**
 * Standard API success response
 */
export function apiResponse(data: any, success = true, message = '', status = 200) {
  const timestamp = new Date().toISOString();
  
  return NextResponse.json({
    success,
    data,
    message,
    timestamp
  }, { status });
}

/**
 * Standard API error response
 */
export function apiError(message: string, status = 500, code = 'ERR_INTERNAL', details?: any) {
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
 */
export function handleApiError(error: unknown, contextMessage: string) {
  console.error(`API Error: ${contextMessage}`, error);
  
  // Default error values
  let status = 500;
  let errorCode = 'ERR_INTERNAL';
  let errorMessage = contextMessage || 'An internal error occurred';
  let errorDetails;
  
  // Handle specific error types
  if (error instanceof Error) {
    errorDetails = error.message;
    
    // Handle MongoDB/Mongoose specific errors
    if ('name' in error && error.name === 'ValidationError') {
      status = 400;
      errorCode = 'ERR_VALIDATION';
      errorMessage = 'Validation error';
      errorDetails = formatValidationErrors(error);
    } else if ('name' in error && error.name === 'CastError') {
      status = 400;
      errorCode = 'ERR_INVALID_ID';
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
 */
function formatValidationErrors(error: any) {
  if (!error.errors) return error.message;
  
  const formattedErrors: Record<string, string> = {};
  
  Object.keys(error.errors).forEach(key => {
    formattedErrors[key] = error.errors[key].message;
  });
  
  return formattedErrors;
}