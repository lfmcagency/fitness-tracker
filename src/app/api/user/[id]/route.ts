export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

export const DELETE = withRoleProtection(['admin'])(
  async (req: NextRequest) => {
    try {
      await dbConnect();
      
      const id = req.nextUrl.pathname.split('/').pop();
      
      const user = await User.findById(id);
      if (!user) {
        return apiError('User not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Prevent admins from deleting themselves
      // You'd need to get current user ID from session for this check
      
      await User.findByIdAndDelete(id);
      
      return apiResponse(
        { deleted: true },
        true,
        'User deleted successfully'
      );
    } catch (error) {
      return handleApiError(error, 'Error deleting user');
    }
  }
);