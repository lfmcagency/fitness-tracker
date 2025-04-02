// src/app/api/auth-custom/register/route.ts
export const dynamic = 'force-dynamic'; // Or remove if not strictly needed

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'; // Adjust path if needed
import { dbConnect } from '@/lib/db'; // Adjust path if needed
import { registerUser } from "@/lib/services/user-service"; // Updated import path
import { RegisterRequest, UserProfile } from "@/types/api/authResponses"; // Adjust path if needed
import { ErrorCode } from '@/types/validation'; // Adjust path if needed

// Define the structure of the success response data for this endpoint
// It should match what your frontend expects after registration
type RegistrationSuccessData = {
  user: Omit<UserProfile, 'role'> & { role: string }; // Ensure role is always present
  // token?: string; // Typically, registration doesn't return a token; user logs in separately
};

export async function POST(req: NextRequest) {
  const logPrefix = "🔑 [API_REGISTER]";
  console.log(`${logPrefix} Received registration request.`);

  try {
    await dbConnect();
    console.log(`${logPrefix} Database connected.`);

    // --- Request Body Parsing and Validation ---
    let body: RegisterRequest;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error(`${logPrefix} Invalid JSON body:`, jsonError);
      return apiError('Invalid JSON format in request body.', 400, ErrorCode.INVALID_JSON);
    }

    // Basic input validation
    if (!body.name || !body.email || !body.password) {
      return apiError('Name, email, and password are required.', 400, ErrorCode.VALIDATION);
    }
    if (typeof body.name !== 'string' || typeof body.email !== 'string' || typeof body.password !== 'string') {
        return apiError('Invalid data types for name, email, or password.', 400, ErrorCode.VALIDATION);
    }

    // More specific validation (using regex for email, checking password length)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return apiError('Invalid email format provided.', 400, ErrorCode.VALIDATION);
    }
    if (body.password.length < 8) {
      // Match the length requirement in the User model
      return apiError('Password must be at least 8 characters long.', 400, ErrorCode.VALIDATION);
    }
    // --- End Validation ---


    // --- Call Registration Service ---
    console.log(`${logPrefix} Attempting to register user: ${body.email}`);
    try {
      // Prepare data for the service function
      const userData = {
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        password: body.password, // Pass plain password
        image: body.image // Optional image URL
      };

      // Call the registerUser service function
      const registeredUser = await registerUser(userData); // Returns user object without password

      // Construct the response profile based on UserProfile type
      const userProfile: RegistrationSuccessData['user'] = {
        id: registeredUser.id,
        name: registeredUser.name || 'User', // Default if name is somehow empty
        email: registeredUser.email,
        role: registeredUser.role || 'user', // Ensure role is set
        image: registeredUser.image || null,
        // Add other fields expected by UserProfile, ensure defaults match User model
        settings: registeredUser.settings || { weightUnit: 'kg' }
      };

      console.log(`✅ ${logPrefix} Registration successful for: ${userProfile.email}`);
      // Return success response (HTTP 201 Created)
      return apiResponse<RegistrationSuccessData>(
        { user: userProfile },
        true, // success flag
        'User registered successfully.',
        201 // status code
      );

    } catch (registrationError: any) {
      // Handle specific errors thrown by registerUser (like 'User already exists')
      if (registrationError.code === ErrorCode.DUPLICATE || registrationError.message === "User already exists") {
          console.warn(`${logPrefix} Registration failed: Email already exists - ${body.email}`);
          return apiError('This email address is already registered.', 409, ErrorCode.DUPLICATE); // HTTP 409 Conflict
      }
       // Log the underlying error for debugging if it's not a duplicate error
       console.error(`${logPrefix} registerUser service failed:`, registrationError);
      // Re-throw other errors to be caught by the outer handler
      throw registrationError;
    }
    // --- End Registration Service Call ---

  } catch (error: any) {
     console.error(`❌ ${logPrefix} Unhandled error in registration route:`, error);
    // Use the centralized error handler
    // Pass the original error if possible for better logging in handleApiError
    return handleApiError(error, 'An unexpected error occurred during registration.');
  }
}