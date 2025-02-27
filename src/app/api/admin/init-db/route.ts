export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db/init-db';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuth();
    
    // In production, only allow authenticated users
    if (!session && process.env.NODE_ENV === 'production') {
      return apiError('Unauthorized', 401);
    }
    
    const result = await initDatabase();
    
    if (result.success) {
      return apiResponse(result, 'Database initialized successfully');
    } else {
      return apiError(result.message || 'Failed to initialize database', 500);
    }
  } catch (error) {
    return apiError('Error initializing database', 500, error);
  }
}