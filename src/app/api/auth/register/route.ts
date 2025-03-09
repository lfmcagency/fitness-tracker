export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import { registerUser } from "@/lib/auth";
import { RegisterRequest, UserProfile } from "@/types/api/authResponses";
import { ErrorCode } from '@/types/validation';

// Define success data type based on AuthResponse definition in authResponses.ts
type AuthData = {
  user: UserProfile;
  token?: string;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Parse request body with defensive error handling
    let body: RegisterRequest;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, ErrorCode.INVALID_JSON);
    }
    
    // Validate required fields
    if (!body.name || !body.email || !body.password) {
      return apiError('Name, email, and password are required', 400, ErrorCode.VALIDATION);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return apiError('Invalid email format', 400, ErrorCode.VALIDATION);
    }
    
    // Validate password length
    if (body.password.length < 8) {
      return apiError('Password must be at least 8 characters', 400, ErrorCode.VALIDATION);
    }
    
    // Register user
    try {
      const userData = { 
        name: body.name.trim(), 
        email: body.email.toLowerCase().trim(), 
        password: body.password, 
        image: body.image 
      };
      
      const user = await registerUser(userData);
      
      if (!user) {
        return apiError('Failed to create user account', 500, ErrorCode.INTERNAL);
      }
      
      // Construct user profile according to UserProfile interface
      const userProfile: UserProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        image: user.image || null,
        settings: { weightUnit: 'kg' }
      };
      
      // Return successful response
      return apiResponse<AuthData>(
        { user: userProfile }, 
        true, 
        'User registered successfully',
        201
      );
    } catch (error: any) {
      // Handle specific registration errors
      if (error.message === 'User already exists') {
        return apiError('Email is already registered', 409, ErrorCode.DUPLICATE);
      }
      throw error; // Re-throw for general error handler
    }
  } catch (error) {
    return handleApiError(error, 'Error during user registration');
  }
}