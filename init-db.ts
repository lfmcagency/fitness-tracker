export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { withRoleProtection } from "@/lib/auth-utils";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import { initDatabase } from '@/lib/db';
import mongoose from "mongoose";

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
      let initResults = null;
      
      // Call initialization function with defensive error handling
      try {
        // Initialize database with options
        initResults = await initDatabase();
        
        // Update operation metrics if initialization returned results
        if (initResults && typeof initResults === 'object') {
          if (initResults.success) {
            operations.collections.initialized += 1;
            
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
        console.error('Database initialization error:', initError);
        return handleApiError(initError, 'Error initializing database');
      }
      
      // Calculate duration
      const duration = Date.now() - initStartTime;
      
      return apiResponse({
        success: true,
        duration: `${(duration / 1000).toFixed(2)}s`,
        operations,
        collections: Array.isArray(initResults?.collections) ? initResults.collections : []
      }, true, 'Database initialization completed');
    } catch (error) {
      return handleApiError(error, "Error initializing database");
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
      
      // Get initialization status
      const status: {
        connected: boolean;
        database: string;
        collections: Record<string, any>;
        modelStats: {
          registered: number;
          models: string[];
        };
        collectionCount: number;
        collectionsError?: string;
      } = {
        connected: mongoose.connection.readyState === 1,
        database: mongoose.connection.name || 'unknown',
        collections: {},
        modelStats: {
          registered: Object.keys(mongoose.models).length,
          models: Object.keys(mongoose.models)
        },
        collectionCount: 0
      };
      
      // Get collections
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        status.collectionCount = collections.length;
        
        // Get stats for important collections
        const collectionStats: Record<string, any> = {};
        
        for (const collection of collections) {
          try {
            const name = collection.name || '';
            if (!name) continue;
            
            const stats = await mongoose.connection.db.collection(name).stats();
            
            collectionStats[name] = {
              count: stats.count || 0,
              size: stats.size || 0,
              avgObjectSize: stats.avgObjSize || 0
            };
          } catch (statsError) {
            if (collection.name) {
              collectionStats[collection.name] = { error: 'Failed to get stats' };
            }
          }
        }
        
        status.collections = collectionStats;
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