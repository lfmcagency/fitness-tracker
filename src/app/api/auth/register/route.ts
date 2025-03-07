import { registerUser, UserRegistrationData } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import { AuthResponse, RegisterRequest } from "@/types/api/authResponses";

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    // Parse request body with defensive error handling
    let body: RegisterRequest;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate required fields are present
    if (!body || typeof body !== 'object') {
      return apiError('Invalid registration data', 400, 'ERR_INVALID_DATA');
    }
    
    const { name, email, password, image } = body;
    
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return apiError('Name is required and must be a non-empty string', 400, 'ERR_VALIDATION');
    }
    
    // Validate email with comprehensive checks
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return apiError('Email is required and must be a non-empty string', 400, 'ERR_VALIDATION');
    }
    
    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return apiError('Invalid email format', 400, 'ERR_VALIDATION');
    }
    
    // Validate additional email constraints
    if (email.length > 320) { // Maximum allowed email length
      return apiError('Email is too long', 400, 'ERR_VALIDATION');
    }
    
    const [localPart, domain] = email.split('@');
    if (localPart.length > 64) {
      return apiError('Email local part is too long', 400, 'ERR_VALIDATION');
    }
    
    if (domain && domain.length > 255) {
      return apiError('Email domain is too long', 400, 'ERR_VALIDATION');
    }
    
    // Validate password with comprehensive checks
    if (!password || typeof password !== 'string') {
      return apiError('Password is required and must be a string', 400, 'ERR_VALIDATION');
    }
    
    // Enhanced password validation
    if (password.length < 8) {
      return apiError('Password must be at least 8 characters', 400, 'ERR_WEAK_PASSWORD');
    }
    
    if (password.length > 72) { // bcrypt limit is 72 bytes
      return apiError('Password is too long', 400, 'ERR_VALIDATION');
    }
    
    // Check for password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return apiError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number', 
        400, 
        'ERR_WEAK_PASSWORD'
      );
    }
    
    // Validate image if provided
    if (image !== undefined && image !== null && typeof image !== 'string') {
      return apiError('Image must be a string URL or null', 400, 'ERR_VALIDATION');
    }
    
    // Prepare user data
    const userData: UserRegistrationData = {
      name: name.trim(),
      email: email.trim().toLowerCase(), // Normalize email
      password,
      image: image || null,
    };
    
    // Register user with defensive error handling
    try {
      const user = await registerUser(userData);
      
      if (!user) {
        return apiError('Failed to create user account', 500, 'ERR_INTERNAL');
      }
      
      // Return the user without sensitive data
      return apiResponse<AuthResponse['data']>({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user'
        }
      }, true, 'User registered successfully', 201);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === "User already exists") {
          return apiError('User with this email already exists', 409, 'ERR_USER_EXISTS');
        }
        
        // Handle other specific error messages
        if (error.message.includes('duplicate key')) {
          return apiError('User with this email already exists', 409, 'ERR_USER_EXISTS');
        }
        
        // Pass the error to the general handler
        return handleApiError(error, 'Registration failed');
      }
      
      // Generic error
      return apiError('Failed to register user', 500, 'ERR_INTERNAL');
    }
  } catch (error) {
    return handleApiError(error, 'Error during user registration');
  }
}