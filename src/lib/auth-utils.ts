import { NextRequest, NextResponse } from 'next/server';
import { apiError } from './api-utils';
import { getAuth } from './auth';
import { Types } from 'mongoose';
import UserProgress from '@/models/UserProgress';

/**
 * Authentication levels for API endpoints
 */
export enum AuthLevel {
  NONE = 'none',        // No authentication required
  DEV_OPTIONAL = 'dev_optional', // Authentication optional in development, required in production
  REQUIRED = 'required',  // Authentication always required
  ADMIN = 'admin'       // Admin role required
}

/**
 * Request handler function type
 */
export type RequestHandler<T = any> = (
  req: NextRequest,
  userId: Types.ObjectId,
  userProgress?: T
) => Promise<NextResponse>;

/**
 * Middleware to handle authentication and common error handling for API routes
 * @param handler The request handler function
 * @param authLevel Required authentication level
 * @param loadUserProgress Whether to load user progress before calling handler
 * @returns NextResponse with appropriate status and data
 */
export function withAuth<T = any>(
  handler: RequestHandler<T>,
  authLevel: AuthLevel = AuthLevel.REQUIRED,
  loadUserProgress: boolean = false
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Check authentication
      const session = await getAuth();
      
      // Handle different authentication levels
      if (authLevel !== AuthLevel.NONE) {
        // DEV_OPTIONAL means auth is optional in development, required in production
        if (!session && (authLevel !== AuthLevel.DEV_OPTIONAL || process.env.NODE_ENV === 'production')) {
          return apiError('Authentication required', 401);
        }
        
        // ADMIN check
        if (authLevel === AuthLevel.ADMIN && session?.user?.role !== 'admin') {
          return apiError('Admin access required', 403);
        }
      }
      
      // Get user ID (use mock ID for development if needed)
      const userId = session?.user?.id || 
        (authLevel === AuthLevel.DEV_OPTIONAL ? '000000000000000000000000' : undefined);
      
      if (!userId) {
        return apiError('User ID not found in session', 401);
      }
      
      let userObjectId: Types.ObjectId;
      
      try {
        userObjectId = new Types.ObjectId(userId);
      } catch (error) {
        return apiError('Invalid user ID format', 400);
      }
      
      // Load user progress if needed
      let userProgress: T | undefined;
      
      if (loadUserProgress) {
        try {
          userProgress = await UserProgress.findOne({ userId: userObjectId }) as unknown as T;
          
          // If user progress doesn't exist and we need it, create it
          if (!userProgress) {
            userProgress = await UserProgress.createInitialProgress(userObjectId) as unknown as T;
          }
        } catch (error) {
          console.error('Error loading user progress:', error);
          return apiError('Error loading user data', 500);
        }
      }
      
      // Call the handler with user context
      return await handler(req, userObjectId, userProgress);
    } catch (error) {
      // If the error is already a NextResponse (like from apiError), return it
      if (error instanceof NextResponse) {
        return error;
      }
      
      // Otherwise, create a 500 error response
      console.error('Unhandled error in API route:', error);
      return apiError('Internal server error', 500, error);
    }
  };
}

/**
 * Get user progress, creating an initial record if one doesn't exist
 * @param userId MongoDB ObjectID of the user
 * @returns UserProgress document or null if an error occurs
 */
export async function getUserProgressOrCreate(userId: Types.ObjectId) {
  try {
    let userProgress = await UserProgress.findOne({ userId });
    
    if (!userProgress) {
      userProgress = await UserProgress.createInitialProgress(userId);
    }
    
    return userProgress;
  } catch (error) {
    console.error('Error getting or creating user progress:', error);
    return null;
  }
}