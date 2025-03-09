export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcrypt';
import { LoginRequest, UserProfile } from '@/types/api/authResponses';
import { convertUserToProfile } from '@/types/converters/userConverters';
import { ErrorCode } from '@/types/validation';
import { IUser } from '@/types/models/user';

// Define success data type based on AuthResponse definition in authResponses.ts
type AuthData = {
  user: UserProfile;
  token?: string;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Parse request body with defensive error handling
    let body: LoginRequest;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, ErrorCode.INVALID_JSON);
    }
    
    // Validate required fields
    if (!body.email || !body.password) {
      return apiError('Email and password are required', 400, ErrorCode.VALIDATION);
    }
    
    // Development test user
    if (process.env.NODE_ENV === 'development' && 
        body.email === 'test@example.com' && 
        body.password === 'password') {
      
      const testUser: UserProfile = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        settings: { weightUnit: 'kg' }
      };
      
      return apiResponse<AuthData>(
        { user: testUser }, 
        true, 
        'Development login successful'
      );
    }
    
    // Find user by email
    const user = await User.findOne({ email: body.email }) as IUser | null;
    
    // Check if user exists and validate password
    if (!user || !user.password) {
      return apiError('Invalid credentials', 401, ErrorCode.UNAUTHORIZED);
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid) {
      return apiError('Invalid credentials', 401, ErrorCode.UNAUTHORIZED);
    }
    
    // Convert user document to profile response
    const userProfile = convertUserToProfile(user);
    
    // Return successful response
    return apiResponse<AuthData>(
      { user: userProfile }, 
      true, 
      'Login successful'
    );
  } catch (error) {
    return handleApiError(error, 'Login failed');
  }
}