// src/app/api/debug/health/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import mongoose from "mongoose";
import os from 'os';
import { ApiResponse } from '@/types/api/common';

// Component Health Status
type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';

// Base Component Health
interface ComponentHealth {
  status: HealthStatus;
  message: string;
}

// Database Component Health
interface DatabaseHealth extends ComponentHealth {
  details?: {
    host?: string;
    readyState?: number;
    name?: string;
    error?: string;
  };
}

// Memory Component Health
interface MemoryHealth extends ComponentHealth {
  total: number; // MB
  free: number;  // MB
  usage: number; // Percentage
}

// Environment Component Health
interface EnvironmentHealth extends ComponentHealth {
  nodeVersion: string;
  platform: string;
  arch: string;
  env: string | undefined;
}

// System Health Response Structure
interface SystemHealth {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  responseTime?: number;
  components: {
    server: ComponentHealth;
    database: DatabaseHealth;
    memory: MemoryHealth;
    environment?: EnvironmentHealth;
  };
}

/**
 * GET /api/debug/health
 * System health check endpoint
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<SystemHealth>>> {
  // Track start time for response time calculation
  const startTime = process.hrtime();
  
  try {
    // Component health states
    const health: SystemHealth = {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      components: {
        server: {
          status: 'ok',
          message: 'Next.js server is running'
        },
        database: {
          status: 'unknown',
          message: 'Database check not attempted yet'
        },
        memory: {
          status: 'ok',
          total: Math.round(os.totalmem() / (1024 * 1024)),
          free: Math.round(os.freemem() / (1024 * 1024)),
          usage: Math.round((1 - os.freemem() / os.totalmem()) * 100)
        }
      }
    };
    
    // Check authentication level for detailed info
    const url = new URL(req.url);
    const includeDetails = url.searchParams.get('details') === 'true';
    
    // Check database connection with defensive error handling
    try {
      await dbConnect();
      
      // Get MongoDB connection status
      const mongoStatus = mongoose.connection.readyState;
      
      // Map status code to readable status
      const statusMap: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
        99: 'uninitialized'
      };
      
      const statusText = statusMap[mongoStatus] || 'unknown';
      
      // Set database health status
      health.components.database = {
        status: mongoStatus === 1 ? 'ok' : 'error',
        message: `MongoDB is ${statusText}`
      };
      
      // Add details if requested
      if (includeDetails) {
        health.components.database.details = {
          host: mongoose.connection.host || 'unknown',
          readyState: mongoStatus,
          name: mongoose.connection.name || 'unknown'
        };
      }
      
      // If database is not connected, set overall status to error
      if (mongoStatus !== 1) {
        health.status = 'error';
      }
    } catch (dbError) {
      console.error('Health check database error:', dbError);
      
      health.components.database = {
        status: 'error',
        message: 'Error connecting to database'
      };
      
      if (includeDetails) {
        health.components.database.details = {
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        };
      }
      
      health.status = 'error';
    }
    
    // Check memory usage - warn if over 90%
    if (health.components.memory.usage > 90) {
      health.components.memory.status = 'warning';
      health.status = health.status === 'ok' ? 'warning' : health.status;
    }
    
    // Add environment information if detailed check requested
    if (includeDetails) {
      health.components.environment = {
        status: 'ok',
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
    
    return apiResponse(health, true, `System health is ${health.status}`, httpStatus);
  } catch (error) {
    // Calculate error response time
    const hrtime = process.hrtime(startTime);
    const responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
    
    // Handle unexpected errors
    return handleApiError(error, "Error performing health check");
  }
}