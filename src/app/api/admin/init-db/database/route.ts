// src/app/api/admin/init-db/database/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect, initDatabase } from '@/lib/db';
import mongoose from "mongoose";
import {
  DatabaseOperations,
  DatabaseStatusResponseData,
  InitDatabaseOptions,
  InitDatabaseResult,
} from '@/types/api/databaseResponses';

/**
 * POST /api/admin/init-db/database
 * Initialize database with seed data (admin only)
 */
export const POST = withRoleProtection(['admin'])(async (req: NextRequest) => {
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

      // Extract options with defaults
      const options: InitDatabaseOptions = {
        force: false,
        seedData: true,
        collections: [],
        ...(body || {}),
      };

      // Validate options
      if (typeof options.force !== 'boolean') options.force = false;
      if (typeof options.seedData !== 'boolean') options.seedData = true;
      if (!Array.isArray(options.collections)) options.collections = [];

      // Force must be true for destructive operations
      if (!options.force) {
        return apiError(
          'For safety, database initialization requires force=true option',
          400,
          'ERR_FORCE_REQUIRED'
        );
      }

      // Initialize tracking object
      const operations: DatabaseOperations = {
        collections: {
          checked: 0,
          initialized: 0,
          skipped: 0,
          errors: [],
        },
        seedData: {
          totalRecords: 0,
          inserted: 0,
          skipped: 0,
          errors: [],
        },
        newCollections: [],
      };

      // Get existing collections
      let existingCollections: string[] = [];
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        // Filter out null/undefined collection names with a defensive approach
        existingCollections = collections
          .map(c => c.name)
          .filter((name): name is string => name !== null && name !== undefined);
        operations.collections.checked = existingCollections.length;
      } catch (listError) {
        console.error('Error listing collections:', listError);
        operations.collections.errors.push(
          `Failed to list collections: ${
            listError instanceof Error ? listError.message : 'Unknown error'
          }`
        );
      }

      // Track initialization metrics
      const initStartTime = Date.now();
      let initResults: InitDatabaseResult | null = null;

      // Call initialization function
      try {
        initResults = await initDatabase({
          force: options.force,
          seedData: options.seedData,
          collections: options.collections,
        });

        // Update operation metrics
        if (initResults) {
          if (initResults.collections) {
            operations.collections.initialized = initResults.collections.initialized || 0;
            operations.collections.skipped = initResults.collections.skipped || 0;
            if (Array.isArray(initResults.collections.errors)) {
              operations.collections.errors = [
                ...operations.collections.errors,
                ...initResults.collections.errors,
              ].slice(0, 20); // Limit error count
            }
          }

          if (initResults.seedData) {
            operations.seedData.totalRecords = initResults.seedData.total || 0;
            operations.seedData.inserted = initResults.seedData.inserted || 0;
            operations.seedData.skipped = initResults.seedData.skipped || 0;
            if (Array.isArray(initResults.seedData.errors)) {
              operations.seedData.errors = initResults.seedData.errors.slice(0, 20);
            }
          }
        }
      } catch (initError) {
        console.error('Database initialization error:', initError);
        return handleApiError(initError, 'Error initializing database');
      }

      // Get updated collection list
      try {
        const updatedCollections = await mongoose.connection.db.listCollections().toArray();
        const newCollections = updatedCollections
          .map(c => c.name)
          .filter((name): name is string => 
            name !== null && name !== undefined && !existingCollections.includes(name)
          );
        operations.newCollections = newCollections;
      } catch (error) {
        console.error('Error getting updated collections:', error);
        operations.collections.errors.push('Failed to get updated collection list');
      }

      // Calculate duration
      const duration = Date.now() - initStartTime;

      return apiResponse({
        success: true,
        duration: `${(duration / 1000).toFixed(2)}s`,
        operations,
        collections: initResults?.collectionSummary || [],
      }, true, 'Database initialization completed');
    } catch (error) {
      return handleApiError(error, 'Error initializing database');
    }
  });

/**
 * GET /api/admin/init-db/database
 * Get database status and initialization info (admin only)
 */
export const GET = withRoleProtection(['admin'])(async (req: NextRequest) => {
  // handler implementation
  try {
    await dbConnect();

      // Get initialization status
      const status: DatabaseStatusResponseData = {
        connected: mongoose.connection.readyState === 1,
        database: mongoose.connection.name,
        collections: {},
        modelStats: {
          registered: Object.keys(mongoose.models).length,
          models: Object.keys(mongoose.models),
        },
        collectionCount: 0,
      };

      // Get collections
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        status.collectionCount = collections.length;

        for (const collection of collections) {
          try {
            const name = collection.name;
            // Skip collections with no name
            if (!name) continue;
            
            const stats = await mongoose.connection.db.collection(name).stats();
            status.collections[name] = {
              count: stats.count || 0,
              size: stats.size || 0,
              avgObjectSize: stats.avgObjSize || 0,
            };
          } catch (statsError) {
            // Only add to collections if name exists
            if (collection.name) {
              status.collections[collection.name] = { 
                error: statsError instanceof Error ? statsError.message : 'Failed to get stats' 
              };
            }
          }
        }
      } catch (error) {
        console.error('Error getting collection info:', error);
        status.collectionsError = error instanceof Error 
          ? error.message 
          : 'Failed to get collection information';
      }

      return apiResponse(status, true, 'Database status retrieved');
  } catch (error) {
    return handleApiError(error, 'Error getting database status');
  }
});