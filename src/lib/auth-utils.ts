// src/lib/auth-utils.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "./auth";
import { getUserById } from "./auth/index";
import { apiError } from "./api-utils";
import { dbConnect } from '@/lib/db';
import UserProgress from "../models/UserProgress";
import mongoose, { isValidObjectId } from "mongoose";
import { IUserProgress } from "../types/models/progress";

// Import or define the ApiResponse type
import { ApiResponse } from "@/types/api/common";

/**
 * Authentication levels for API routes
 */
export enum AuthLevel {
  /** User must be authenticated */
  REQUIRED = "required",
  /** In development, auth is optional; in production, it's required */
  DEV_OPTIONAL = "dev_optional",
  /** Any user can access (no auth required) */
  NONE = "none",
  /** Authentication is optional, handler will receive userId if available */
  OPTIONAL = "optional",
}

/**
 * Higher-order function to protect API routes with authentication
 * Supports route parameters through context
 * @param handler The API route handler
 * @param level Authentication level required
 * @returns Protected handler function
 * @template T Type of response data
 * @template P Type of route parameters
 */
export function withAuth<T = any, P = {}>(
  handler: (
    req: NextRequest, 
    userId: string, 
    context?: { params: P }
  ) => Promise<NextResponse<ApiResponse<T>>>,
  level: AuthLevel = AuthLevel.REQUIRED
): (req: NextRequest, context?: { params: P }) => Promise<NextResponse<ApiResponse<T>>> {
  return async (req: NextRequest, context?: { params: P }): Promise<NextResponse<ApiResponse<T>>> => {
    // For AuthLevel.NONE, proceed directly to handler with anonymous userId
    if (level === AuthLevel.NONE) {
      return handler(req, "anonymous", context);
    }
    
    try {
      // Get user session
      const session = await getAuth();
      
      // Check if authentication is required
      const isDevelopment = process.env.NODE_ENV === 'development';
      const authRequired = level === AuthLevel.REQUIRED || 
                          (level === AuthLevel.DEV_OPTIONAL && !isDevelopment);
      
      if (!session) {
        // Development bypass for DEV_OPTIONAL
        if (level === AuthLevel.DEV_OPTIONAL && isDevelopment) {
          console.warn('⚠️ [Auth] Development authentication bypass active');
          // Use a development test user ID
          return handler(req, "dev-user-id", context);
        }
        
        // For OPTIONAL level, proceed with null userId
        if (level === AuthLevel.OPTIONAL) {
          return handler(req, "", context);
        }
        
        return apiError('Authentication required', 401, 'ERR_401');
      }
      
      // Get userId from session with validation
      const userId = session.user?.id;
      
      if (!userId) {
        return apiError('Invalid authentication session', 401, 'ERR_401');
      }
      
      // Validate userId format (MongoDB ObjectId)
      if (!isValidObjectId(userId)) {
        return apiError('Invalid user ID format', 400, 'ERR_VALIDATION');
      }
      
      // Proceed with authenticated handler
      return handler(req, userId, context);
    } catch (error) {
      console.error('[Auth] Authentication error:', error);
      return apiError(
        'Authentication error',
        500,
        'ERR_AUTH',
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }
  };
}

/**
 * Get or create user progress for a given user
 * @param userId User ID
 * @returns User progress document or null if error
 */
export async function getUserProgressOrCreate(userId: string): Promise<IUserProgress | null> {
  try {
    // Validate userId
    if (!userId || !isValidObjectId(userId)) {
      console.error('Invalid user ID:', userId);
      return null;
    }
    
    await dbConnect();
    
    // Convert string ID to ObjectId
    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    // Try to find existing progress
    let userProgress = await UserProgress.findOne({ user: userIdObj }) as IUserProgress | null;
    
    // If no progress found, create initial progress
    if (!userProgress) {
      try {
        // Using any to avoid type complications with the static method
        userProgress = await (UserProgress as any).createInitialProgress(userIdObj);
        console.log(`Created initial progress for user ${userId}`);
      } catch (createError) {
        console.error('Error creating initial user progress:', createError);
        return null;
      }
    }
    
    return userProgress;
  } catch (error) {
    console.error('Error in getUserProgressOrCreate:', error);
    return null;
  }
}

/**
 * Check if user has required role for access
 * @param userId User ID
 * @param requiredRoles Array of roles that have access
 * @returns Boolean indicating if user has required role
 */
export async function checkUserRole(userId: string, requiredRoles: string[]): Promise<boolean> {
  try {
    // Validate inputs
    if (!userId || !isValidObjectId(userId)) {
      console.error('Invalid user ID for role check:', userId);
      return false;
    }
    
    if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      console.error('Invalid required roles for check:', requiredRoles);
      return false;
    }
    
    await dbConnect();
    
    // Get user data
    const user = await getUserById(userId);
    
    if (!user) {
      console.error('User not found for role check:', userId);
      return false;
    }
    
    // If the user has any of the required roles
    const userRole = user.role || 'user';
    return requiredRoles.includes(userRole);
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

/**
 * Higher-order function to protect routes based on user roles
 * @param requiredRoles Array of roles that have access
 * @returns Handler wrapper that checks for role access
 * @template T Type of response data
 */
export function withRoleProtection<T>(requiredRoles: string[] = ['admin']) {
  return (handler: (req: NextRequest) => Promise<NextResponse<ApiResponse<T>>>) => {
    return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
      const session = await getAuth();
      if (!session?.user?.id) {
        return apiError("Authentication required", 401, 'ERR_401');
      }
      const userId = session.user.id;
      const hasRole = await checkUserRole(userId, requiredRoles);
      if (!hasRole) {
        return apiError("Insufficient permissions", 403, 'ERR_403');
      }
      return handler(req);
    };
  };
}