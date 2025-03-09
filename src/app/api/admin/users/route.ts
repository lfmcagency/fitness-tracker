// src/app/api/admin/users/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from "mongoose";
import { ApiResponse } from "@/types/api/common";
import { IUser } from "@/types/models/user";
import { PaginatedResponse } from "@/types/api/pagination";

// Define response types for better TypeScript support
interface UserListResponse {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    [key: string]: any; // Allow additional properties
  }>;
  pagination: PaginatedResponse;
}

interface UserUpdateResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    [key: string]: any; // Allow additional properties
  };
}

interface UpdateUserRequest {
  userId: string;
  role: 'user' | 'admin' | 'trainer';
}

/**
 * Format user object for API response, removing sensitive fields
 */
function formatUserForResponse(user: IUser): UserListResponse['users'][0] {
  try {
    const userObj = user.toObject();
    return {
      ...userObj,
      id: userObj._id.toString(),
      _id: undefined,
      password: undefined,
      // Ensure critical fields have defaults
      name: userObj.name || 'Unknown',
      email: userObj.email || '',
      role: userObj.role || 'user',
      createdAt: userObj.createdAt?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error formatting user object:', error);
    // Add minimal user data if transformation fails
    return {
      id: user._id?.toString() || 'unknown',
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role || 'user',
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export const GET = async (req: NextRequest): Promise<NextResponse<ApiResponse<UserListResponse>>> => {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      await dbConnect();
      
      // Parse query parameters with defensive handling
      const url = new URL(req.url);
      
      // Get pagination parameters
      let page = 1;
      let limit = 50;
      
      try {
        const pageParam = url.searchParams.get('page');
        if (pageParam) {
          const parsedPage = parseInt(pageParam);
          if (!isNaN(parsedPage) && parsedPage > 0) {
            page = parsedPage;
          }
        }
        
        const limitParam = url.searchParams.get('limit');
        if (limitParam) {
          const parsedLimit = parseInt(limitParam);
          if (!isNaN(parsedLimit) && parsedLimit > 0) {
            limit = Math.min(parsedLimit, 100); // Cap at 100 to prevent abuse
          }
        }
      } catch (error) {
        console.error('Error parsing pagination parameters:', error);
        // Continue with default values
      }
      
      const skip = (page - 1) * limit;
      
      // Get search parameter
      const search = url.searchParams.get('search') || '';
      
      // Build query
      let query: Record<string, any> = {};
      if (search && typeof search === 'string' && search.trim() !== '') {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        };
      }
      
      // Get users with defensive error handling
      let users: Array<IUser> = [];
      let total = 0;
      
      try {
        // Count total for pagination
        total = await User.countDocuments(query);
        
        // Get users (excluding sensitive fields)
        users = await User.find(query)
          .select('-password -__v')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit) as IUser[];
      } catch (error) {
        return handleApiError(error, 'Error querying users database');
      }
      
      // Format users for response
      const formattedUsers = users.map(user => formatUserForResponse(user));
      
      // Calculate pagination info
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
      
      return apiResponse<UserListResponse>({
        users: formattedUsers,
        pagination: {
          total,
          page,
          limit,
          pages: totalPages
        }
      }, true, `Retrieved ${formattedUsers.length} users`);
    } catch (error) {
      return handleApiError(error, "Error fetching users");
    }
  });
};

/**
 * POST /api/admin/users
 * Update user role (admin only)
 */
export const POST = async (req: NextRequest): Promise<NextResponse<ApiResponse<UserUpdateResponse>>> => {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      await dbConnect();
      
      // Parse request body with defensive error handling
      let body: UpdateUserRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate body
      if (!body || typeof body !== 'object') {
        return apiError('Invalid request data', 400, 'ERR_INVALID_DATA');
      }
      
      const { userId, role } = body;
      
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        return apiError('Missing or invalid user ID', 400, 'ERR_VALIDATION');
      }
      
      // Check if userId is a valid MongoDB ObjectId
      if (!isValidObjectId(userId)) {
        return apiError('Invalid user ID format', 400, 'ERR_VALIDATION');
      }
      
      // Validate role
      if (!role || typeof role !== 'string') {
        return apiError('Missing or invalid role', 400, 'ERR_VALIDATION');
      }
      
      // Validate allowed roles
      const allowedRoles = ['user', 'admin', 'trainer'];
      if (!allowedRoles.includes(role)) {
        return apiError(
          `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`, 
          400, 
          'ERR_VALIDATION'
        );
      }
      
      // Update user role with defensive error handling
      let updatedUser: IUser | null;
      try {
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { role },
          { new: true, runValidators: true }
        ).select('-password -__v') as IUser | null;
        
        if (!updatedUser) {
          return apiError('User not found', 404, 'ERR_NOT_FOUND');
        }
      } catch (error) {
        return handleApiError(error, 'Error updating user role');
      }
      
      // Format user for response
      const userData = formatUserForResponse(updatedUser);
      
      return apiResponse<UserUpdateResponse>(
        { user: userData },
        true,
        `User role updated to ${role}`
      );
    } catch (error) {
      return handleApiError(error, "Error updating user role");
    }
  });
};