// src/app/api/user/profile/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import bcrypt from 'bcrypt';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from 'mongoose';
import { UserProfileResponse, UpdateProfileRequest } from "@/types/api/userResponses";
import { IUser } from "@/types/models/user";

/**
 * Validates if a string is a valid image URL
 */
function isValidImageUrl(url: string | null): boolean {
  // Accept null for no image
  if (url === null) return true;
  if (!url) return false;
  
  // Basic URL validation
  try {
    // Validate URL format
    if (!url.match(/^(https?:\/\/|\/|data:image\/)/)) {
      return false;
    }
    
    // Check common image extensions
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
      return true;
    }
    
    // Maybe it's a base64 encoded image
    if (url.startsWith('data:image/')) {
      return true;
    }
    
    // Support relative URLs for application-hosted images
    if (url.startsWith('/')) {
      return true;
    }
    
    // Support potential URLs to image services (common patterns)
    if (url.match(/\/(avatar|profile|image|img|photo|picture)\//i)) {
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
}

/**
 * Format user object for API response, removing sensitive fields
 */
function formatUserForResponse(user: IUser, userId: string): UserProfileResponse['data'] {
  try {
    const userObj = user.toObject();
    return {
      ...userObj,
      id: userObj._id?.toString() || userId,
      _id: undefined,
      password: undefined,
      // Ensure all fields exist or provide defaults
      name: userObj.name || '',
      email: userObj.email || '',
      image: userObj.image || null,
      role: userObj.role || 'user',
      settings: userObj.settings || {},
      bodyweight: Array.isArray(userObj.bodyweight) ? userObj.bodyweight : [],
      stats: userObj.stats || { level: 1, xp: 0 },
    };
  } catch (error) {
    console.error('Error formatting user data:', error);
    // Provide minimal fallback user data
    return {
      id: userId,
      email: user.email || '',
      name: user.name || 'User',
      role: user.role || 'user'
    };
  }
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'New password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

/**
 * GET /api/user/profile
 * Get current user profile
 */
export const GET = withAuth<UserProfileResponse['data']>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Validate userId to prevent MongoDB injection
      if (!userId || !isValidObjectId(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_VALIDATION');
      }
      
      // Get user data from database
      const user = await User.findById(userId).select('-password -__v') as IUser | null;
      
      if (!user) {
        return apiError('User not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Format user for response
      const userData = formatUserForResponse(user, userId);
      
      return apiResponse(userData, true, 'User profile retrieved successfully');
    } catch (error) {
      return handleApiError(error, 'Error fetching user profile');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);

/**
 * PUT /api/user/profile
 * Update user profile data
 */
export const PUT = withAuth<UserProfileResponse['data']>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      
      // Validate userId to prevent MongoDB injection
      if (!userId || !isValidObjectId(userId)) {
        return apiError('Invalid user ID', 400, 'ERR_VALIDATION');
      }
      
      // Parse request body with defensive error handling
      let body: UpdateProfileRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate that body is an object
      if (!body || typeof body !== 'object') {
        return apiError('Invalid profile data', 400, 'ERR_INVALID_DATA');
      }
      
      // Find the user with defensive error handling
      const user = await User.findById(userId) as IUser | null;
      if (!user) {
        return apiError('User not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Fields that are allowed to be updated
      const allowedUpdates = ['name', 'image', 'settings'];
      const updates: Record<string, any> = {};
      
      // Process allowed updates with validation
      for (const field of allowedUpdates) {
        if (body[field as keyof UpdateProfileRequest] !== undefined) {
          // Validate specific fields
          if (field === 'name' && (typeof body.name !== 'string' || body.name.trim() === '')) {
            return apiError('Name must be a non-empty string', 400, 'ERR_VALIDATION');
          }
          
          if (field === 'image' && body.image !== null && (typeof body.image !== 'string' || !isValidImageUrl(body.image))) {
            return apiError('Invalid image URL format', 400, 'ERR_VALIDATION');
          }
          
          if (field === 'settings') {
            if (typeof body.settings !== 'object') {
              return apiError('Settings must be an object', 400, 'ERR_VALIDATION');
            }
            
            // Validate weightUnit if provided
            if (body.settings.weightUnit !== undefined && 
                (typeof body.settings.weightUnit !== 'string' || 
                 !['kg', 'lbs'].includes(body.settings.weightUnit))) {
              return apiError('Weight unit must be either "kg" or "lbs"', 400, 'ERR_VALIDATION');
            }
          }
          
          updates[field] = body[field as keyof UpdateProfileRequest];
        }
      }
      
      // Special handling for password change with thorough validation
      if (body.currentPassword && body.newPassword) {
        // Validate current password exists
        if (!user.password) {
          return apiError('No password set for this account', 400, 'ERR_VALIDATION');
        }
        
        // Validate password types
        if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
          return apiError('Password must be a string', 400, 'ERR_VALIDATION');
        }
        
        // Verify current password with defensive error handling
        let isPasswordValid = false;
        try {
          isPasswordValid = await bcrypt.compare(
            body.currentPassword,
            user.password
          );
        } catch (error) {
          console.error('Error comparing passwords:', error);
          return apiError('Error verifying current password', 500, 'ERR_INTERNAL');
        }
        
        if (!isPasswordValid) {
          return apiError('Current password is incorrect', 400, 'ERR_INVALID_PASSWORD');
        }
        
        // Validate new password strength
        const passwordValidation = validatePasswordStrength(body.newPassword);
        if (!passwordValidation.valid) {
          return apiError(passwordValidation.message || 'Invalid password', 400, 'ERR_WEAK_PASSWORD');
        }
        
        // Hash new password with error handling
        try {
          updates.password = await bcrypt.hash(body.newPassword, 10);
        } catch (error) {
          console.error('Error hashing password:', error);
          return apiError('Error processing new password', 500, 'ERR_INTERNAL');
        }
      }
      
      // If no updates, return early
      if (Object.keys(updates).length === 0) {
        return apiError('No valid fields to update', 400, 'ERR_NO_UPDATES');
      }
      
      // Apply updates to user object with error handling
      let updatedUser;
      try {
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: updates },
          { new: true, runValidators: true }
        ).select('-password -__v') as IUser | null;
        
        if (!updatedUser) {
          return apiError('User not found after update', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error updating user profile');
      }
      
      // Format user for response
      const userData = formatUserForResponse(updatedUser, userId);
      
      return apiResponse(userData, true, 'Profile updated successfully');
    } catch (error) {
      return handleApiError(error, 'Error updating user profile');
    }
  }, 
  AuthLevel.DEV_OPTIONAL
);