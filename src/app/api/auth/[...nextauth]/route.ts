// src/app/api/auth/[...nextauth]/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * NextAuth API route handler with error logging
 * 
 * This is the main authentication endpoint that NextAuth uses for
 * managing sessions, handling callbacks, and processing auth requests.
 */

async function handler(req: NextRequest, ...params: any[]) {
  try {
    // Ensure auth options are properly loaded
    if (!authOptions || typeof authOptions !== 'object') {
      console.error('Auth options not properly configured');
      return NextResponse.json(
        { error: 'Authentication system misconfigured' },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }
  } catch (error) {
    // Log and handle any unexpected errors
    console.error('NextAuth route error:', error);
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };