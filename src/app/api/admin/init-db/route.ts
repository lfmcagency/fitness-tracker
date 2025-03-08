export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect, initDatabase, seedDatabase, clearDatabase, InitDatabaseResult } from '@/lib/db';
import mongoose from "mongoose";

/**
 * Interface for tracking initialization operations
 */
interface InitOperations {
  collections: {
    checked: number;
    initialized: number;
    skipped: number;
    errors: string[];
  };
  seedData: {
    totalRecords: number;
    inserted: number;
    skipped: number;
    errors: string[];
  };
  newCollections?: string[];
}

/**
 * POST /api/admin/init-db/database
 * Initialize database with seed data (admin only)
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
      
      // Extract options with defaults
      const options = {
        force: false,
        seedData: true,
        collections: [] as string[],
        skipConfirmation: false,
        ...(body || {})
      };
      
      // Validate options
      if (typeof options.force !== 'boolean') {
        options.force = false;
      }
      
      if (typeof options.seedData !== 'boolean') {
        options.seedData = true;
      }
      
      if (!Array.isArray(options.collections)) {
        options.collections = [];
      }
      
      // Force must be true for destructive operations
      if (options.force !== true) {
        return apiError(
          'For safety, database initialization requires force=true option', 
          400, 
          'ERR_FORCE_REQUIRED'
        );
      }
      
      // Get action from query params
      const searchParams = req.nextUrl.searchParams;
      const action = searchParams.get('action') || 'init';
      
      // Initialize tracking
      const operations: InitOperations = {
        collections: {
          checked: 0,
          initialized: 0,
          skipped: 0,
          errors: []
        },
        seedData: {
          totalRecords: 0,
          inserted: 0,
          skipped: 0,
          errors: []
        }
      };
      
      // Get existing collections to check what needs to be initialized
      const existingCollections: string[] = [];
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        collections.forEach(c => c.name && existingCollections.push(c.name));
        operations.collections.checked = existingCollections.length;
      } catch (listError) {
        console.error('Error listing collections:', listError);
        operations.collections.errors.push(`Failed to list collections: ${listError instanceof Error ? listError.message : String(listError)}`);
      }
      
      // Track initialization metrics
      const initStartTime = Date.now();
      let initResults: InitDatabaseResult | null = null;
      
      // Call the appropriate database function based on action
      try {
        if (action === 'seed') {
          initResults = await seedDatabase({
            force: options.force,
            collections: options.collections
          });
        } else if (action === 'clear') {
          // Only allow clearing in development
          if (process.env.NODE_ENV !== 'production') {
            initResults = await clearDatabase();
          } else {
            return apiError(
              'Cannot clear database in production',
              403,
              'ERR_PRODUCTION_SAFEGUARD'
            );
          }
        } else {
          // Default to init
          initResults = await initDatabase({
            force: options.force,
            seedData: options.seedData,
            collections: options.collections
          });
        }
        
        // Update operation metrics if initialization returned results
        if (initResults) {
          if (initResults.success) {
            // Update collection metrics
            if (initResults.collections) {
              operations.collections.initialized = initResults.collections.initialized || 0;
              operations.collections.skipped = initResults.collections.skipped || 0;
              
              if (Array.isArray(initResults.collections.errors)) {
                operations.collections.errors = [
                  ...operations.collections.errors,
                  ...initResults.collections.errors
                ].slice(0, 20); // Limit error count
              }
            }
            
            // Update seed data metrics
            if (initResults.seedData) {
              operations.seedData.totalRecords = initResults.seedData.total || 0;
              operations.seedData.inserted = initResults.seedData.inserted || 0;
              operations.seedData.skipped = initResults.seedData.skipped || 0;
              
              if (Array.isArray(initResults.seedData.errors)) {
                operations.seedData.errors = initResults.seedData.errors.slice(0, 20);
              }
            }
            
            // Get list of collections after initialization
            try {
              const updatedCollections = await mongoose.connection.db.listCollections().toArray();
              const newCollections = updatedCollections
                .map(c => c.name || "")
                .filter(name => name && !existingCollections.includes(name));
              
              operations.newCollections = newCollections;
            } catch (error) {
              console.error('Error getting updated collections:', error);
              operations.collections.errors.push('Failed to get updated collection list');
            }
          } else {
            operations.collections.errors.push(initResults.message || 'Initialization failed');
          }
        }
      } catch (initError) {
        console.error(`Database ${action} error:`, initError);
        return handleApiError(initError, `Error during database ${action}`);
      }
      
      // Calculate duration
      const duration = Date.now() - initStartTime;
      
      return apiResponse({
        success: true,
        action,
        duration: `${(duration / 1000).toFixed(2)}s`,
        operations,
        collections: initResults?.collectionSummary || []
      }, true, `Database ${action} operation completed`);
    } catch (error) {
      return handleApiError(error, "Error performing database operation");
    }
  });
};

/**
 * GET /api/admin/init-db/database
 * Get database status and initialization info (admin only)
 */
export const GET = async (req: NextRequest) => {
  return withRoleProtection(['admin'])(req, async () => {
    try {
      await dbConnect();
      
      // Define collection stats type
      interface CollectionStats {
        count?: number;
        size?: number;
        avgObjectSize?: number;
        error?: string;
      }
      
      // Get initialization status
      const status = {
        connected: mongoose.connection.readyState === 1,
        database: mongoose.connection.name || 'unknown',
        collections: {} as Record<string, CollectionStats>,
        modelStats: {
          registered: Object.keys(mongoose.models).length,
          models: Object.keys(mongoose.models)
        },
        collectionCount: 0,
        collectionsError: undefined as string | undefined // Added for error tracking
      };
      
      // Get collections
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        status.collectionCount = collections.length;
        
        for (const collection of collections) {
          try {
            const name = collection.name;
            if (!name) continue;
            
            const stats = await mongoose.connection.db.collection(name).stats();
            status.collections[name] = {
              count: stats.count || 0,
              size: stats.size || 0,
              avgObjectSize: stats.avgObjSize || 0
            };
          } catch (statsError) {
            if (collection.name) {
              status.collections[collection.name] = { error: 'Failed to get stats' };
            }
          }
        }
      } catch (error) {
        console.error('Error getting collection info:', error);
        status.collectionsError = 'Failed to get collection information';
      }
      
      return apiResponse(status, true, 'Database status retrieved');
    } catch (error) {
      return handleApiError(error, "Error getting database status");
    }
  });
};