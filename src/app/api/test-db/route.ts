export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const conn = await dbConnect();
    
    // Get connection status information
    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      4: 'invalid'
    };
    
    // Get database information
    const dbInfo = mongoose.connection.db ? {
      databaseName: mongoose.connection.db.databaseName,
      collections: await mongoose.connection.db.collections()
        .then(cols => cols.map(c => c.collectionName))
    } : null;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection test',
      connection: {
        state: connectionState,
        stateDescription: stateMap[connectionState as keyof typeof stateMap] || 'unknown',
        host: mongoose.connection.host,
        ready: mongoose.connection.readyState === 1
      },
      database: dbInfo,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to connect to database',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    }, { status: 500 });
  }
}