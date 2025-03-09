// src/app/api/auth/login/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcrypt';
import { AuthResponse, LoginRequest } from '@/types/api/authResponses';
import { IUser } from '@/types/models/user';

/**
 * POST /api/auth/login
 * Handles direct login requests (not using NextAuth)
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Parse request body with defensive error handling
    let body: LoginRequest;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate body
    if (!body || typeof body !== 'object') {
      return apiError('Invalid login data', 400, 'ERR_INVALID_DATA');
    }
    
    // Validate required fields
    const { email, password } = body;
    
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return apiError('Email is required', 400, 'ERR_VALIDATION');
    }
    
    if (!password || typeof password !== 'string') {
      return apiError('Password is required', 400, 'ERR_VALIDATION');
    }
    
    // Development shortcut for test user - conditionally enabled
    if (process.env.NODE_ENV === 'development' && 
        email === 'test@example.com' && 
        password === 'password') {
      return apiResponse<AuthResponse['data']>({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }
      }, true, 'Login successful');
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() }) as IUser | null;
    
    if (!user) {
      // Use a generic error message to prevent email enumeration
      return apiError('Invalid credentials', 401, 'ERR_INVALID_CREDENTIALS');
    }
    
    // Check if user has a password set
    if (!user.password) {
      return apiError('Account requires password reset', 401, 'ERR_ACCOUNT_SETUP');
    }
    
    // Verify password with defensive error handling
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Error comparing passwords:', error);
      return apiError('Authentication error', 500, 'ERR_INTERNAL');
    }
    
    if (!isPasswordValid) {
      // Use a generic error message to prevent email enumeration
      return apiError('Invalid credentials', 401, 'ERR_INVALID_CREDENTIALS');
    }
    
    // Successful login - return user data (without sensitive fields)
    const userData = user.toObject();
    const { password: _, __v, ...cleanUserData } = userData;
    
    return apiResponse<AuthResponse['data']>({
      user: {
        ...cleanUserData,
        id: userData._id.toString(),
        _id: undefined
      }
    }, true, 'Login successful');
  } catch (error) {
    return handleApiError(error, 'Login failed');
  }
}