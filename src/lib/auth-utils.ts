// src/lib/auth-utils.ts (with defensive programming)
import { NextRequest } from "next/server";
import { getAuth, getUserById } from "@/lib/auth";
import { apiError } from "./api-utils";
import { dbConnect } from "./db/mongodb";
import UserProgress from "@/models/UserProgress";
import mongoose, { isValidObjectId } from "mongoose";

/**
 * Authentication levels for API routes
 */
export enum AuthLevel {
  // User must be authenticated
  REQUIRED,
  // In development, auth is optional; in production, it's required
  DEV_OPTIONAL,
  // Any user can access (no auth required)
  NONE
}

/**
 * Higher-order function to protect API routes with authentication
 * @param handler The API route handler
 * @param level Authentication level required
 * @returns Protected handler function
 */
export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<Response>,
  level: AuthLevel = AuthLevel.REQUIRED
) {
  return async (req: NextRequest) => {
    // For AuthLevel.NONE, proceed directly to handler with null userId
    if (level === AuthLevel.NONE) {
      return handler(req, "anonymous");
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
          return handler(req, "dev-user-id");
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
      return handler(req, userId);
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
 */
export async function getUserProgressOrCreate(userId: string) {
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
    let userProgress = await UserProgress.findOne({ userId: userIdObj });
    
    // If no progress found, create initial progress
    if (!userProgress) {
      try {
        userProgress = await UserProgress.createInitialProgress(userIdObj);
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
 */
export function withRoleProtection(requiredRoles: string[] = ['admin']) {
  return async (req: NextRequest, handler: Function) => {
    try {
      const session = await getAuth();
      
      // No session or no user ID
      if (!session?.user?.id) {
        return apiError("Authentication required", 401, 'ERR_401');
      }
      
      const userId = session.user.id;
      
      // Validate userId
      if (!isValidObjectId(userId)) {
        return apiError('Invalid user ID format', 400, 'ERR_VALIDATION');
      }
      
      // Check if user has required role
      const hasRole = await checkUserRole(userId, requiredRoles);
      
      if (!hasRole) {
        return apiError("Insufficient permissions", 403, 'ERR_403');
      }
      
      // User has required role, proceed to handler
      return handler(req, session);
    } catch (error) {
      console.error('Role protection error:', error);
      return apiError(
        "Authorization error", 
        500, 
        'ERR_AUTH',
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }
  };
}