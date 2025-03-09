export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcrypt';
import { AuthResponse, LoginRequest } from '@/types/api/authResponses';
import { UserProfile } from "@/types/converters/userConverters";

// Success data type
type LoginSuccessData = AuthResponse['data'];
type AuthData = { user: UserProfile; token?: string };

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body: LoginRequest = await req.json();
    if (!body.email || !body.password) {
      return apiError('Email and password are required', 400, 'ERR_VALIDATION');
    }
    if (process.env.NODE_ENV === 'development' && body.email === 'test@example.com' && body.password === 'password') {
      const testUser: UserProfile = { 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com', 
        role: 'admin',
        settings: { weightUnit: 'kg' }
      };
      return apiResponse<LoginSuccessData>({ user: testUser }, true, 'Login successful');
    }
    const user = await User.findOne({ email: body.email });
    if (!user || !user.password || !(await bcrypt.compare(body.password, user.password))) {
      return apiError('Invalid credentials', 401, 'ERR_INVALID_CREDENTIALS');
    }
    const userProfile: UserProfile = {
      id: user._id.toString(),
      name: user.name || '',
      email: user.email,
      role: user.role || 'user',
      image: user.image || null,
      settings: user.settings || { weightUnit: 'kg' }
    };
    return apiResponse<AuthData>({ user: userProfile, token: 'some-token' });
  } catch (error) {
    return apiError('Login failed', 500, 'ERR_INTERNAL');
  }
}