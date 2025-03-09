export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { apiResponse, apiError } from '@/lib/api-utils';
import { PaginatedResponse } from "@/types/api/pagination";

// Type for user data in the paginated list
type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export const GET = withRoleProtection<{ items: UserData[]; pagination: PaginationInfo }>(['admin'])(
  async (req: NextRequest) => {
    await dbConnect();
    const userList = await User.find(); // Adjust based on your logic
    const pagination = { total: userList.length, page: 1, limit: 10 }; // Example
    return apiResponse<{ items: UserData[]; pagination: PaginationInfo }>({ items: userList, pagination });
  }
);