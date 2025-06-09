export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { PaginationInfo } from "@/types/api/pagination";
import { IUser } from "@/types/models/user";
import bcrypt from 'bcryptjs';

// Type for user data in the paginated list
interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

// Response data type
interface UserListResponse {
  items: UserData[];
  pagination: PaginationInfo;
}

// Create user request type
interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

/**
 * GET /api/admin/users
 * Get list of users (admin only)
 */
export const GET = withRoleProtection<UserListResponse>(['admin'])(
  async (req: NextRequest) => {
    try {
      await dbConnect();
      
      // Parse query parameters
      const url = new URL(req.url);
      const pageParam = url.searchParams.get('page');
      const limitParam = url.searchParams.get('limit');
      
      // Default pagination values
      let page = 1;
      let limit = 20;
      
      // Parse page number
      if (pageParam) {
        const parsedPage = parseInt(pageParam);
        if (!isNaN(parsedPage) && parsedPage > 0) {
          page = parsedPage;
        }
      }
      
      // Parse limit
      if (limitParam) {
        const parsedLimit = parseInt(limitParam);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 100); // Cap at 100
        }
      }
      
      // Calculate skip value for pagination
      const skip = (page - 1) * limit;
      
      // Get total count
      const total = await User.countDocuments();
      
      // Get users with pagination
      const users = await User.find()
        .select('_id name email role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit) as IUser[];
      
      // Calculate total pages
      const totalPages = Math.ceil(total / limit);
      
      // Map users to response format
      const userItems = users.map(user => ({
        id: user._id.toString(),
        name: user.name || '',
        email: user.email,
        role: user.role || 'user',
        createdAt: user.createdAt.toISOString()
      }));
      
      // Return successful response
      return apiResponse<UserListResponse>({
        items: userItems,
        pagination: {
          total,
          page,
          limit,
          pages: totalPages
        }
      }, true, `Retrieved ${users.length} users`);
    } catch (error) {
      return handleApiError(error, 'Error fetching user list');
    }
  }
);

/**
 * POST /api/admin/users
 * Create new user (admin only)
 */
export const POST = withRoleProtection<UserData>(['admin'])(
  async (req: NextRequest) => {
    try {
      await dbConnect();
      
      let body: CreateUserRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Validate required fields
      if (!body.name || !body.email || !body.password) {
        return apiError('Name, email, and password are required', 400, 'ERR_VALIDATION');
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: body.email });
      if (existingUser) {
        return apiError('User with this email already exists', 400, 'ERR_USER_EXISTS');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 12);
      
      // Create user
      const user = await User.create({
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || 'user'
      });
      
      // Return user data (without password)
      const userData: UserData = {
        id: user._id.toString(),
        name: user.name || '',
        email: user.email,
        role: user.role || 'user',
        createdAt: user.createdAt.toISOString()
      };
      
      return apiResponse<UserData>(userData, true, 'User created successfully');
    } catch (error) {
      return handleApiError(error, 'Error creating user');
    }
  }
);