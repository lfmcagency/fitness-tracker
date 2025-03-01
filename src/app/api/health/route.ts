export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectWithMongoose } from '@/lib/db/mongo-client';

export async function GET() {
  try {
    // Check MongoDB connection
    let dbConnected = false;
    let dbError = null;
    
    try {
      await connectWithMongoose();
      dbConnected = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown MongoDB error';
    }
    
    return NextResponse.json({
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbConnected,
        error: dbError
      }
    }, { 
      status: dbConnected ? 200 : 503 
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}