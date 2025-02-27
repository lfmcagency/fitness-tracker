export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await dbConnect();
    
    // List all models
    const models = Object.keys(mongoose.models);
    
    // Get counts for all collections
    const counts: Record<string, number> = {};
    for (const modelName of models) {
      try {
        const model = mongoose.models[modelName];
        counts[modelName] = await model.countDocuments();
      } catch (err) {
        counts[modelName] = -1; // Error counting
      }
    }
    
    // Get connection state
    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return NextResponse.json({
      success: true,
      database: {
        connected: connectionState === 1,
        state: stateMap[connectionState as keyof typeof stateMap] || 'unknown',
        models,
        collections: counts,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error checking database status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}