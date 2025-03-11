// src/app/api/debug/db/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import mongoose from "mongoose";
import { withAuth, AuthLevel } from "@/lib/auth-utils";
import { DbStatus, formatBytes } from '@/types';

/**
 * GET /api/debug/db
 * Test database connection with optional collection listing
 */
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const startTime = process.hrtime();
    
    // Parse query parameters with defensive handling
    const url = new URL(req.url);
    const showCollections = url.searchParams.get('collections') === 'true';
    const showStats = url.searchParams.get('stats') === 'true';
    
    // Initialize response data
    const dbStatus: DbStatus = {
      connected: false,
      readyState: 0,
      readyStateText: 'disconnected',
      host: null,
      name: null,
      responseTime: 0,
      collections: null,
      modelCount: 0,
      models: null,
      collectionStats: null
    };
    
    try {
      // Connect to database
      await dbConnect();
      
      // Get connection status
      const readyState = mongoose.connection.readyState;
      
      // Map readyState to text description
      const readyStateMap: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
        99: 'uninitialized'
      };
      
      // Update basic connection info
      dbStatus.connected = readyState === 1;
      dbStatus.readyState = readyState;
      dbStatus.readyStateText = readyStateMap[readyState] || 'unknown';
      dbStatus.host = mongoose.connection.host;
      dbStatus.name = mongoose.connection.name;
      dbStatus.modelCount = Object.keys(mongoose.models).length;
      
      // Add models if database is connected
      if (dbStatus.connected) {
        dbStatus.models = Object.keys(mongoose.models);
        
        // Get collections if requested
        if (showCollections) {
          try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            dbStatus.collections = collections.map(c => c.name || '').filter(Boolean).sort();
          } catch (error) {
            console.error('Error listing collections:', error);
            dbStatus.collections = { error: 'Failed to list collections' };
          }
        }
        
        // Get collection stats if requested
        if (showStats) {
          try {
            // Get collection list first
            const collections = await mongoose.connection.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name || '').filter(Boolean);
            
            // Get stats for each collection with defensive error handling
            const stats: Record<string, any> = {};
            
            // Limit to 20 collections to prevent abuse
            const collectionsToCheck = collectionNames.slice(0, 20);
            
            for (const name of collectionsToCheck) {
              try {
                const collStats = await mongoose.connection.db.collection(name).stats();
                stats[name] = {
                  count: collStats.count || 0,
                  size: formatBytes((collStats.size || 0)),
                  avgObjectSize: formatBytes((collStats.avgObjSize || 0)),
                  storageSize: formatBytes((collStats.storageSize || 0)),
                  indexes: collStats.nindexes || 0,
                };
              } catch (statError) {
                console.error(`Error getting stats for ${name}:`, statError);
                stats[name] = { error: 'Failed to get collection stats' };
              }
            }
            
            dbStatus.collectionStats = stats;
          } catch (error) {
            console.error('Error getting collection stats:', error);
            dbStatus.collectionStats = { error: 'Failed to get collection statistics' };
          }
        }
      }
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      
      // Update status with error info
      dbStatus.connected = false;
      dbStatus.error = dbError.message || 'Database connection failed';
      
      // Calculate response time before returning
      const hrtime = process.hrtime(startTime);
      const responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
      dbStatus.responseTime = responseTimeMs;
      
      return apiResponse(dbStatus, false, 'Database connection error');
    }
    
    // Calculate response time
    const hrtime = process.hrtime(startTime);
    const responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
    dbStatus.responseTime = responseTimeMs;
    
    // Return database status
    return apiResponse(
      dbStatus, 
      dbStatus.connected, 
      dbStatus.connected ? 'Database connected' : 'Database not connected'
    );
  } catch (error) {
    return handleApiError(error, "Error checking database connection");
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/debug/db
 * Run database maintenance operations (admin only)
 */
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await dbConnect();
    
    // Parse request body with defensive error handling
    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch (error) {
      // Default to empty object if parsing fails
    }
    
    // Ensure body is an object
    if (!body || typeof body !== 'object') {
      body = {};
    }
    
    // Get operation type
    const operation = body.operation || '';
    
    // Valid operations
    const validOperations = ['validate', 'repair', 'cleanup', 'vacuum', 'stats'];
    
    // Check database connection
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      return apiError('Database connection failed', 500, 'ERR_DB_CONNECTION');
    }
    
    // Initialize result
    const result: {
      operation: string;
      success: boolean;
      timestamp: string;
      details: Record<string, any> | null;
    } = {
      operation,
      success: false,
      timestamp: new Date().toISOString(),
      details: null
    };
    
    // Process different operations
    if (operation === 'stats') {
      try {
        // Get database stats
        const stats = await mongoose.connection.db.stats();
        result.success = true;
        result.details = {
          database: stats.db,
          collections: stats.collections,
          views: stats.views,
          objects: stats.objects,
          dataSize: formatBytes(stats.dataSize),
          storageSize: formatBytes(stats.storageSize),
          indexes: stats.indexes,
          indexSize: formatBytes(stats.indexSize),
          avgObjSize: formatBytes(stats.avgObjSize),
          fsTotalSize: stats.fsTotalSize ? formatBytes(stats.fsTotalSize) : 'N/A',
          fsUsedSize: stats.fsUsedSize ? formatBytes(stats.fsUsedSize) : 'N/A'
        };
      } catch (error) {
        console.error('Error getting database stats:', error);
        result.details = { error: 'Failed to get database statistics' };
      }
    } else if (operation === 'validate') {
      try {
        // Get collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const validationResults: Record<string, any> = {};
        
        // Validate each collection
        for (const col of collections) {
          try {
            if (!col.name) continue;
            
            const validation = await mongoose.connection.db.command({
              validate: col.name,
              full: true
            });
            
            validationResults[col.name] = {
              valid: validation.valid,
              errors: validation.errors || [],
              warning: validation.warning || null,
              details: {
                keysPerIndex: validation.keysPerIndex,
                nInvalidDocuments: validation.nInvalidDocuments || 0,
                nrecords: validation.nrecords,
                datasize: formatBytes(validation.datasize || 0)
              }
            };
          } catch (error: any) {
            if (col.name) {
              validationResults[col.name] = { 
                valid: false, 
                error: error.message || 'Validation failed' 
              };
            }
          }
        }
        
        result.success = true;
        result.details = {
          collectionsChecked: collections.length,
          validationResults
        };
      } catch (error) {
        console.error('Error validating database:', error);
        result.details = { error: 'Database validation failed' };
      }
    } else if (operation === 'repair') {
      return apiError(
        'Database repair must be performed by database administrator', 
        400, 
        'ERR_OPERATION_NOT_SUPPORTED'
      );
    } else if (operation === 'cleanup') {
      try {
        // Find each model and get collection name
        const cleanupResults: Record<string, any> = {};
        const modelNames = Object.keys(mongoose.models);
        
        for (const modelName of modelNames) {
          try {
            const model = mongoose.models[modelName];
            const collectionName = model.collection.name;
            
            // Run compact on collection
            try {
              const compactResult = await mongoose.connection.db.command({
                compact: collectionName
              });
              
              cleanupResults[collectionName] = {
                success: true,
                details: compactResult
              };
            } catch (compactError: any) {
              console.error(`Error compacting collection ${collectionName}:`, compactError);
              cleanupResults[collectionName] = {
                success: false,
                error: compactError.message || 'Compact operation failed'
              };
            }
          } catch (modelError: any) {
            console.error(`Error processing model ${modelName}:`, modelError);
            cleanupResults[modelName] = {
              success: false,
              error: modelError.message || 'Model processing failed'
            };
          }
        }
        
        result.success = true;
        result.details = {
          modelsProcessed: modelNames.length,
          cleanupResults
        };
      } catch (error) {
        console.error('Error during cleanup operation:', error);
        result.details = { error: 'Database cleanup failed' };
      }
    } else if (operation === 'vacuum') {
      return apiError(
        'MongoDB does not support VACUUM operation. Use cleanup instead.', 
        400, 
        'ERR_OPERATION_NOT_SUPPORTED'
      );
    }
    
    return apiResponse(result, result.success, `Operation ${operation} ${result.success ? 'completed' : 'failed'}`);
  } catch (error) {
    return handleApiError(error, "Error during database operation");
  }
}, AuthLevel.DEV_OPTIONAL);