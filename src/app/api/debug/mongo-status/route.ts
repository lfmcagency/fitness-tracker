export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDiagnostics, connectWithMongoose, connectWithMongoClient } from '@/lib/db/mongo-client';

export async function GET() {
  try {
    // Attempt to connect with both Mongoose and MongoClient
    await Promise.all([
      connectWithMongoose().catch(error => console.error('Mongoose connection error:', error)),
      connectWithMongoClient().catch(error => console.error('MongoClient connection error:', error))
    ]);
    
    // Get detailed diagnostics
    const diagnostics = await getDiagnostics();
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      diagnostics
    }, { 
      status: diagnostics.mongooseConnection?.connected ? 200 : 503
    });
  } catch (error) {
    console.error('MongoDB status endpoint error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}