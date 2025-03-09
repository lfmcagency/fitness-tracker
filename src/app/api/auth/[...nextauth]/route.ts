// src/app/api/auth/[...nextauth]/route.ts
export const dynamic = 'force-dynamic';

import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from '@/lib/api-utils';

/**
 * NextAuth API route handler with error handling
 * 
 * This is the main authentication endpoint that NextAuth uses for
 * managing sessions, handling callbacks, and processing auth requests.
 */
async function handler(req: NextRequest, ...params: any[]) {
  try {
    // Ensure auth options are properly loaded
    if (!authOptions || typeof authOptions !== 'object') {
      console.error('Auth options not properly configured');
      return apiError('Authentication system misconfigured', 500, 'ERR_AUTH_CONFIG');
    }
    
    // Initialize NextAuth
    const nextAuthHandler = NextAuth(authOptions);
    
    // Call the appropriate handler based on method
    if (req.method === 'GET') {
      return nextAuthHandler.GET(req, ...params);
    } else if (req.method === 'POST') {
      return nextAuthHandler.POST(req, ...params);
    } else {
      // Handle unexpected methods
      return apiError('Method not allowed', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
  } catch (error) {
    // Log and handle any unexpected errors
    console.error('NextAuth route error:', error);
    return apiError('Authentication service error', 500, 'ERR_AUTH_SERVICE');
  }
}

export { handler as GET, handler as POST };