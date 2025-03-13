export const dynamic = 'force-dynamic';
import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { apiError } from '@/lib/api-utils';

export async function GET(req: NextRequest, context: any) {
  return await handler(req, context);
}

export async function POST(req: NextRequest, context: any) {
  return await handler(req, context);
}

async function handler(req: NextRequest, context: any) {
  try {
    if (!authOptions || typeof authOptions !== 'object') {
      console.error('Auth options not properly configured');
      return apiError('Authentication system misconfigured', 500, 'ERR_AUTH_CONFIG');
    }
    return await NextAuth(authOptions)(req, context);
  } catch (error) {
    console.error('NextAuth route error:', error);
    return apiError('Authentication service error', 500, 'ERR_AUTH_SERVICE');
  }
}