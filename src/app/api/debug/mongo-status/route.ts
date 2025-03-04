// src/app/api/debug/mongo-status/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db/mongodb';
import mongoose from "mongoose";
import { withRoleProtection } from "@/lib/auth-utils";

/**
 * GET /api/debug/mongo-status
 * MongoDB status check with collection stats (admin only)
 */
export const GET = async (req: NextRequest) => {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      // Track start time for response time calculation
      const startTime = process.hrtime();
      
      // Connect to database
      await dbConnect();
      
      // Get MongoDB connection status
      const mongoStatus = mongoose.connection.readyState;
      
      // Map status code to readable status
      const statusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
        99: 'uninitialized'
      };
      
      const statusText = statusMap[mongoStatus] || 'unknown';
      
      // Base status object
      const status = {
        status: mongoStatus === 1 ? 'ok' : 'error',
        message: `MongoDB is ${statusText}`,
        connection: {
          host: mongoose.connection.host || 'unknown',
          readyState: mongoStatus,
          name: mongoose.connection.name || 'unknown',
          models: Object.keys(mongoose.models)
        },
        collections: {},
        responseTime: 0, // Will be filled in before response
      };
      
      // If connection is good, get collection stats
      if (mongoStatus === 1) {
        try {
          // Get list of collections with defensive error handling
          let collections;
          
          try {
            collections = await mongoose.connection.db.listCollections().toArray();
          } catch (listError) {
            console.error('Error listing MongoDB collections:', listError);
            collections = [];
            status.collectionsError = 'Failed to list collections';
          }
          
          // Get stats for each collection with defensive error handling
          const collectionStats = {};
          
          for (const collection of collections) {
            try {
              const collName = collection.name;
              const stats = await mongoose.connection.db.collection(collName).stats();
              
              // Add only relevant stats
              collectionStats[collName] = {
                count: stats.count || 0,
                size: stats.size || 0,
                avgDocSize: stats.avgObjSize || 0,
                storageSize: stats.storageSize || 0,
                indexes: stats.nindexes || 0,
                indexSize: stats.totalIndexSize || 0
              };
            } catch (statsError) {
              console.error(`Error getting stats for collection ${collection.name}:`, statsError);
              collectionStats[collection.name] = { error: 'Failed to get stats' };
            }
          }
          
          status.collections = collectionStats;
          
          // Get database-level stats
          try {
            const dbStats = await mongoose.connection.db.stats();
            status.database = {
              name: dbStats.db || mongoose.connection.name,
              collections: dbStats.collections || 0,
              views: dbStats.views || 0,
              objects: dbStats.objects || 0,
              dataSize: dbStats.dataSize || 0,
              storageSize: dbStats.storageSize || 0,
              indexes: dbStats.indexes || 0,
              indexSize: dbStats.indexSize || 0,
              avgObjSize: dbStats.avgObjSize || 0
            };
          } catch (dbStatsError) {
            console.error('Error getting database stats:', dbStatsError);
            status.database = { error: 'Failed to get database stats' };
          }
        } catch (statsError) {
          console.error('Error collecting MongoDB stats:', statsError);
          status.statsError = 'Failed to collect database stats';
        }
      }
      
      // Calculate response time
      const hrtime = process.hrtime(startTime);
      const responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
      status.responseTime = responseTimeMs;
      
      return apiResponse(status, true, `MongoDB status: ${statusText}`);
    } catch (error) {
      return handleApiError(error, "Error checking MongoDB status");
    }
  });
};