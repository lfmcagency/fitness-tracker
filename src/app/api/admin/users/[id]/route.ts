export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { getAuth } from "@/lib/auth";
import bcrypt from 'bcryptjs';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
}

/**
 * DELETE /api/admin/users/[id]
 * Delete user (admin only)
 */
export const DELETE = withRoleProtection<{ deleted: boolean }>(['admin'])(
  async (req: NextRequest) => {
    try {
      await dbConnect();
      
      // Extract ID from URL path
      const userId = req.nextUrl.pathname.split('/').pop();
      
      if (!userId) {
        return apiError('User ID is required', 400, 'ERR_MISSING_ID');
      }
      
      // Get current user to prevent self-deletion
      const session = await getAuth();
      if (session?.user?.id === userId) {
        return apiError('Cannot delete your own account', 400, 'ERR_SELF_DELETE');
      }
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return apiError('User not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Delete user
      await User.findByIdAndDelete(userId);
      
      return apiResponse<{ deleted: boolean }>(
        { deleted: true },
        true,
        'User deleted successfully'
      );
    } catch (error) {
      return handleApiError(error, 'Error deleting user');
    }
  }
);

/**
 * PATCH /api/admin/users/[id]
 * Update user (admin only)
 */
export const PATCH = withRoleProtection<UserData>(['admin'])(
  async (req: NextRequest) => {
    try {
      await dbConnect();
      
      // Extract ID from URL path
      const userId = req.nextUrl.pathname.split('/').pop();
      
      if (!userId) {
        return apiError('User ID is required', 400, 'ERR_MISSING_ID');
      }
      
      let body: UpdateUserRequest;
      try {
        body = await req.json();
      } catch (error) {
        return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
      }
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return apiError('User not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Check if email is being changed and already exists
      if (body.email && body.email !== user.email) {
        const existingUser = await User.findOne({ email: body.email });
        if (existingUser) {
          return apiError('User with this email already exists', 400, 'ERR_EMAIL_EXISTS');
        }
      }
      
      // Prepare update data
      const updateData: any = {};
      if (body.name) updateData.name = body.name;
      if (body.email) updateData.email = body.email;
      if (body.role) updateData.role = body.role;
      
      // Hash password if provided
      if (body.password) {
        updateData.password = await bcrypt.hash(body.password, 12);
      }
      
      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        return apiError('Failed to update user', 500, 'ERR_UPDATE_FAILED');
      }
      
      // Return updated user data
      const userData: UserData = {
        id: updatedUser._id.toString(),
        name: updatedUser.name ?? '',
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt.toISOString()
      };
      
      return apiResponse<UserData>(userData, true, 'User updated successfully');
    } catch (error) {
      return handleApiError(error, 'Error updating user');
    }
  }
);