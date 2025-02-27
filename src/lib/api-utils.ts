// New file: src/lib/api-utils.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export function apiResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message
  });
}

export function apiError(message: string, status: number = 400, error?: any): NextResponse<ApiResponse> {
  console.error(`API Error (${status}): ${message}`, error);
  
  return NextResponse.json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' 
      ? (error instanceof Error ? error.message : String(error)) 
      : undefined
  }, { status });
}

export function handleApiError(error: unknown, message: string) {
  if (error instanceof mongoose.Error.ValidationError) {
    const errorMessages = Object.values(error.errors).map(e => e.message).join(', ');
    return apiError(`Validation error: ${errorMessages}`, 400, error);
  }
  
  if (error instanceof mongoose.Error.CastError) {
    return apiError('Invalid ID format', 400, error);
  }

  if (error instanceof mongoose.Error.DocumentNotFoundError) {
    return apiError('Resource not found', 404, error);
  }
  
  console.error(`API Error: ${message}`, error);
  return apiError('Internal server error', 500, error);
}