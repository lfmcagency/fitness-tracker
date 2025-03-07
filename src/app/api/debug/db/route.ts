export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import mongoose from "mongoose";
import { withRoleProtection, AuthLevel, withAuth } from "@/lib/auth-utils";

interface DbStatus {
  connected: boolean;
  readyState: number;
  readyStateText: string;
  host: string | null;
  name: string | null;
  responseTime: number;
  collections: string[] | Record<string, any> | null;
  modelCount: number;
  models: string[] | null;
  collectionStats: Record<string, any> | null;
  error?: string;
}

/**
 * GET /api/debug/db
 * Test database connection with optional collection listing
 */
export const GET = withAuth<ResponseType['data']>(
  async (req: NextRequest, userId: string) => {
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
                  size: Math.round((collStats.size || 0) / 1024) + ' KB',
                  avgObjectSize: Math.round(collStats.avgObjSize || 0) + ' bytes',
                  storageSize: Math.round((collStats.storageSize || 0) / 1024) + ' KB',
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
      
      // Return immediately with error status
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
export const POST = async (req: NextRequest) => {
  return withRoleProtection(['admin'])(req, async () => {
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
      
      if (!validOperations.includes(operation)) {
        return apiError(
          `Invalid operation. Valid operations: ${validOperations.join(', ')}`, 
          400, 
          'ERR_INVALID_OPERATION'
        );
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
      
      return apiResponse(result, result.success, `Database ${operation} operation completed`);
    } catch (error) {
      return handleApiError(error, "Error performing database operation");
    }
  });
};

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}