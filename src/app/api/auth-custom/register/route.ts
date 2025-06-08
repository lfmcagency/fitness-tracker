// src/app/api/auth-custom/register/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import User from "@/models/User";
import { RegisterRequest } from "@/types/api/authResponses";

type RegistrationSuccessData = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    settings?: any;
  };
};

export async function POST(req: NextRequest) {
  const logPrefix = "🔑 [API_REGISTER]";
  console.log(`${logPrefix} Registration request received`);

  try {
    await dbConnect();
    console.log(`${logPrefix} Database connected`);

    // Parse request body
    let body: RegisterRequest;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error(`${logPrefix} Invalid JSON:`, jsonError);
      return apiError('Invalid JSON format', 400, 'INVALID_JSON');
    }

    // Validate required fields
    if (!body.name?.trim() || !body.email?.trim() || !body.password) {
      return apiError('Name, email, and password are required', 400, 'VALIDATION');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return apiError('Invalid email format', 400, 'VALIDATION');
    }

    // Validate password length
    if (body.password.length < 8) {
      return apiError('Password must be at least 8 characters long', 400, 'VALIDATION');
    }

    console.log(`${logPrefix} Validation passed for: ${body.email}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (existingUser) {
      console.log(`${logPrefix} User already exists: ${body.email}`);
      return apiError('This email address is already registered', 409, 'DUPLICATE');
    }

    // Determine role (first user gets admin)
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';
    console.log(`${logPrefix} Assigning role: ${role} (first user: ${userCount === 0})`);

    // Create user
    console.log(`${logPrefix} Creating user document...`);
    const userData = {
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      password: body.password, // Will be hashed by pre-save hook
      image: body.image || null,
      role: role
    };

    const user = await User.create(userData);
    console.log(`✅ ${logPrefix} User created successfully with ID: ${user._id}`);

    // Return success response
    const userProfile = {
      id: user._id.toString(),
      name: user.name || 'User',
      email: user.email,
      role: user.role || 'user',
      image: user.image,
      settings: user.settings
    };

    console.log(`✅ ${logPrefix} Registration completed for: ${userProfile.email}`);
    
    return apiResponse<RegistrationSuccessData>(
      { user: userProfile },
      true,
      'User registered successfully',
      201
    );

  } catch (error: any) {
    console.error(`❌ ${logPrefix} Registration error:`, error);
    console.error(`❌ ${logPrefix} Error stack:`, error.stack);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return apiError(`Validation failed: ${messages.join(', ')}`, 400, 'VALIDATION');
    }
    
    // Handle mongoose duplicate key errors
    if (error.code === 11000) {
      return apiError('This email address is already registered', 409, 'DUPLICATE');
    }
    
    return handleApiError(error, 'Registration failed');
  }
}