export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  return apiResponse({
    message: 'API test successful',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}