import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function checkDatabaseHealth() {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return {
        status: 'error',
        message: 'MongoDB not connected',
        details: {
          readyState: mongoose.connection.readyState
        }
      };
    }

    // Get database stats
    const dbStats = await mongoose.connection.db.stats();
    
    // Get collection stats
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionList = collections.map(collection => ({
      name: collection.name,
      type: collection.type
    }));

    // Count documents in each collection
    const collectionCounts: Record<string, number> = {}; // Add this type definition
    
    for (const collection of collectionList) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      collectionCounts[collection.name] = count;
    }

    return {
      status: 'connected',
      message: 'MongoDB connection healthy',
      details: {
        readyState: mongoose.connection.readyState,
        dbName: mongoose.connection.db.databaseName,
        dbStats,
        collections: collectionCounts
      }
    };
  } catch (error) {
    console.error('Database health check error:', error);
    return {
      status: 'error',
      message: 'Error checking database health',
      details: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

export async function GET() {
  const healthStatus = await checkDatabaseHealth();
  
  return NextResponse.json(healthStatus, {
    status: healthStatus.status === 'connected' ? 200 : 500
  });
}