// src/app/api/health/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { apiResponse, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';
import mongoose from "mongoose";
import os from 'os';
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
 * GET /api/health
 * System health check endpoint
 */
export async function GET(req: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
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
          message: 'Memory check completed',
          total: Math.round(os.totalmem() / (1024 * 1024)),
          free: Math.round(os.freemem() / (1024 * 1024)),
          usage: Math.round((1 - os.freemem() / os.totalmem()) * 100)
        }
      }
    };
    
    // Check for detailed info request
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
      
      if (includeDetails) {
        (health.components.database as DatabaseHealth).details = {
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
        (health.components.database as DatabaseHealth).details = {
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
        message: 'Environment information',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV || 'development'
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
    
    // Handle unexpected errors - fix the call to handleApiError by removing the extra argument
    return handleApiError(error, "Error performing health check");
  }
}