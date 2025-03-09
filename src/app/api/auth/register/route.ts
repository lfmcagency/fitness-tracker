export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import { registerUser } from "@/lib/auth";
import { AuthResponse, RegisterRequest } from "@/types/api/authResponses";
import { UserProfile } from "@/types/converters/userConverters";

// Success data type for the response
type AuthData = { user: UserProfile; token?: string };

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body: RegisterRequest = await req.json();
    if (!body.name || !body.email || !body.password) {
      return apiError('Name, email, and password are required', 400, 'ERR_VALIDATION');
    }
    const userData = { 
      name: body.name, 
      email: body.email, 
      password: body.password, 
      image: body.image 
    };
    const user = await registerUser(userData);
    if (!user) {
      return apiError('Failed to create user account', 500, 'ERR_INTERNAL');
    }
    const userProfile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      image: user.image || null,
      settings: { weightUnit: 'kg' } // Default settings
    };
    return apiResponse<AuthData>({ user: userProfile, token: 'some-token' });
  } catch (error) {
    return apiError('Error during user registration', 500, 'ERR_INTERNAL');
  }
}