export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/mongodb';

// Get detailed information about MongoDB status
async function getMongoStatus() {
  try {
    // Check if already connected
    if (mongoose.connection.readyState !== 1) {
      await dbConnect();
    }
    
    const readyState = mongoose.connection.readyState;
    
    // If still not connected, return error
    if (readyState !== 1) {
      return {
        connected: false,
        state: readyState,
        error: "Failed to establish MongoDB connection"
      };
    }
    
    // Make sure db is defined before accessing it
    if (!mongoose.connection.db) {
      return {
        connected: true,
        state: readyState,
        error: "Database object not available"
      };
    }
    
    // At this point we know db is defined
    const db = mongoose.connection.db;
    
    // Get database stats
    const dbName = db.databaseName;
    const host = mongoose.connection.host || 'unknown';
    const stats = await db.stats();
    
    // Get collections and counts
    const collections = await db.listCollections().toArray();
    const collectionStats = await Promise.all(
      collections.map(async (collection) => {
        const count = await db.collection(collection.name).countDocuments();
        return {
          name: collection.name,
          count,
          type: collection.type
        };
      })
    );
    
    // Get registered models
    const models = Object.keys(mongoose.models);
    
    return {
      connected: true,
      state: readyState,
      database: {
        name: dbName,
        host,
        stats
      },
      collections: collectionStats,
      models
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown MongoDB error"
    };
  }
}

export async function GET() {
  try {
    const mongoStatus = await getMongoStatus();
    
    const health = {
      status: mongoStatus.connected ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      mongo: mongoStatus
    };
    
    return NextResponse.json(health, {
      status: mongoStatus.connected ? 200 : 503
    });
  } catch (error) {
    console.error("Health check error:", error);
    
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}