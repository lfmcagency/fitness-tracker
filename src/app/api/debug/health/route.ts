// src/app/api/debug/health/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, handleApiError } from "@/lib/api-utils";
import { dbConnect } from '@/lib/db';
import mongoose from "mongoose";
import * as os from 'os';
import { 
  SystemHealth, 
  HealthStatus, 
  ComponentHealth, 
  DatabaseHealth,
  MemoryHealth,
  EnvironmentHealth,
  HealthCheckResponse
} from "@/types/api/healthResponses";

/**
 * GET /api/debug/health
 * System health check endpoint
 */
export async function GET(req: NextRequest) {
  const startTime = process.hrtime();
  
  try {
    const health: SystemHealth = {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      components: {
        server: { status: 'ok', message: 'Next.js server is running' },
        database: { status: 'unknown', message: 'Database check not attempted yet' },
        memory: {
          status: 'ok',
          message: 'Memory check completed',
          total: Math.round(os.totalmem() / (1024 * 1024)),
          free: Math.round(os.freemem() / (1024 * 1024)),
          usage: Math.round((1 - os.freemem() / os.totalmem()) * 100)
        }
      }
    };
    
    const url = new URL(req.url);
    const includeDetails = url.searchParams.get('details') === 'true';
    
    // Check database connection with defensive error handling
    try {
      await dbConnect();
      const mongoStatus = mongoose.connection.readyState;
      const statusMap: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
        99: 'uninitialized'
      };
      const statusText = statusMap[mongoStatus] || 'unknown';
      
      if (mongoStatus === 1) {
        try {
          // Added list collections query to verify database operability
          const collectionList = await mongoose.connection.db.listCollections().toArray();
          health.components.database.status = 'ok';
          health.components.database.message = 'MongoDB is connected and collections are accessible';
          if (includeDetails) {
            (health.components.database as DatabaseHealth).details = {
              host: mongoose.connection.host || 'unknown',
              readyState: mongoStatus,
              name: mongoose.connection.name || 'unknown',
              collections: collectionList.length,
            };
          }
        } catch (queryError) {
          console.error('Error listing collections:', queryError);
          health.components.database.status = 'error';
          health.components.database.message = 'MongoDB is connected but collections are not accessible';
          if (includeDetails) {
            (health.components.database as DatabaseHealth).details = {
              host: mongoose.connection.host || 'unknown',
              readyState: mongoStatus,
              name: mongoose.connection.name || 'unknown',
              error: queryError instanceof Error ? queryError.message : 'Unknown error',
            };
          }
          health.status = 'error';
        }
      } else {
        health.components.database.status = 'error';
        health.components.database.message = `MongoDB is ${statusText}`;
        if (includeDetails) {
          (health.components.database as DatabaseHealth).details = {
            readyState: mongoStatus,
          };
        }
        health.status = 'error';
      }
    } catch (dbError) {
      console.error('Health check database error:', dbError);
      health.components.database = {
        status: 'error',
        message: 'Error connecting to database'
      };
      if (includeDetails) {
        (health.components.database as DatabaseHealth).details = {
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        };
      }
      health.status = 'error';
    }
    
    // Check memory usage - warn if over 90%
    if (health.components.memory.usage > 90) {
      health.status = health.status === 'ok' ? 'warning' : health.status;
      health.components.memory.status = 'warning';
    }
    
    // Add environment information if detailed check requested
    if (includeDetails) {
      health.components.environment = {
        status: 'ok',
        message: 'Environment information',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV
      };
    }
    
    // Calculate response time
    const hrtime = process.hrtime(startTime);
    const responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
    health.responseTime = responseTimeMs;
    
    // Determine HTTP status code based on health status
    const httpStatus = health.status === 'ok' ? 200 :
                       health.status === 'warning' ? 200 : 503;
    
    return apiResponse<SystemHealth>(health, true, `System health is ${health.status}`, httpStatus);
  } catch (error) {
    // Calculate error response time
    const hrtime = process.hrtime(startTime);
    const responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
    
    // Handle unexpected errors
    return handleApiError(error, "Error performing health check");
  }
}