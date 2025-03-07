// src/app/api/health/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';;
import mongoose from "mongoose";
import os from 'os';

/**
 * GET /api/health
 * Public application health check endpoint
 */
export async function GET(req: NextRequest) {
  // Record start time for response time metrics
  const startTime = process.hrtime();
  
  // Set up base health status
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      status: 'unknown',
      connected: false
    },
    responseTime: 0 // Will be populated before returning
  };
  
  try {
    // Check database connectivity
    let dbConnected = false;
    
    try {
      await dbConnect();
      dbConnected = mongoose.connection.readyState === 1;
      
      health.database = {
        status: dbConnected ? 'ok' : 'error',
        connected: dbConnected,
        readyState: mongoose.connection.readyState
      };
    } catch (dbError) {
      console.error('Health check database error:', dbError);
      health.database = {
        status: 'error',
        connected: false,
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Database connection error'
      };
    }
    
    // Update overall status if any component is not ok
    if (health.database.status !== 'ok') {
      health.status = 'error';
    }
    
    // Check if detailed info requested
    const url = new URL(req.url);
    const detailed = url.searchParams.get('detailed') === 'true';
    
    // Add detailed system info if requested
    if (detailed) {
      // Resource usage
      const memoryUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsagePercent = Math.round((1 - freeMem / totalMem) * 100);
      
      // Add system metrics
      health.system = {
        memory: {
          total: Math.round(totalMem / (1024 * 1024)) + ' MB',
          free: Math.round(freeMem / (1024 * 1024)) + ' MB',
          usage: memoryUsagePercent + '%',
          process: {
            rss: Math.round(memoryUsage.rss / (1024 * 1024)) + ' MB',
            heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)) + ' MB',
            heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)) + ' MB',
          }
        },
        os: {
          platform: process.platform,
          arch: process.arch,
          cpus: os.cpus().length,
          hostname: os.hostname(),
          loadavg: os.loadavg()
        }
      };
      
      // Set memory status based on usage
      if (memoryUsagePercent > 90) {
        health.system.memory.status = 'warning';
        health.status = health.status === 'ok' ? 'warning' : health.status;
      } else {
        health.system.memory.status = 'ok';
      }
      
      // Add database details if connected
      if (health.database.connected) {
        try {
          // Get basic stats
          const modelCount = Object.keys(mongoose.models).length;
          
          health.database.models = modelCount;
          
          // Get collection names (limit to protect from abuse)
          const collections = await mongoose.connection.db.listCollections().toArray();
          health.database.collections = collections.length;
        } catch (dbDetailError) {
          console.error('Error getting database details:', dbDetailError);
          // Continue without details
        }
      }
    }
    
    // Calculate response time
    const hrTime = process.hrtime(startTime);
    const responseTimeMs = Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000);
    health.responseTime = responseTimeMs;
    
    // Determine HTTP status code (200 for ok and warning, 503 for error)
    const httpStatus = health.status === 'error' ? 503 : 200;
    
    return apiResponse(health, health.status !== 'error', health.status, httpStatus);
  } catch (error) {
    // Calculate error response time
    const hrTime = process.hrtime(startTime);
    const responseTimeMs = Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000);
    
    console.error('Health check error:', error);
    
    const errorHealth = {
      status: 'error',
      timestamp: new Date().toISOString(),
      server: {
        status: 'error',
        error: 'Internal server error'
      },
      responseTime: responseTimeMs
    };
    
    return apiResponse(errorHealth, false, 'Health check failed', 500);
  }
}